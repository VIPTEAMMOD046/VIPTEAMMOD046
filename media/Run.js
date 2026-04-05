
async function savePDF() {
    console.log("%c========== SAVE PDF DEBUG START ==========", "background: #222; color: #bada55; font-size: 16px");
    console.log("Timestamp:", new Date().toISOString());
 

 if (auth.currentUser && !isAdmin(auth.currentUser)) {
            const incremented = await incrementEditCount(auth.currentUser);
            if (!incremented) { 
                showNotification('Edit limit reached!', true); 
                closeDialog(); 
                return; 
            }
        }

   try {
        if (!pdfDoc) {
            showNotification("PDF not loaded", true);
            return;
        }

        console.log("✅ PDF loaded successfully");
        console.log("PDF pages:", pageCount);
        console.log("Current page:", pageNum);
// Call this after PDF is loaded
initHistory();
        // Load PDF into PDFLib
        console.log("\n📥 Loading PDF into PDFLib...");
        const pdfBytes = await pdfDoc.getData();
        console.log(`PDF size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
        
        const pdfDocLib = await PDFLib.PDFDocument.load(pdfBytes);
        console.log("✅ PDFLib document created");
        
        if (typeof fontkit !== 'undefined') {
            pdfDocLib.registerFontkit(fontkit);
            console.log("✅ Fontkit registered");
        }
        
        const pages = pdfDocLib.getPages();
        console.log(`📄 PDFLib pages: ${pages.length}`);

   let totalRedactions = 0;
        let totalTextEdits = 0;
        let totalImageEdits = 0;

        // ==========================================
        // EMBED STANDARD FONTS
        // ==========================================
        console.log("\n🔤 Embedding standard fonts...");
        const helvetica = await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica);
        const helveticaBold = await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const helveticaOblique = await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaOblique);
        const timesRoman = await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRoman);
        const timesBold = await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRomanBold);
        const timesItalic = await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRomanItalic);
        const courier = await pdfDocLib.embedFont(PDFLib.StandardFonts.Courier);
        const courierBold = await pdfDocLib.embedFont(PDFLib.StandardFonts.CourierBold);
        const courierOblique = await pdfDocLib.embedFont(PDFLib.StandardFonts.CourierOblique);
        console.log("✅ Standard fonts embedded");

        // ==========================================
        // LOAD CUSTOM FONTS FROM localStorage
        // ==========================================
        console.log("\n📂 Loading custom fonts from localStorage...");
        const customFonts = [];
        try {
            const saved = localStorage.getItem('customFonts');
            if (saved) {
                const fonts = JSON.parse(saved);
                console.log(`Found ${fonts.length} custom fonts in storage`);
                
                for (let i = 0; i < fonts.length; i++) {
                    const font = fonts[i];
                    try {
                        console.log(`  Processing font ${i+1}: ${font.name}`);
                        const base64Data = font.data.split(",")[1];
                        const fontBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                        const embeddedFont = await pdfDocLib.embedFont(fontBytes);
                        customFonts.push({
                            name: font.name,
                            font: embeddedFont
                        });
                        console.log(`  ✅ Loaded custom font: ${font.name}`);
                    } catch (fontErr) {
                        console.error(`  ❌ Error loading font ${font.name}:`, fontErr);
                    }
                }
            } else {
                console.log("No custom fonts found");
            }
        } catch (e) {
            console.error('Error loading custom fonts:', e);
        }

        // ==========================================
        // HELPER FUNCTION: Get Font by Name
        // ==========================================
        function getFont(fontName, isBold = false, isItalic = false) {
            if (!fontName) return isBold ? helveticaBold : helvetica;
            
            // Check custom fonts first
            const customFont = customFonts.find(f => 
                f.name.toLowerCase() === fontName.toLowerCase()
            );
            if (customFont) {
                return customFont.font;
            }
            
            // Map to standard fonts
            const lowerName = fontName.toLowerCase();
            
            if (lowerName.includes('times') || lowerName.includes('roman')) {
                if (isBold && isItalic) return timesBold;
                if (isBold) return timesBold;
                if (isItalic) return timesItalic;
                return timesRoman;
            }
            if (lowerName.includes('courier')) {
                if (isBold && isItalic) return courierBold;
                if (isBold) return courierBold;
                if (isItalic) return courierOblique;
                return courier;
            }
            if (lowerName.includes('arial') || lowerName.includes('helvetica')) {
                if (isBold && isItalic) return helveticaBold;
                if (isBold) return helveticaBold;
                if (isItalic) return helveticaOblique;
                return helvetica;
            }
            
            return isBold ? helveticaBold : helvetica;
        }

        // ==========================================
        // HELPER FUNCTION: Hex to RGB
        // ==========================================
        function hexToRgb(hex) {
            hex = hex.replace("#", "");
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return PDFLib.rgb(
                parseInt(hex.substring(0,2),16)/255,
                parseInt(hex.substring(2,4),16)/255,
                parseInt(hex.substring(4,6),16)/255
            );
        }

        // ==========================================
        // GET LINKS FROM GLOBAL INSTANCE
        // ==========================================
        console.log("\n🔗 CHECKING FOR LINKS...");
        let links = [];
        if (window.pdfLinkSystem && window.pdfLinkSystem.links) {
            links = window.pdfLinkSystem.links;
            console.log(`✅ Found ${links.length} links to save`);
            if (links.length > 0) {
                console.log("Links data:", JSON.stringify(links, null, 2));
            }
        } else {
            console.log("⚠️ No links found to save");
        }

        // ==========================================
        // PROCESS EACH PAGE - WITH METADATA FILTER
        // ==========================================
        console.log("\n🔄 PROCESSING PAGES...");
        
        let processedPages = 0;
        let skippedMetadata = 0;

        for (let pageNumber in allPageEdits) {
            // SKIP metadata and non-numeric keys
            if (pageNumber === '_metadata' || isNaN(parseInt(pageNumber))) {
                console.log(`  📝 Skipping "${pageNumber}" (metadata)`);
                skippedMetadata++;
                continue;
            }
            
            const pageData = allPageEdits[pageNumber];
            if (!pageData) continue;

            const pageIndex = parseInt(pageNumber) - 1;
            const page = pages[pageIndex];
            if (!page) {
                console.warn(`⚠️ Page ${pageNumber} not found in PDFLib pages`);
                continue;
            }

            const { height: pageHeight, width: pageWidth } = page.getSize();
            
            console.log(`\n--- Processing Page ${pageNumber} (${pageWidth.toFixed(2)} x ${pageHeight.toFixed(2)}) ---`);
            processedPages++;




// ==========================================
// ALTERNATIVE: DRAW REDACTIONS WITH SCALE CORRECTION
// ==========================================
if (pageData.redactions && pageData.redactions.length > 0) {
    console.log(`  🔴 Applying ${pageData.redactions.length} redactions to page ${pageNumber}`);
    
    for (const redaction of pageData.redactions) {
        try {
            const { x, y, width, height, color, opacity, mode } = redaction;
            
            // Get the original PDF page dimensions
            const { width: pdfWidth, height: pdfHeight } = page.getSize();
            
            // Get the canvas dimensions
            const canvasWidth = editCanvas ? editCanvas.width : pdfWidth;
            const canvasHeight = editCanvas ? editCanvas.height : pdfHeight;
            
            // Calculate scale factor between canvas and PDF
            const scaleX = pdfWidth / canvasWidth;
            const scaleY = pdfHeight / canvasHeight;
            
            // Convert canvas coordinates to PDF coordinates
            const pdfX = x * scaleX;
            const pdfY = pdfHeight - ((y + height) * scaleY);
            const pdfWidthScaled = width * scaleX;
            const pdfHeightScaled = height * scaleY;
            
            console.log(`    Scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
            console.log(`    Canvas: ${x},${y} → PDF: ${pdfX},${pdfY}`);
            
            if (mode === 'blackout') {
                page.drawRectangle({
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidthScaled,
                    height: pdfHeightScaled,
                    color: hexToRgb(color || '#000000'),
                    opacity: opacity || 1,
                    borderWidth: 0
                });
                totalRedactions++;
                
            } else if (mode === 'whiteout') {
                page.drawRectangle({
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidthScaled,
                    height: pdfHeightScaled,
                    color: hexToRgb(color || '#ffffff'),
                    opacity: opacity || 1,
                    borderWidth: 0
                });
                totalRedactions++;
                
            } else if (mode === 'blur') {
                // ==========================================
                // SMOOTH BLUR EFFECT FOR SAVED PDF
                // ==========================================
                
                // Draw semi-transparent gray background
                page.drawRectangle({
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidthScaled,
                    height: pdfHeightScaled,
                    color: hexToRgb('#808080'),
                    opacity: 0.85,
                    borderWidth: 0
                });
                
                // Add soft gradient for depth (multiple layers)
                for (let i = 0; i < 3; i++) {
                    const offset = i * 1.5;
                    page.drawRectangle({
                        x: pdfX + offset,
                        y: pdfY + offset,
                        width: pdfWidthScaled,
                        height: pdfHeightScaled,
                        color: hexToRgb('#a0a0a0'),
                        opacity: 0.12,
                        borderWidth: 0
                    });
                    
                    page.drawRectangle({
                        x: pdfX - offset,
                        y: pdfY - offset,
                        width: pdfWidthScaled,
                        height: pdfHeightScaled,
                        color: hexToRgb('#606060'),
                        opacity: 0.12,
                        borderWidth: 0
                    });
                }
                
                // Add subtle noise pattern
                const grainCount = 200;
                for (let i = 0; i < grainCount; i++) {
                    const grainX = pdfX + Math.random() * pdfWidthScaled;
                    const grainY = pdfY + Math.random() * pdfHeightScaled;
                    const grainSize = 1.5 + Math.random() * 2;
                    const grayValue = 80 + Math.random() * 40;
                    
                    page.drawRectangle({
                        x: grainX,
                        y: grainY,
                        width: grainSize,
                        height: grainSize,
                        color: hexToRgb(`#${grayValue.toString(16).padStart(2,'0')}${grayValue.toString(16).padStart(2,'0')}${grayValue.toString(16).padStart(2,'0')}`),
                        opacity: 0.3,
                        borderWidth: 0
                    });
                }
                
                // Add blur indicator text
                const blurFont = await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaBold);
                page.drawText('BLURRED', {
                    x: pdfX + 8,
                    y: pdfY + pdfHeightScaled - 15,
                    size: 9,
                    font: blurFont,
                    color: hexToRgb('#ffffff'),
                    opacity: 0.7
                });
                
                totalRedactions++;
            }
            
        } catch (err) {
            console.error('Error drawing redaction:', err);
        }
    }
}
// ==========================================
// 1. TEXT EDITS (EDITED EXISTING TEXT)
// ==========================================
if (pageData.textEdits && pageData.textEdits.length > 0) {
    console.log(`  📝 Found ${pageData.textEdits.length} text edits`);
    
    for (let i = 0; i < pageData.textEdits.length; i++) {
        const edit = pageData.textEdits[i];
        try {
            if (!edit || !edit.text || edit.isQRCode) continue;

            const text = edit.text;
            const fontSize = edit.fontSize || 12;
            const isBold = edit.isBold || false;
            const boldThickness = edit.boldThickness || 1;
            const isThin = edit.isThin || false;

            const font = getFont(edit.fontFamily, isBold);

            // ★ X position with adjustment
            const xAdjust = edit.xAdjust || 0;
            const textX = (edit.pdfX || 0) + (xAdjust * 0.5);

            // ★ Y position - BASE from PDF + USER ADJUSTMENT
            const pdfY = pageHeight - (edit.pdfY || 0);      // Base position
            const yAdjust = edit.yAdjust || 0;               // User drag
            const textYFinal = pdfY + (yAdjust * 0.3);       // Final position

            const textColor = hexToRgb(edit.color || "#000000");

            // Text dimensions
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = fontSize;

            // Cover area
            const coverHeight = edit.coverHeight || 0;
            const coverY = edit.coverY || 0;
            const coverW = textWidth + 2;
            const coverH = textHeight + (coverHeight * 0.8);
            const coverX = textX - 1;
            const coverYPos = textYFinal - (textHeight * 0.3) - (coverY * 0.5);

            // Background
            if (edit.bgColor && edit.bgColor !== "transparent") {
                page.drawRectangle({
                    x: coverX,
                    y: coverYPos,
                    width: coverW,
                    height: coverH,
                    color: hexToRgb(edit.bgColor)
                });
            }

            // Bold stroke handling
            const shouldDrawStroke = (boldThickness > 1.05) && !isThin;

            // Draw text
            page.drawText(text, {
                x: textX,
                y: textYFinal,
                size: fontSize,
                font: font,
                color: textColor,
                strokeColor: shouldDrawStroke ? textColor : undefined,
                strokeWidth: shouldDrawStroke ? (boldThickness - 1) * 0.5 : 0
            });
            
        } catch (err) {
            console.error(`    ❌ Error drawing text edit #${i+1}:`, err);
        }
    }
}


if (pageData.overlays && pageData.overlays.length > 0) {
    for (const overlay of pageData.overlays) {
        try {
            // TEXT OVERLAYS - SAME CALCULATION AS PREVIEW
            if (overlay.type === 'text' && overlay.text) {

                const fontSize = overlay.fontSize || 16;
                const isBold = overlay.isBold || false;
                const isItalic = overlay.isItalic || false;
                const isUnderline = overlay.isUnderline || false;
                const font = getFont(overlay.fontFamily, isBold, isItalic);
                
                // Get position (SAME as preview)
                let x = (overlay.xFrac || 0.1) * pageWidth;
                let y = pageHeight - ((overlay.yFrac || 0.1) * pageHeight);
                
                // Calculate text dimensions (SAME method as preview)
                const textWidth = font.widthOfTextAtSize(overlay.text, fontSize);
                const textHeight = fontSize;
                
                // Adjust Y position for baseline (SAME as preview)
                y -= textHeight * 0.75;
                
                // Background color handling - SAME CALCULATION
                const hasBackground = overlay.hasBackground === true;
                const bgColor = overlay.backgroundColor;
                const bgOpacity = overlay.bgOpacity !== undefined ? overlay.bgOpacity : 0.8;
                
                // Padding for background (SAME as preview)
                const paddingX = 8;
                const paddingY = 6;
                
                // Draw background FIRST (so text appears on top)
                if (hasBackground && bgColor && bgColor !== "transparent") {
                    const bgX = x - paddingX;
                    const bgY = y - paddingY;
                    const bgWidth = textWidth + (paddingX * 2);
                    const bgHeight = textHeight + (paddingY * 2);
                    
                    const bgRgb = hexToRgb(bgColor);
                    
                    page.drawRectangle({
                        x: bgX,
                        y: bgY,
                        width: bgWidth,
                        height: bgHeight,
                        color: bgRgb,
                        opacity: bgOpacity
                    });
                }
                
                // Apply rotation if any
                const rotation = overlay.rotation || 0;
                
                // Draw text
                if (rotation !== 0) {
                    page.drawText(overlay.text, {
                        x: x,
                        y: y,
                        size: fontSize,
                        font: font,
                        color: hexToRgb(overlay.color || '#000000'),
                        rotate: rotation
                    });
                } else {
                    page.drawText(overlay.text, {
                        x: x,
                        y: y,
                        size: fontSize,
                        font: font,
                        color: hexToRgb(overlay.color || '#000000')
                    });
                }
                
                // Draw underline if needed
                if (isUnderline) {
                    const underlineY = y - 2;
                    page.drawLine({
                        start: { x: x, y: underlineY },
                        end: { x: x + textWidth, y: underlineY },
                        thickness: 1,
                        color: hexToRgb(overlay.color || '#000000')
                    });
                }
            }
            
            // IMAGE OVERLAYS
            else if (overlay.type === 'image' && overlay.data) {
                const base64Data = overlay.data.split(",")[1];
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                let image;
                if (overlay.data.includes("image/png")) {
                    image = await pdfDocLib.embedPng(imageBytes);
                } else {
                    image = await pdfDocLib.embedJpg(imageBytes);
                }
                
                if (image) {
                    const x = (overlay.xFrac || 0.1) * pageWidth;
                    const y = pageHeight - ((overlay.yFrac || 0.1) * pageHeight) - ((overlay.hFrac || 0.1) * pageHeight);
                    const w = (overlay.wFrac || 0.2) * pageWidth;
                    const h = (overlay.hFrac || 0.15) * pageHeight;
                    
                    page.drawImage(image, {
                        x: x,
                        y: y,
                        width: w,
                        height: h
                    });
                }
            }
            
            // HIGHLIGHT OVERLAYS
            else if (overlay.type === 'highlight' && overlay.color) {
                const x = (overlay.xFrac || 0.1) * pageWidth;
                const y = pageHeight - ((overlay.yFrac || 0.1) * pageHeight) - ((overlay.hFrac || 0.05) * pageHeight);
                const w = (overlay.wFrac || 0.3) * pageWidth;
                const h = (overlay.hFrac || 0.05) * pageHeight;
                
                page.drawRectangle({
                    x: x,
                    y: y,
                    width: w,
                    height: h,
                    color: hexToRgb(overlay.color || '#fff475'),
                    opacity: overlay.opacity || 0.4
                });
            }
            
            // WATERMARK overlays
            else if (overlay.type === 'watermark') {
                const opacity = overlay.opacity || 0.3;
                const rotation = overlay.rotation || -30;
                
                if (overlay.subtype === 'text') {
                    const fontSize = overlay.fontSize || 48;
                    const isBold = overlay.isBold || false;
                    const font = getFont(overlay.fontFamily, isBold);
                    const textWidth = font.widthOfTextAtSize(overlay.text, fontSize);
                    const textHeight = fontSize;
                    
                    const x = (overlay.xFrac || 0.5) * pageWidth - textWidth/2;
                    const y = (overlay.yFrac || 0.5) * pageHeight + textHeight/2;
                    
                    page.drawText(overlay.text, {
                        x: x,
                        y: y,
                        size: fontSize,
                        font: font,
                        color: hexToRgb(overlay.color || '#cccccc'),
                        opacity: opacity,
                        rotate: rotation
                    });
                } else if (overlay.subtype === 'image' && overlay.imageData) {
                    const base64Data = overlay.imageData.split(",")[1];
                    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    let image;
                    if (overlay.imageData.includes("image/png")) {
                        image = await pdfDocLib.embedPng(imageBytes);
                    } else {
                        image = await pdfDocLib.embedJpg(imageBytes);
                    }
                    
                    if (image) {
                        const scale = overlay.scale || 0.3;
                        const imgWidth = image.width * scale;
                        const imgHeight = image.height * scale;
                        const x = (overlay.xFrac || 0.5) * pageWidth - imgWidth/2;
                        const y = (overlay.yFrac || 0.5) * pageHeight - imgHeight/2;
                        
                        page.drawImage(image, {
                            x: x,
                            y: y,
                            width: imgWidth,
                            height: imgHeight,
                            opacity: opacity
                        });
                    }
                }
            }
            
        } catch (err) {
            console.error('Error processing overlay:', err);
        }
    }
}

            // ==========================================
            // 3. SIGNATURES
            // ==========================================
            if (pageData.signatures && pageData.signatures.length > 0) {
                for (const signature of pageData.signatures) {
                    try {
                        if (signature.data) {
                            const base64Data = signature.data.split(",")[1];
                            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                            const image = await pdfDocLib.embedPng(imageBytes);
                            
                            const x = (signature.xFrac || 0.2) * pageWidth;
                            const y = pageHeight - ((signature.yFrac || 0.2) * pageHeight) - ((signature.hFrac || 0.1) * pageHeight);
                            const w = (signature.wFrac || 0.3) * pageWidth;
                            const h = (signature.hFrac || 0.1) * pageHeight;
                            
                            page.drawImage(image, {
                                x: x,
                                y: y,
                                width: w,
                                height: h
                            });
                        }
                    } catch (err) {
                        console.error('Error processing signature:', err);
                    }
                }
            }

            // ==========================================
            // 4. IMAGE REPLACEMENTS
            // ==========================================
            if (pageData.images && pageData.images.length > 0) {
                for (const imgEdit of pageData.images) {
                    if (!imgEdit.data) continue;

                    try {
                        const base64Data = imgEdit.data.split(",")[1];
                        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                        let image;
                        if (imgEdit.data.includes("image/png")) {
                            image = await pdfDocLib.embedPng(imageBytes);
                        } else {
                            image = await pdfDocLib.embedJpg(imageBytes);
                        }

                        if (image) {
                            const imgX = imgEdit.pdfX || 0;
                            const imgY = imgEdit.pdfY || 0;
                            const imgW = imgEdit.pdfWidth || 100;
                            const imgH = imgEdit.pdfHeight || 100;

                            // Cover old image
                            page.drawRectangle({
                                x: imgX,
                                y: imgY,
                                width: imgW,
                                height: imgH,
                                color: PDFLib.rgb(1,1,1)
                            });

                            // Draw new image
                            page.drawImage(image, {
                                x: imgX,
                                y: imgY,
                                width: imgW,
                                height: imgH
                            });
                        }
                    } catch (err) {
                        console.error("Image embed error:", err);
                    }
                }
            }

            // ==========================================
            // 5. DRAWINGS & FREEHAND
            // ==========================================
            const drawingSources = [
                pageData.drawings,
                pageData.shapes,
                pageData.highlights,
                pageData.annotations
            ];
            
            for (const source of drawingSources) {
                if (!source || !Array.isArray(source)) continue;
                
                for (const item of source) {
                    if (!item) continue;
                    
                    try {
                        if (item.type === 'drawing' || item.type === 'path' || item.subType === 'freehand') {
                            if (item.points && item.points.length >= 2) {
                                const color = hexToRgb(item.color || '#ff0000');
                                const thickness = item.thickness || 3;
                                
                                const points = item.points.map(p => ({
                                    x: p.x * pageWidth,
                                    y: pageHeight - (p.y * pageHeight)
                                }));
                                
                                for (let j = 0; j < points.length - 1; j++) {
                                    page.drawLine({
                                        start: { x: points[j].x, y: points[j].y },
                                        end: { x: points[j + 1].x, y: points[j + 1].y },
                                        thickness: thickness,
                                        color: color
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error drawing item:', err);
                    }
                }
            }

            // ==========================================
            // 6. QR CODES
            // ==========================================
            if (pageData.qrCodes && pageData.qrCodes.length > 0) {
                for (const qr of pageData.qrCodes) {
                    try {
                        if (qr.data) {
                            const base64Data = qr.data.split(",")[1];
                            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                            const image = await pdfDocLib.embedPng(imageBytes);
                            
                            const x = (qr.xFrac || 0.1) * pageWidth;
                            const y = pageHeight - ((qr.yFrac || 0.1) * pageHeight) - ((qr.hFrac || 0.1) * pageHeight);
                            const w = (qr.wFrac || 0.2) * pageWidth;
                            const h = (qr.hFrac || 0.2) * pageHeight;
                            
                            page.drawImage(image, {
                                x: x,
                                y: y,
                                width: w,
                                height: h
                            });
                        }
                    } catch (err) {
                        console.error('Error processing QR code:', err);
                    }
                }
            }
        }

        console.log(`\n📊 Page Processing Summary: ${processedPages} pages processed, ${skippedMetadata} metadata entries skipped`);

        // ==========================================
        // 7. ADD INTERACTIVE LINKS - FINAL FIXED VERSION
        // ==========================================
        let linkSuccessCount = 0;
        let linkFailCount = 0;

        if (links.length > 0) {
            console.log("\n" + "=".repeat(50));
            console.log("🔗 ADDING INTERACTIVE LINKS TO PDF");
            console.log("=".repeat(50));
            
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                console.log(`\n--- Processing Link #${i+1}: "${link.sourceText}" ---`);
                console.log(`  📍 Link type: ${link.destination.type}`);
                
                try {
                    // Get source page
                    const sourcePageIndex = link.sourcePage - 1;
                    if (sourcePageIndex < 0 || sourcePageIndex >= pages.length) {
                        console.error(`❌ Invalid source page: ${link.sourcePage}`);
                        linkFailCount++;
                        continue;
                    }
                    
                    const sourcePage = pages[sourcePageIndex];
                    const { height: pageHeight, width: pageWidth } = sourcePage.getSize();
                    
                    // Get position from pdfPosition
                    let x = 50, y = pageHeight - 50, width = 100;
                    
                    if (link.pdfPosition) {
                        x = link.pdfPosition.x || 50;
                        y = pageHeight - (link.pdfPosition.y || 50) - 15;
                        width = Math.max(50, Math.min(250, (link.pdfPosition.width || 1) * 40));
                    }
                    
                    // Clamp values
                    x = Math.max(10, Math.min(x, pageWidth - 60));
                    y = Math.max(10, Math.min(y, pageHeight - 40));
                    width = Math.max(50, Math.min(width, 250));
                    const height = 20;
                    
                    console.log(`  📐 Rectangle: x=${x.toFixed(2)}, y=${y.toFixed(2)}, w=${width.toFixed(2)}`);
                    
                    // ===== CREATE ANNOTATION DICTIONARY =====
                    const annotDict = {
                        Type: 'Annot',
                        Subtype: 'Link',
                        Rect: [x, y, x + width, y + height],
                        Border: [0, 0, 1],
                        C: [0, 0, 1], // Blue color
                        F: 4 // Print flag
                    };
                    
                    // ===== ADD DESTINATION OR ACTION =====
                    if (link.destination.type === 'page') {
                        const destPageIndex = link.destination.value - 1;
                        if (destPageIndex >= 0 && destPageIndex < pages.length) {
                            const destPage = pages[destPageIndex];
                            
                            // FIXED: Simple destination that works in all PDF viewers
                            annotDict.Dest = pdfDocLib.context.obj([
                                destPage.node,
                                'Fit'
                            ]);
                            
                            console.log(`  ✅ Page destination: Page ${link.destination.value} (Fit)`);
                        } else {
                            console.error(`  ❌ Invalid destination page: ${link.destination.value}`);
                            linkFailCount++;
                            continue;
                        }
                    }
                    else if (link.destination.type === 'url') {
                        // URL destination
                        annotDict.A = pdfDocLib.context.obj({
                            Type: 'Action',
                            S: 'URI',
                            URI: link.destination.value
                        });
                        console.log(`  ✅ URL destination: ${link.destination.value}`);
                    }
                    else if (link.destination.type === 'email') {
                        // Email destination
                        annotDict.A = pdfDocLib.context.obj({
                            Type: 'Action',
                            S: 'URI',
                            URI: `mailto:${link.destination.value}`
                        });
                        console.log(`  ✅ Email destination: ${link.destination.value}`);
                    }
                    
                    // ===== CREATE AND ADD ANNOTATION =====
                    const linkAnnotation = pdfDocLib.context.obj(annotDict);
                    
                    // Add to page
                    if (typeof sourcePage.node.addAnnot === 'function') {
                        sourcePage.node.addAnnot(linkAnnotation);
                        console.log(`  ✅ Link added via addAnnot()`);
                        linkSuccessCount++;
                    } else {
                        console.error(`  ❌ Could not add link`);
                        linkFailCount++;
                    }
                    
                } catch (linkErr) {
                    console.error(`❌ Error adding link #${i+1}:`, linkErr);
                    linkFailCount++;
                }
            }
            
            console.log("\n" + "=".repeat(50));
            console.log("📊 LINK SAVING SUMMARY");
            console.log("=".repeat(50));
            console.log(`Total links: ${links.length}`);
            console.log(`✅ Successfully added: ${linkSuccessCount}`);
            console.log(`❌ Failed: ${linkFailCount}`);
            
            if (linkSuccessCount > 0) {
                console.log("🎉 Links successfully embedded in PDF!");
            }
        } else {
            console.log("\n⚠️ No links to save");
        }

        // ==========================================
        // 8. SAVE THE PDF
        // ==========================================
        console.log("\n" + "=".repeat(50));
        console.log("💾 SAVING PDF...");
        console.log("=".repeat(50));
        
        const newPdf = await pdfDocLib.save({
            useObjectStreams: true,
            addDefaultPage: false
        });
        
        console.log(`✅ PDF generated: ${(newPdf.length / 1024).toFixed(2)} KB`);
        
        // Create download
        const blob = new Blob([newPdf], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `edited_document_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log("\n" + "=".repeat(50));
        console.log("%c✅ PDF SAVED SUCCESSFULLY!", "background: green; color: white; font-size: 16px");
        console.log("=".repeat(50));
        
        // Count all edits for stats
        let textEditCount = 0;
        let imageCount = 0;
        let overlayCount = 0;
        
        for (let page in allPageEdits) {
            if (page === '_metadata') continue;
            if (allPageEdits[page]) {
                if (allPageEdits[page].textEdits) textEditCount += allPageEdits[page].textEdits.length;
                if (allPageEdits[page].images) imageCount += allPageEdits[page].images.length;
                if (allPageEdits[page].overlays) overlayCount += allPageEdits[page].overlays.length;
            }
        }
        
        console.log("\n📊 FINAL STATS:");
        console.log(`📝 Text edits: ${textEditCount}`);
        console.log(`🖼️ Images: ${imageCount}`);
        console.log(`🎨 Overlays: ${overlayCount}`);
        console.log(`🔗 Links: ${links.length} (${linkSuccessCount} successful)`);
        
        showNotification(`✅ PDF Saved! ${linkSuccessCount} links included`);

    } catch (error) {
        console.error("\n❌❌❌ FATAL ERROR SAVING PDF ❌❌❌");
        console.error("Error:", error);
        console.error("Stack:", error.stack);
        showNotification("Error saving PDF: " + error.message, true);
    }
}
