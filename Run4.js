
// ==========================================
// CREATE IMAGE BOXES FOR REPLACEMENT
// ==========================================
function createImageBoxes() {
    if (!pdfPage || !canvasWrapper) return;
    
    const pdfPageRect = pdfPage.getBoundingClientRect();
    const canvasRect = canvasWrapper.getBoundingClientRect();

    imageItems.forEach((item) => {
        const imageBox = document.createElement('div');
        imageBox.className = 'image-box';
        if (item.edited) imageBox.classList.add('edited');
        imageBox.title = "Click to replace image";
        imageBox.dataset.index = item.index;
        
        const left = (canvasRect.left - pdfPageRect.left) + item.x;
        const top = (canvasRect.top - pdfPageRect.top) + item.y;
        
        imageBox.style.left = left + 'px';
        imageBox.style.top = top + 'px';
        imageBox.style.width = item.width + 'px';
        imageBox.style.height = item.height + 'px';
        
        // Add icon overlay
        const icon = document.createElement('div');
        icon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(37, 99, 235, 0.9);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        `;
        icon.innerHTML = '<i class="fas fa-image"></i>';
        imageBox.appendChild(icon);
        
        imageBox.addEventListener('mouseenter', () => {
            icon.style.opacity = '1';
        });
        
        imageBox.addEventListener('mouseleave', () => {
            icon.style.opacity = '0';
        });
        
        imageBox.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            replaceImage(item, imageBox); 
        });
        
        pdfPage.appendChild(imageBox);
        imageBoxes.push(imageBox);
    });
}

// ==========================================
// REPLACE IMAGE FUNCTION
// ==========================================
function replaceImage(imageItem, imageBoxElement) {
    currentEditingImageItem = { ...imageItem, box: imageBoxElement };
    
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            const itemIndex = imageItem.index;

            // Update master state
            if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
            if (!allPageEdits[pageNum].images) allPageEdits[pageNum].images = [];
            
            const pageEdits = allPageEdits[pageNum];
            const existingImageEdit = pageEdits.images.find(edit => edit.index === itemIndex);

            if (existingImageEdit) {
                existingImageEdit.data = imageData;
            } else {
                pageEdits.images.push({
                    index: itemIndex,
                    data: imageData,
                    pdfX: imageItem.pdfX,
                    pdfY: imageItem.pdfY,
                    pdfWidth: imageItem.pdfWidth,
                    pdfHeight: imageItem.pdfHeight
                });
            }

            // Update derived state
            const imgItem = imageItems.find(item => item.index === itemIndex);
            if (imgItem) {
                imgItem.edited = true;
                imgItem.newImageData = imageData;
            }

            // Redraw UI
            redrawEditedContent();
            
            if (imageBoxElement) {
                imageBoxElement.classList.add('edited');
            }
            
            showNotification('Image replaced successfully!');
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

// ==========================================
// HANDLE IMAGE SELECTION (ALTERNATIVE METHOD)
// ==========================================
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    // If we're adding a new image overlay
    if (pendingAddNewImage) {
        pendingAddNewImage = false;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            
            if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
            const pageEdits = allPageEdits[pageNum];
            if (!pageEdits.overlays) pageEdits.overlays = [];
            
            pageEdits.overlays.push({
                type: 'image',
                data: imageData,
                xFrac: 0.2,
                yFrac: 0.2,
                wFrac: 0.5,
                hFrac: 0.3
            });
            
            createOverlayBoxes();
            showNotification('Image added!');
        };
        reader.readAsDataURL(file);
        
        if (imageInput) imageInput.value = '';
        return;
    }

    // If we're replacing an existing image
    if (!currentEditingImageItem) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        const itemIndex = currentEditingImageItem.index;

        // Update master state
        if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
        if (!allPageEdits[pageNum].images) allPageEdits[pageNum].images = [];
        
        const pageEdits = allPageEdits[pageNum];
        const existingImageEdit = pageEdits.images.find(edit => edit.index === itemIndex);

        if (existingImageEdit) {
            existingImageEdit.data = imageData;
        } else {
            pageEdits.images.push({
                index: itemIndex,
                data: imageData,
                pdfX: currentEditingImageItem.pdfX,
                pdfY: currentEditingImageItem.pdfY,
                pdfWidth: currentEditingImageItem.pdfWidth,
                pdfHeight: currentEditingImageItem.pdfHeight
            });
        }

        // Update derived state
        const imageItem = imageItems.find(item => item.index === itemIndex);
        if (imageItem) {
            imageItem.edited = true;
            imageItem.newImageData = imageData;
        }

        // Redraw UI
        redrawEditedContent();
        
        if (currentEditingImageItem.box) {
            currentEditingImageItem.box.classList.add('edited');
        }
        
        showNotification('Image replaced and saved.');
    };
    reader.readAsDataURL(file);
    
    if (imageInput) imageInput.value = '';
}
// ==========================================
// CLEAR IMAGE BOXES (FULL RESET)
// ==========================================
function clearImageBoxes() {

    // Remove all box elements safely
    imageBoxes.forEach(box => {
        if (box && box.parentNode) {
            box.parentNode.removeChild(box);
        }
    });

    // Reset array
    imageBoxes.length = 0;

    // Clear stored image edits
    for (let page in allPageEdits) {
        if (allPageEdits[page] && allPageEdits[page].images) {
            allPageEdits[page].images = [];
        }
    }

}
