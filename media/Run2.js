let currentRenderTask = null; // Add this at the top with your other variables

async function renderPage(num) {
    if (!auth.currentUser) {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'flex';
        return;
    }

    const jumpPageInput = document.getElementById('jump-page-input');
    if (jumpPageInput) {
        jumpPageInput.value = pageNum;
        jumpPageInput.setAttribute('max', pageCount);
    }
       
    if (!pdfDoc) return;

    // Cancel any ongoing render task
    if (currentRenderTask) {
        try {
            await currentRenderTask.cancel();
            currentRenderTask = null;
        } catch (e) {
            console.log('Previous render cancelled');
        }
    }

    showLoading(true);
    clearTextBoxes();
    clearImageBoxes();
    clearQRCodeBoxes();
    
    try {
        const page = await pdfDoc.getPage(num);
        
        // GET SAVED ROTATION FOR THIS SPECIFIC PAGE
        const pageRotation = (allPageEdits[num] && allPageEdits[num].rotation) || 0;
        
        // TELL PDF.JS TO CALCULATE SIZE BASED ON ROTATION
        const viewport = page.getViewport({ scale: scale, rotation: pageRotation });
        const originalViewport = page.getViewport({ scale: 1.0, rotation: pageRotation });

        currentViewport = viewport;
        originalPageSize = {
            width: originalViewport.width,
            height: originalViewport.height
        };

        if (pdfCanvas) {
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
        }

        if (editCanvas) {
            editCanvas.width = viewport.width;
            editCanvas.height = viewport.height;
        }

        if (canvasWrapper) {
            canvasWrapper.style.width = viewport.width + "px";
            canvasWrapper.style.height = viewport.height + "px";
        }

        // Clear canvases before rendering
        if (pdfCtx) {
            pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
        }
        
        if (editCtx) {
            editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
        }

        const renderContext = {
            canvasContext: pdfCtx,
            viewport: viewport
        };

        // Store the render task
        currentRenderTask = page.render(renderContext);
        await currentRenderTask.promise;
        currentRenderTask = null;

        // Get text content
        const textContent = await page.getTextContent();
        
        // Get operator list for image detection
        const operatorList = await page.getOperatorList();

        const pageEdits = allPageEdits[pageNum] || { textEdits: [], images: [], overlays: [] };
        const newTextItems = [];
        const newImageItems = [];

        // ==========================================
        // PROCESS TEXT ITEMS
        // ==========================================
        if (textContent && textContent.items) {
            const allTextItems = [];

            textContent.items.forEach((item) => {
                if (!item.str || item.str.trim() === "") return;

                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                const txOriginal = pdfjsLib.Util.transform(originalViewport.transform, item.transform);
                const text = item.str.trim();

                const match = text.match(/^(.+?)\s+([0-9]+(?:\.[0-9]+)?)$/);

                if (match) {
                    const leftText = match[1];
                    const rightText = match[2];
                    const totalWidth = item.width * scale;
                    const leftWidth = totalWidth * 0.75;
                    const rightWidth = totalWidth * 0.25;

                    allTextItems.push({
                        text: leftText,
                        x: tx[4],
                        y: tx[5],
                        width: leftWidth,
                        height: item.height * scale,
                        originalFontSize: item.height || 12,
                        pdfX: txOriginal[4],
                        pdfY: txOriginal[5],
                        pdfWidth: item.width * 0.75,
                        pdfHeight: item.height
                    });

                    allTextItems.push({
                        text: rightText,
                        x: tx[4] + leftWidth,
                        y: tx[5],
                        width: rightWidth,
                        height: item.height * scale,
                        originalFontSize: item.height || 12,
                        pdfX: txOriginal[4] + item.width * 0.75,
                        pdfY: txOriginal[5],
                        pdfWidth: item.width * 0.25,
                        pdfHeight: item.height
                    });
                } else {
                    allTextItems.push({
                        text: text,
                        x: tx[4],
                        y: tx[5],
                        width: item.width * scale,
                        height: item.height * scale,
                        originalFontSize: item.height || 12,
                        pdfX: txOriginal[4],
                        pdfY: txOriginal[5],
                        pdfWidth: item.width,
                        pdfHeight: item.height
                    });
                }
            });

            allTextItems.forEach((item, index) => {
                const existingEdit = pageEdits.textEdits.find(edit => edit.originalIndex === index);
                const fontSize = existingEdit ? existingEdit.fontSize : item.originalFontSize;

                newTextItems.push({
                    text: existingEdit ? existingEdit.text : item.text,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    originalIndex: index,
                    edited: !!existingEdit,
                    fontSize: fontSize,
                    color: existingEdit?.color || "#000000",
                    bgColor: existingEdit?.bgColor || "#ffffff",
                    fontFamily: existingEdit?.fontFamily || "Roboto",
                    fontWeight: existingEdit?.fontWeight || "400",
                    isBold: existingEdit?.isBold || false,
                    isThin: existingEdit?.isThin || false,
                    boldThickness: existingEdit?.boldThickness || 1.0,
                    yAdjust: existingEdit?.yAdjust || 0,
                    xAdjust: existingEdit?.xAdjust || 0,
                    coverHeight: existingEdit?.coverHeight || 0,
                    coverY: existingEdit?.coverY || 0,
                    pdfX: item.pdfX,
                    pdfY: item.pdfY,
                    pdfWidth: item.pdfWidth,
                    pdfHeight: item.pdfHeight
                });
            });
        }

        // ==========================================
        // PROCESS IMAGE ITEMS (STABLE VERSION)
        // ==========================================
        let imageIndex = 0;
        let currentTransform = [1, 0, 0, 1, 0, 0];

        if (operatorList && operatorList.fnArray) {

            for (let i = 0; i < operatorList.fnArray.length; i++) {

                const fn = operatorList.fnArray[i];
                const args = operatorList.argsArray[i];

                // Store latest transform matrix
                if (fn === pdfjsLib.OPS.transform) {
                    currentTransform = args;
                }

                // Detect image draw operations
                if (
                    fn === pdfjsLib.OPS.paintImageXObject ||
                    fn === pdfjsLib.OPS.paintJpegXObject
                ) {

                    const [a, b, c, d, e, f] = currentTransform;

                    let imageWidth = Math.abs(a) * scale;
                    let imageHeight = Math.abs(d) * scale;

                    const x = e * scale;
                    const y = currentViewport.height - (f * scale) - imageHeight;

                    // Ignore huge banner/header images
                    if (
                        imageWidth > viewport.width * 0.6 ||
                        imageHeight > viewport.height * 0.35
                    ) {
                        continue;
                    }

                    // Check if image already edited
                    const existingEdit = pageEdits.images?.find(
                        edit => edit.index === imageIndex
                    );

                    newImageItems.push({
                        index: imageIndex,

                        x: x,
                        y: y,
                        width: imageWidth,
                        height: imageHeight,

                        edited: !!existingEdit,
                        newImageData: existingEdit ? existingEdit.data : null,

                        transform: currentTransform,

                        pdfX: e,
                        pdfY: f,
                        pdfWidth: Math.abs(a),
                        pdfHeight: Math.abs(d)
                    });

                    imageIndex++;
                }
            }
        }
        
        textItems = newTextItems;
        imageItems = newImageItems;

        createTextBoxes();
        createImageBoxes();
        loadQRCodeBoxes();
        createOverlayBoxes();
        redrawEditedContent();

    } catch (error) {
        // Only log non-cancellation errors
        if (error.name !== 'RenderingCancelledException') {
            console.error('Render error:', error);
            showNotification('Error rendering page: ' + error.message, 'error');
        }
        // Don't show error for cancelled renders
    } finally {
        showLoading(false);
        updatePageInfo();
        updateZoomLevel();
        currentRenderTask = null;
    }
}