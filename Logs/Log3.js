// Ensure you have loaded 'pdf-lib' alongside 'pdfjs-dist' in your project
// <script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>

async function savePDF() {
    if (!auth.currentUser) { 
        showNotification('Please login first'); 
        const loginModal = document.getElementById('login-modal'); 
        if (loginModal) loginModal.style.display = 'flex'; 
        return; 
    }
    if (!pdfDoc) { showNotification('No PDF to save'); return; }
    if (!isOnline) { showNotification('No internet connection. Cannot save PDF.', true); return; }

    const hasEdits = Object.values(allPageEdits).some(page => 
        (page.textEdits && page.textEdits.length > 0) || 
        (page.images && page.images.length > 0) || 
        (page.overlays && page.overlays.length > 0)
    );

    if (hasEdits && !isAdmin(auth.currentUser)) {
        const incremented = await incrementEditCount(auth.currentUser);
        if (!incremented) { showNotification('Edit limit reached!', true); return; }
    }

    showLoading(true);

    try {
        // 1. Get original PDF bytes instead of converting to canvas images
        // Assumes 'originalPdfArrayBuffer' stores your raw input file's ArrayBuffer
        if (!window.originalPdfArrayBuffer) {
            throw new Error("Original PDF byte reference missing.");
        }
        
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const modifiedPdfDoc = await PDFDocument.load(window.originalPdfArrayBuffer);
        const pages = modifiedPdfDoc.getPages();
        
        // Load standard fonts for embedding natively
        const robotoFont = await modifiedPdfDoc.embedFont(StandardFonts.Helvetica);
        const robotoBold = await modifiedPdfDoc.embedFont(StandardFonts.HelveticaBold);

        // 2. Loop through user modifications structurally
        for (let i = 1; i <= pageCount; i++) {
            const page = pages[i - 1]; // pdf-lib is 0-indexed
            const pageEdits = allPageEdits[i];
            if (!pageEdits) continue;

            const { width, height } = page.getSize();
            
            // --- NATIVE TEXT EDITS & OPAQUE COVERS ---
            if (pageEdits.textEdits && pageEdits.textEdits.length > 0) {
                // Get viewport tracking scale metrics to map UI coordinates cleanly to points
                const pdfjsPage = await pdfDoc.getPage(i);
                const viewport = pdfjsPage.getViewport({ scale: 1.0 });
                
                // Group items exactly like your framework logic maps them out
                const textContent = await pdfjsPage.getTextContent();
                const allTextItems = [];
                
                textContent.items.forEach((item, index) => {
                    if (item.str && item.str.trim() !== '') {
                        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                        allTextItems.push({
                            text: item.str,
                            x: tx[4],
                            y: tx[5],
                            width: item.width,
                            height: item.height || item.transform[0],
                            fontSize: Math.abs(item.transform[0]),
                            originalIndex: index
                        });
                    }
                });

                const groupedItems = groupTextItemsForSave(allTextItems);

                groupedItems.forEach((groupedItem) => {
                    const edit = pageEdits.textEdits.find(e => e.originalIndex === groupedItem.originalIndex);
                    if (edit) {
                        // Math Check: Translate Canvas coordinates directly to Native PDF Point systems
                        const scaleX = width / viewport.width;
                        const scaleY = height / viewport.height;
                        
                        const nativeX = groupedItem.x * scaleX;
                        // Invert Y axes cleanly: PDF coordinates flow from bottom-up
                        const nativeY = height - (groupedItem.y * scaleY);

                        let bgColor = edit.bgColor;
                        if (!bgColor || bgColor === 'transparent') bgColor = '#ffffff';

                        // Calculate coverage bounding box sizes
                        const targetWidth = Math.max(groupedItem.width, edit.text.length * (edit.fontSize || 12)) * scaleX;
                        const targetHeight = (edit.fontSize || groupedItem.fontSize) * scaleY * 1.2;

                        // Step A: Cover original underlying text with a clean, vector vector block
                        page.drawRectangle({
                            x: nativeX - 2,
                            y: nativeY - 2,
                            width: targetWidth + 4,
                            height: targetHeight,
                            color: hexToPdfRgb(bgColor, rgb)
                        });

                        // Step B: Overprint new editable text element directly over vector layer
                        page.drawText(edit.text, {
                            x: nativeX,
                            y: nativeY,
                            size: (edit.fontSize || groupedItem.fontSize),
                            font: edit.isBold ? robotoBold : robotoFont,
                            color: hexToPdfRgb(edit.color || '#000000', rgb)
                        });
                    }
                });
            }

            // --- NATIVE IMAGE OVERLAYS & SIGNATURES ---
            if (pageEdits.overlays && pageEdits.overlays.length > 0) {
                for (let ov of pageEdits.overlays) {
                    if (!ov || !ov.data) continue;

                    // Calculate point footprint from percentage fractions safely
                    const w = (ov.wFrac || 0.3) * width;
                    const h = (ov.hFrac || 0.2) * height;
                    const x = (ov.xFrac || 0.1) * width;
                    const y = height - ((ov.yFrac || 0.1) * height) - h; // Native Y flip

                    if (ov.type === 'image' || ov.type === 'drawing') {
                        // Embed dynamic PNG or JPEG asset straight to structural stream
                        const isPng = ov.data.includes('image/png');
                        const embeddedImg = isPng 
                            ? await modifiedPdfDoc.embedPng(ov.data)
                            : await modifiedPdfDoc.embedJpeg(ov.data);

                        page.drawImage(embeddedImg, { x, y, width: w, height: h });
                    } else if (ov.type === 'highlight') {
                        // Vector transparent markup
                        page.drawRectangle({
                            x, y, width: w, height: h,
                            color: hexToPdfRgb(ov.color || '#fffb70', rgb),
                            opacity: ov.opacity || 0.45
                        });
                    }
                }
            }
        }

        // 3. Complete structural saving (True Vector Generation)
        const finalizedBytes = await modifiedPdfDoc.save();
        
        // Instant stream distribution download trigger
        const blob = new Blob([finalizedBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'edited-document.pdf';
        link.click();
        URL.revokeObjectURL(downloadUrl);

        // --- ACCOUNT CREDITS ACCOUNTING DIALOG LAYER ---
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

    } catch (error) {
        console.error('Error saving PDF structural units:', error);
        showNotification('Error saving PDF: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Essential helper utility to transform Hex color keys into pdf-lib normalized objects
function hexToPdfRgb(hex, rgbInstance) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgbInstance(r, g, b);
}
