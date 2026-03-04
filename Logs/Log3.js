async function savePDF() {
    if (!auth.currentUser) { showNotification('Please login first'); const loginModal = document.getElementById('login-modal'); if (loginModal) loginModal.style.display = 'flex'; return; }
    if (!pdfDoc) { showNotification('No PDF to save'); return; }
    if (!isOnline) { showNotification('No internet connection. Cannot save PDF.', true); return; }
    const hasEdits = Object.values(allPageEdits).some(page => (page.textEdits && page.textEdits.length > 0) || (page.images && page.images.length > 0) || (page.overlays && page.overlays.length > 0));
    if (hasEdits && !isAdmin(auth.currentUser)) {
        const incremented = await incrementEditCount(auth.currentUser);
        if (!incremented) { showNotification('Edit limit reached!', true); return; }
    }
    showLoading(true);
    try {
        const quality = qualitySelect ? qualitySelect.value : 'HD';
        let outputScale = 5.0;
        switch (quality) { case 'standard': outputScale = 1.5; break; case 'high': outputScale = 2.0; break; case 'ultra': outputScale = 3.0; break; case 'HD': outputScale = 5.0; break; case 'pc': outputScale = 8.0; break; case 'ultraHD': outputScale = 10.0; break; }
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        const pageImages = [];
        
        async function renderAllPages() {
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: outputScale });
                tempCanvas.width = viewport.width;
                tempCanvas.height = viewport.height;
                const renderContext = { canvasContext: tempCtx, viewport: viewport, intent: 'print' };
                await page.render(renderContext).promise;
                const pageEdits = allPageEdits[i] || { textEdits: [], images: [] };
                const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
                if (textContent && textContent.items && pageEdits.textEdits.length > 0) {
                    const allTextItems = [];
                    textContent.items.forEach((item, index) => {
                        if (item.str && item.str.trim() !== '') {
                            const transform = item.transform;
                            const tx = pdfjsLib.Util.transform(viewport.transform, transform);
                            allTextItems.push({ text: item.str, x: tx[4], y: tx[5], width: item.width * outputScale, height: (item.height || transform[0]) * outputScale, fontSize: Math.abs(transform[0]) * outputScale, originalIndex: index });
                        }
                    });
                    const groupedItems = groupTextItemsForSave(allTextItems);
                    groupedItems.forEach((groupedItem, groupIndex) => {
                        const edit = pageEdits.textEdits.find(e => e.originalIndex === groupIndex);
                        if (edit) {
                            let fontWeight = edit.isThin ? '300' : (edit.isBold ? '700' : '400');
                            let renderFontSize = edit.fontSize ? (edit.fontSize / scale) * outputScale : groupedItem.fontSize;
                            tempCtx.font = `${fontWeight} ${renderFontSize}px ${edit.fontFamily || 'Roboto'}`;
                            const baselineY = groupedItem.y;
                            const metrics = tempCtx.measureText(edit.text);
                            const ascent = metrics.actualBoundingBoxAscent || renderFontSize * 0.9;
                            const descent = metrics.actualBoundingBoxDescent || renderFontSize * 0.2;
                            const trueTopY = baselineY - ascent;
                            const trueHeight = ascent + descent;
                            const trueWidth = Math.max(groupedItem.width, metrics.width);
                            let bgColor = edit.bgColor;
                            if (!bgColor || bgColor === 'transparent') bgColor = '#ffffff';
                            tempCtx.fillStyle = bgColor;
                            const heightScale = renderFontSize / 50;
                            const yScale = renderFontSize / 50;
                            const coverExtra = (edit.coverHeight || 0) * heightScale;
                            const coverYShift = (edit.coverY || 0) * yScale;
                            tempCtx.fillRect(groupedItem.x - 2, trueTopY - 2 - coverExtra + coverYShift, trueWidth + 4, trueHeight + 4 + (coverExtra * 2));
                            tempCtx.fillStyle = edit.color || '#000000';
                            tempCtx.textBaseline = 'alphabetic';
                            const yCorrection = (edit.yAdjust || 0) * (renderFontSize / 100);
                            const thickness = edit.boldThickness || 1.0;
                            if (thickness > 1.0 && edit.isBold) {
                                tempCtx.lineWidth = thickness * (renderFontSize / 100);
                                tempCtx.strokeStyle = edit.color || '#000000';
                                tempCtx.strokeText(edit.text, groupedItem.x, baselineY - yCorrection);
                                tempCtx.fillText(edit.text, groupedItem.x, baselineY - yCorrection);
                            } else if (thickness < 1.0 && edit.isThin) {
                                tempCtx.font = `300 ${renderFontSize}px ${edit.fontFamily || 'Roboto'}`;
                                tempCtx.fillText(edit.text, groupedItem.x, baselineY - yCorrection);
                            } else {
                                tempCtx.fillText(edit.text, groupedItem.x, baselineY - yCorrection);
                            }
                        }
                    });
                }
                if (pageEdits.images && pageEdits.images.length > 0) {
                    const operatorList = await page.getOperatorList();
                    let imageIndex = 0;
                    for (let j = 0; j < operatorList.fnArray.length; j++) {
                        if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
                            const imageEdit = pageEdits.images.find(edit => edit.index === imageIndex);
                            if (imageEdit && imageEdit.data) {
                                for (let k = j - 1; k >= 0; k--) {
                                    if (operatorList.fnArray[k] === pdfjsLib.OPS.transform) {
                                        const transform = operatorList.argsArray[k];
                                        const [a, b, c, d, e, f] = transform;
                                        const imgWidth = Math.sqrt(a * a + b * b) * outputScale;
                                        const imgHeight = Math.sqrt(c * c + d * d) * outputScale;
                                        const x = e * outputScale;
                                        const y = viewport.height - (f * outputScale) - imgHeight;
                                        const img = new Image();
                                        img.src = imageEdit.data;
                                        await new Promise(resolve => { img.onload = () => { tempCtx.drawImage(img, x, y, imgWidth, imgHeight); resolve(); }; });
                                        break;
                                    }
                                }
                            }
                            imageIndex++;
                        }
                    }
                }

                // Draw overlays (highlights, text boxes, etc.)
                if (pageEdits.overlays && pageEdits.overlays.length > 0) {
                    for (let ov of pageEdits.overlays) {
                        if (!ov) continue;
                        try {
                            const w = (ov.wFrac || 0.3) * viewport.width;
                            const h = (ov.hFrac || 0.2) * viewport.height;
                            const x = (ov.xFrac || 0.1) * viewport.width;
                            const y = (ov.yFrac || 0.1) * viewport.height;

                            if (ov.type === 'image' || ov.type === 'drawing') {
                                if (!ov.data) continue;
                                const img = new Image(); img.src = ov.data;
                                await new Promise(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); });
                                tempCtx.drawImage(img, x, y, w, h);
                            } else if (ov.type === 'text') {
                                const fontFamily = ov.fontFamily || 'Roboto';
                                const fontWeight = ov.fontWeight || '400';
                                const renderSize = ov.fontSize || 16;
                                tempCtx.save();
                                tempCtx.fillStyle = ov.color || '#000000';
                                tempCtx.textBaseline = 'top';
                                tempCtx.font = `${fontWeight} ${renderSize}px ${fontFamily}`;
                                tempCtx.fillText(ov.text || '', x, y);
                                tempCtx.restore();
                            } else if (ov.type === 'highlight') {
                                tempCtx.save();
                                tempCtx.globalAlpha = (ov.opacity !== undefined) ? ov.opacity : 0.45;
                                tempCtx.fillStyle = ov.color || '#fffb70';
                                tempCtx.fillRect(x, y, w, h);
                                tempCtx.restore();
                            }
                        } catch (e) { console.error("Overlay render error", e); }
                    }
                }
                
                addWatermarkToCanvas(tempCtx, viewport.width, viewport.height);
                const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
                pageImages.push(imgData);
            }
            const { jsPDF } = window.jspdf;
            const firstPage = await pdfDoc.getPage(1);
            const firstViewport = firstPage.getViewport({ scale: 1.0 });
            const pdfWidth = firstViewport.width * 0.352778;
            const pdfHeight = firstViewport.height * 0.352778;
            const pdf = new jsPDF({ orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight], compress: true });
            for (let i = 0; i < pageImages.length; i++) {
                if (i > 0) pdf.addPage([pdfWidth, pdfHeight]);
                pdf.addImage(pageImages[i], 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }
            pdf.save('edited-document.pdf');
            const user = auth.currentUser;
            if (!isAdmin(user)) {
                const userRef = database.ref('users/' + user.uid);
                const snapshot = await userRef.once('value');
                const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };
                const remaining = userData.maxEdits - userData.editCount;
                if (remaining > 0) {
                    showProfessionalDialog({ type: 'success', title: 'PDF Saved!', message: `PDF saved successfully!\n\nYou have ${remaining} edits remaining.`, showProgress: true, progressValue: userData.editCount, progressMax: userData.maxEdits, showBuyButton: false });
                } else {
                    showProfessionalDialog({ type: 'warning', title: 'PDF Saved - Limit Reached', message: `PDF saved!\n\nYou have used all ${userData.maxEdits} edits. Buy more to continue!`, showProgress: true, progressValue: userData.maxEdits, progressMax: userData.maxEdits, showBuyButton: true });
                }
            } else {
                showProfessionalDialog({ type: 'success', title: 'PDF Saved!', message: 'PDF saved successfully with admin privileges!', showBuyButton: false });
            }
        }
        await renderAllPages();
    } catch (error) {
        console.error('Error saving PDF:', error);
        showNotification('Error saving PDF: ' + error.message);
    } finally {
        showLoading(false);
    }
}