function renderPage(num) {
    if (!auth.currentUser) { const loginModal = document.getElementById('login-modal'); if (loginModal) loginModal.style.display = 'flex'; return; }
    if (!pdfDoc) return;
    
    showLoading(true);
    clearTextBoxes();
    clearImageBoxes();
    
    pdfDoc.getPage(num).then(page => {
        currentViewport = page.getViewport({ scale: scale });
        const originalViewport = page.getViewport({ scale: 1.0 });
        originalPageSize = { width: originalViewport.width, height: originalViewport.height };
        if (pdfCanvas) { pdfCanvas.width = currentViewport.width; pdfCanvas.height = currentViewport.height; }
        if (editCanvas) { editCanvas.width = currentViewport.width; editCanvas.height = currentViewport.height; }
        if (canvasWrapper) { canvasWrapper.style.width = currentViewport.width + 'px'; canvasWrapper.style.height = currentViewport.height + 'px'; }
        const renderContext = { canvasContext: pdfCtx, viewport: currentViewport };
        return page.render(renderContext).promise;
    }).then(() => {
        return pdfDoc.getPage(pageNum).then(page => page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }));
    }).then(textContent => {
        const pageEdits = allPageEdits[pageNum] || { textEdits: [], images: [] };
        const newTextItems = [];
        if (textContent && textContent.items) {
            const allTextItems = [];
            textContent.items.forEach((item, index) => {
                if (item.str && item.str.trim() !== '') {
                    const transform = item.transform;
                    const tx = pdfjsLib.Util.transform(currentViewport.transform, transform);
                    allTextItems.push({
                        text: item.str, x: tx[4], y: tx[5], width: item.width * scale, height: (item.height || 12) * scale,
                        fontSize: (item.height || 12) * scale, originalIndex: index, item: item
                    });
                }
            });
            const groupedTextItems = groupTextItems(allTextItems);
            groupedTextItems.forEach((item, index) => {
                const itemKey = `${pageNum}_${index}`;
                if (!originalTextStyles[itemKey]) originalTextStyles[itemKey] = extractTextStyles(item.item);
                const existingEdit = pageEdits.textEdits.find(edit => edit.originalIndex === index);
                const finalStyles = existingEdit ? {
                    color: existingEdit.color || originalTextStyles[itemKey].color, bgColor: existingEdit.bgColor || '#ffffff',
                    fontFamily: existingEdit.fontFamily || originalTextStyles[itemKey].fontFamily, fontWeight: existingEdit.fontWeight || originalTextStyles[itemKey].fontWeight,
                    isBold: existingEdit.isBold !== undefined ? existingEdit.isBold : originalTextStyles[itemKey].isBold,
                    isThin: existingEdit.isThin !== undefined ? existingEdit.isThin : originalTextStyles[itemKey].isThin,
                    fontSize: existingEdit.fontSize || item.fontSize, boldThickness: existingEdit.boldThickness !== undefined ? existingEdit.boldThickness : 1.0,
                    yAdjust: existingEdit.yAdjust || 0, coverHeight: existingEdit.coverHeight || 0, coverY: existingEdit.coverY || 0
                } : { ...originalTextStyles[itemKey], bgColor: '#ffffff', fontSize: item.fontSize, boldThickness: 1.0, yAdjust: 0, coverHeight: 0, coverY: 0 };
                newTextItems.push({
                    text: existingEdit ? existingEdit.text : item.text, x: item.x, y: item.y, width: item.width, height: item.height,
                    fontSize: finalStyles.fontSize, originalIndex: index, edited: !!existingEdit, color: finalStyles.color, bgColor: finalStyles.bgColor,
                    fontFamily: finalStyles.fontFamily, fontWeight: finalStyles.fontWeight, isBold: finalStyles.isBold, isThin: finalStyles.isThin,
                    boldThickness: finalStyles.boldThickness, originalIndices: item.originalIndices || [index], yAdjust: finalStyles.yAdjust,
                    coverHeight: finalStyles.coverHeight, coverY: finalStyles.coverY
                });
            });
        }
        textItems = newTextItems;
        createTextBoxes();
        return pdfDoc.getPage(pageNum).then(page => page.getOperatorList());
    }).then(operatorList => {
        const pageEdits = allPageEdits[pageNum] || { textEdits: [], images: [] };
        const newImageItems = [];
        let imageIndex = 0;
        if (operatorList && operatorList.fnArray) {
            for (let i = 0; i < operatorList.fnArray.length; i++) {
                if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
                    for (let j = i - 1; j >= 0; j--) {
                        if (operatorList.fnArray[j] === pdfjsLib.OPS.transform) {
                            const transform = operatorList.argsArray[j];
                            const [a, b, c, d, e, f] = transform;
                            const imageWidth = Math.sqrt(a * a + b * b) * scale;
                            const imageHeight = Math.sqrt(c * c + d * d) * scale;
                            const x = e * scale;
                            const y = (currentViewport.height - f * scale - imageHeight);
                            const existingEdit = pageEdits.images.find(edit => edit.index === imageIndex);
                            newImageItems.push({ index: imageIndex, x: x, y: y, width: imageWidth, height: imageHeight, edited: !!existingEdit, newImageData: existingEdit ? existingEdit.data : null });
                            imageIndex++;
                            break;
                        }
                    }
                }
            }
        }
        imageItems = newImageItems;
        createImageBoxes();
        createOverlayBoxes();
        redrawEditedContent();
        showLoading(false);
    }).catch(error => {
        console.error('Error rendering page:', error);
        showNotification('Error rendering page: ' + error.message);
        showLoading(false);
    });
    updatePageInfo();
    updateZoomLevel();
}

function groupTextItems(allTextItems) {
    const groupedItems = [];
    const processed = new Set();
    for (let i = 0; i < allTextItems.length; i++) {
        if (processed.has(i)) continue;
        const currentItem = allTextItems[i];
        let groupItem = { ...currentItem, originalIndices: [i] };
        if (i < allTextItems.length - 1) {
            const nextItem = allTextItems[i + 1];
            const xDistance = Math.abs(nextItem.x - (currentItem.x + currentItem.width));
            const yDistance = Math.abs(nextItem.y - currentItem.y);
            if (xDistance < 20 && yDistance < 5) {
                groupItem.text += nextItem.text;
                groupItem.width = nextItem.x + nextItem.width - currentItem.x;
                groupItem.originalIndices.push(i + 1);
                processed.add(i + 1);
            }
        }
        groupedItems.push(groupItem);
        processed.add(i);
    }
    return groupedItems;
}

function groupTextItemsForSave(allTextItems) {
    const groupedItems = [];
    const processed = new Set();
    for (let i = 0; i < allTextItems.length; i++) {
        if (processed.has(i)) continue;
        const currentItem = allTextItems[i];
        let groupItem = { ...currentItem, originalIndices: [i] };
        if (i < allTextItems.length - 1) {
            const nextItem = allTextItems[i + 1];
            const xDistance = Math.abs(nextItem.x - (currentItem.x + currentItem.width));
            const yDistance = Math.abs(nextItem.y - currentItem.y);
            if (xDistance < 15 && yDistance < 5) {
                groupItem.text += nextItem.text;
                groupItem.width = nextItem.x + nextItem.width - currentItem.x;
                groupItem.originalIndices.push(i + 1);
                processed.add(i + 1);
            }
        }
        groupedItems.push(groupItem);
        processed.add(i);
    }
    return groupedItems;
}
