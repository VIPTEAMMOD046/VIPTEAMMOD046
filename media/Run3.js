async function saveDialogText() {
    if (dialogInput && dialogInput.value.trim() && currentEditingTextItem) {
        if (!currentEditingTextItem.edited && auth.currentUser && !isAdmin(auth.currentUser)) {
            const incremented = await incrementEditCount(auth.currentUser);
            if (!incremented) { 
                showNotification('Edit limit reached!', true); 
                closeDialog(); 
                return; 
            }
        }
        
        currentEditingTextItem.text = dialogInput.value;
        if (textColorInput) currentEditingTextItem.color = textColorInput.value;
        currentEditingTextItem.bgColor = isBgTransparent ? 'transparent' : currentBgColor;
        currentEditingTextItem.fontFamily = currentFontFamily;
        currentEditingTextItem.fontSize = currentFontSize;
        currentEditingTextItem.isBold = currentTextBold;
        currentEditingTextItem.isThin = currentTextThin;
        currentEditingTextItem.boldThickness = currentBoldThickness;
        currentEditingTextItem.yAdjust = currentYAdjust;
        // ★★★ FIXED: Use currentXMove instead of currentXAdjust ★★★
        currentEditingTextItem.xAdjust = currentXMove;  // ← Use currentXMove
        currentEditingTextItem.coverHeight = currentCoverHeight;
        currentEditingTextItem.coverY = currentCoverY;
        currentEditingTextItem.fontWeight = currentTextBold ? '700' : (currentTextThin ? '300' : '400');
        currentEditingTextItem.edited = true;
        
        updateTextItem(currentEditingTextItem);
        previewChanges();
        redrawEditedContent();
        if (currentEditingTextBox) currentEditingTextBox.classList.add('edited');
        showNotification('Text updated successfully');
        saveToHistory();
    }
    closeDialog();
}
function updateTextItem(textItem) {
    if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [] };
    const pageEditList = allPageEdits[pageNum].textEdits;
    const editIndex = pageEditList.findIndex(edit => edit.originalIndex === textItem.originalIndex);
    
    const editData = {
        originalIndex: textItem.originalIndex,
        originalText: textItem.originalText || textItem.text,
        text: textItem.text,
        color: textItem.color,
        bgColor: textItem.bgColor,
        fontFamily: textItem.fontFamily,
        fontWeight: textItem.fontWeight,
        isBold: textItem.isBold,
        isThin: textItem.isThin,
        boldThickness: textItem.boldThickness,
        fontSize: textItem.fontSize,
        yAdjust: textItem.yAdjust,
        xAdjust: textItem.xAdjust,  // ← This is correct
        coverHeight: textItem.coverHeight,
        coverY: textItem.coverY,
        pdfX: textItem.pdfX,
        pdfY: textItem.pdfY,
        pdfWidth: textItem.pdfWidth,
        pdfHeight: textItem.pdfHeight
    };
    
    if (editIndex > -1) pageEditList[editIndex] = editData;
    else pageEditList.push(editData);
    
    const textBox = textBoxes.find(box => box && parseInt(box.dataset.index) === textItem.originalIndex);
    if (textBox) { 
        textBox.classList.add('edited'); 
        textBox.title = textItem.text; 
    }
    updateTextBoxes();
    redrawEditedContent();
}



function closeDialog() {
    if (editDialog) editDialog.style.display = 'none';
    currentEditingTextItem = null;
    currentEditingTextBox = null;
    currentEditingOverlay = null;
    redrawEditedContent();
}
