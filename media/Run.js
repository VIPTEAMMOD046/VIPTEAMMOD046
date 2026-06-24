/**
 * PDF Form Editor Pro — Save Engine v2.0
 * 
 * Architecture: Pipeline-based document assembly with isolated stages
 * Each stage is independently testable, observable, and fails gracefully.
 * 
 * @module saveEngine
 * @requires PDFLib
 * @requires fontkit
 */

// =============================================================================
// 1. STRICT CONFIGURATION & CONSTANTS
// =============================================================================

const SAVE_CONFIG = Object.freeze({
    // Export settings
    useObjectStreams: true,
    addDefaultPage: false,
    
    // Blur simulation (deterministic pseudo-noise)
    BLUR_GRAIN_SEED: 42,
    BLUR_GRAIN_COUNT: 200,
    
    // Performance
    PROGRESS_INTERVAL_PAGES: 5,
    MAX_LINK_WIDTH: 250,
    MIN_LINK_WIDTH: 50,
    LINK_HEIGHT: 20,
    
    // Font fallback
    DEFAULT_FONT: 'helvetica',
    
    // Notification levels
    LOG_LEVEL: 'warn', // 'debug' | 'info' | 'warn' | 'error' | 'silent'
});

const STANDARD_FONT_MAP = {
    'helvetica':              { regular: 'Helvetica', bold: 'HelveticaBold', italic: 'HelveticaOblique', boldItalic: 'HelveticaBold' },
    'times':                  { regular: 'TimesRoman', bold: 'TimesRomanBold', italic: 'TimesRomanItalic', boldItalic: 'TimesRomanBold' },
    'courier':                { regular: 'Courier', bold: 'CourierBold', italic: 'CourierOblique', boldItalic: 'CourierBold' },
    'arial':                  { regular: 'Helvetica', bold: 'HelveticaBold', italic: 'HelveticaOblique', boldItalic: 'HelveticaBold' },
    'times new roman':        { regular: 'TimesRoman', bold: 'TimesRomanBold', italic: 'TimesRomanItalic', boldItalic: 'TimesRomanBold' },
    'courier new':            { regular: 'Courier', bold: 'CourierBold', italic: 'CourierOblique', boldItalic: 'CourierBold' },
};

const NOTIFICATION_TYPES = Object.freeze({
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
});

// =============================================================================
// 2. OBSERVABLE LOGGER — Replace all console.* calls
// =============================================================================

class Logger {
    constructor(level = 'warn') {
        this.levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
        this.currentLevel = this.levels[level] ?? 2;
    }

    debug(...args) { if (this.currentLevel <= 0) console.debug('[DEBUG]', ...args); }
    info(...args)  { if (this.currentLevel <= 1) console.info('[INFO]', ...args); }
    warn(...args)  { if (this.currentLevel <= 2) console.warn('[WARN]', ...args); }
    error(...args) { if (this.currentLevel <= 3) console.error('[ERROR]', ...args); }
    
    group(label)   { if (this.currentLevel <= 1) console.group(label); }
    groupEnd()     { if (this.currentLevel <= 1) console.groupEnd(); }
    table(data)    { if (this.currentLevel <= 1) console.table(data); }
}

const logger = new Logger(SAVE_CONFIG.LOG_LEVEL);

// =============================================================================
// 3. ERROR COLLECTOR — Gathers all failures for user-visible report
// =============================================================================

class ErrorCollector {
    constructor() {
        this.errors = [];
    }
    
    add(type, page, detail, error) {
        this.errors.push({
            type,
            page,
            detail,
            message: error?.message || String(error),
            timestamp: new Date().toISOString(),
        });
        logger.error(`${type} failed on page ${page}: ${detail}`, error);
    }
    
    hasErrors() {
        return this.errors.length > 0;
    }
    
    getReport() {
        return {
            total: this.errors.length,
            byType: this.errors.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {}),
            details: this.errors,
        };
    }
}

// =============================================================================
// 4. DETERMINISTIC PSEUDO-RANDOM — Replaces Math.random() in blur
// =============================================================================

class SeededRandom {
    constructor(seed = 42) {
        this.seed = seed;
    }
    
    // Mulberry32 algorithm — fast, deterministic, good distribution
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    reset(seed) {
        this.seed = seed;
    }
}

// =============================================================================
// 5. FONT MANAGER — Type-safe font resolution
// =============================================================================

class FontManager {
    constructor(pdfDocLib, standardFonts, customFonts) {
        this.standardFonts = standardFonts;  // { helvetica, helveticaBold, ... }
        this.customFonts = customFonts;      // [{ name, font }]
        this.fontCache = new Map();
    }
    
    /**
     * Resolve a font by name with proper bold/italic handling.
     * Returns the exact font object or falls back to Helvetica.
     */
    resolve(fontName, isBold = false, isItalic = false) {
        const cacheKey = `${fontName || 'default'}_${isBold}_${isItalic}`;
        
        if (this.fontCache.has(cacheKey)) {
            return this.fontCache.get(cacheKey);
        }
        
        let font;
        
        // 1. Check custom fonts (exact match)
        if (fontName) {
            const customFont = this.customFonts.find(
                f => f.name.toLowerCase() === fontName.toLowerCase()
            );
            if (customFont) {
                font = customFont.font;
                this.fontCache.set(cacheKey, font);
                return font;
            }
        }
        
        // 2. Map to standard font family
        const normalizedName = (fontName || SAVE_CONFIG.DEFAULT_FONT).toLowerCase();
        const family = this._findFontFamily(normalizedName);
        const variant = this._resolveVariant(family, isBold, isItalic);
        
        font = this.standardFonts[variant];
        
        // 3. Ultimate fallback
        if (!font) {
            logger.warn(`Font not found: "${fontName}" (bold=${isBold}, italic=${isItalic}), falling back to Helvetica`);
            font = this.standardFonts.helvetica;
        }
        
        this.fontCache.set(cacheKey, font);
        return font;
    }
    
    _findFontFamily(normalizedName) {
        for (const [key, value] of Object.entries(STANDARD_FONT_MAP)) {
            if (normalizedName.includes(key)) {
                return value;
            }
        }
        return STANDARD_FONT_MAP['helvetica'];
    }
    
    _resolveVariant(family, isBold, isItalic) {
        if (isBold && isItalic) return family.boldItalic;
        if (isBold) return family.bold;
        if (isItalic) return family.italic;
        return family.regular;
    }
}

// =============================================================================
// 6. COORDINATE TRANSFORMER — Single source of truth for all coordinate math
// =============================================================================

class CoordinateTransformer {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {number} pdfWidth
     * @param {number} pdfHeight
     */
    constructor(canvasWidth, canvasHeight, pdfWidth, pdfHeight) {
        this.scaleX = pdfWidth / canvasWidth;
        this.scaleY = pdfHeight / canvasHeight;
        this.pdfWidth = pdfWidth;
        this.pdfHeight = pdfHeight;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
    
    /**
     * Convert canvas (x, y) to PDF (x, y) with Y-axis inversion.
     */
    canvasToPdf(canvasX, canvasY, canvasH = 0) {
        return {
            x: canvasX * this.scaleX,
            y: this.pdfHeight - ((canvasY + canvasH) * this.scaleY),
        };
    }
    
    /**
     * Convert canvas dimensions to PDF dimensions.
     */
    canvasDimsToPdf(canvasW, canvasH) {
        return {
            width: canvasW * this.scaleX,
            height: canvasH * this.scaleY,
        };
    }
    
    /**
     * Convert fraction-based position to absolute PDF coordinates.
     */
    fractionToPdf(xFrac, yFrac, wFrac = 0, hFrac = 0) {
        return {
            x: xFrac * this.pdfWidth,
            y: this.pdfHeight - (yFrac * this.pdfHeight) - (hFrac * this.pdfHeight),
            width: wFrac * this.pdfWidth,
            height: hFrac * this.pdfHeight,
        };
    }
    
    /**
     * Clamp a value between min and max.
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

// =============================================================================
// 7. COLOR UTILITY — Hex string to PDFLib RGB
// =============================================================================

class ColorUtil {
    /**
     * Convert hex string to PDFLib RGB object.
     * Supports #RGB, #RRGGBB formats.
     */
    static hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        // Validate
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            logger.warn(`Invalid hex color: "${hex}", falling back to black`);
            return PDFLib.rgb(0, 0, 0);
        }
        
        return PDFLib.rgb(r, g, b);
    }
}

// =============================================================================
// 8. RENDERERS — Each edit type gets its own pure function
// =============================================================================

class RedactionRenderer {
    constructor(logger, colorUtil, seededRandom) {
        this.logger = logger;
        this.colorUtil = colorUtil;
        this.seededRandom = seededRandom;
    }
    
    render(page, redaction, transformer) {
        const { x, y, width, height, color, opacity = 1, mode = 'blackout' } = redaction;
        
        const pdfPos = transformer.canvasToPdf(x, y, height);
        const pdfDims = transformer.canvasDimsToPdf(width, height);
        
        this.logger.debug(`Redaction: mode=${mode}, pos=(${pdfPos.x.toFixed(1)}, ${pdfPos.y.toFixed(1)}), size=${pdfDims.width.toFixed(1)}x${pdfDims.height.toFixed(1)}`);
        
        switch (mode) {
            case 'blackout':
                this._drawBlackout(page, pdfPos, pdfDims, color, opacity);
                break;
            case 'whiteout':
                this._drawWhiteout(page, pdfPos, pdfDims, color, opacity);
                break;
            case 'blur':
                this._drawBlur(page, pdfPos, pdfDims, transformer);
                break;
            default:
                this.logger.warn(`Unknown redaction mode: "${mode}", using blackout`);
                this._drawBlackout(page, pdfPos, pdfDims, color, opacity);
        }
    }
    
    _drawBlackout(page, pos, dims, color, opacity) {
        page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: dims.width,
            height: dims.height,
            color: this.colorUtil.hexToRgb(color || '#000000'),
            opacity,
            borderWidth: 0,
        });
    }
    
    _drawWhiteout(page, pos, dims, color, opacity) {
        page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: dims.width,
            height: dims.height,
            color: this.colorUtil.hexToRgb(color || '#ffffff'),
            opacity,
            borderWidth: 0,
        });
    }
    
    _drawBlur(page, pos, dims, transformer) {
        // Base gray overlay
        page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: dims.width,
            height: dims.height,
            color: this.colorUtil.hexToRgb('#808080'),
            opacity: 0.85,
            borderWidth: 0,
        });
        
        // Depth layers
        for (let i = 0; i < 3; i++) {
            const offset = i * 1.5;
            page.drawRectangle({
                x: pos.x + offset,
                y: pos.y + offset,
                width: dims.width,
                height: dims.height,
                color: this.colorUtil.hexToRgb('#a0a0a0'),
                opacity: 0.12,
                borderWidth: 0,
            });
            page.drawRectangle({
                x: pos.x - offset,
                y: pos.y - offset,
                width: dims.width,
                height: dims.height,
                color: this.colorUtil.hexToRgb('#606060'),
                opacity: 0.12,
                borderWidth: 0,
            });
        }
        
        // Deterministic grain pattern
        this.seededRandom.reset(SAVE_CONFIG.BLUR_GRAIN_SEED + Math.floor(pos.x * 1000 + pos.y));
        for (let i = 0; i < SAVE_CONFIG.BLUR_GRAIN_COUNT; i++) {
            const grainX = pos.x + this.seededRandom.range(0, dims.width);
            const grainY = pos.y + this.seededRandom.range(0, dims.height);
            const grainSize = this.seededRandom.range(1.5, 3.5);
            const grayValue = Math.floor(this.seededRandom.range(80, 120));
            const grayHex = grayValue.toString(16).padStart(2, '0');
            
            page.drawRectangle({
                x: grainX,
                y: grainY,
                width: grainSize,
                height: grainSize,
                color: this.colorUtil.hexToRgb(`#${grayHex}${grayHex}${grayHex}`),
                opacity: 0.3,
                borderWidth: 0,
            });
        }
        
        // Label
        page.drawText('BLURRED', {
            x: pos.x + 8,
            y: pos.y + dims.height - 15,
            size: 9,
            font: this.blurFont, // Injected during construction
            color: this.colorUtil.hexToRgb('#ffffff'),
            opacity: 0.7,
        });
    }
    
    setBlurFont(font) {
        this.blurFont = font;
    }
}

class TextRenderer {
    constructor(fontManager, colorUtil, logger) {
        this.fontManager = fontManager;
        this.colorUtil = colorUtil;
        this.logger = logger;
    }
    
    /**
     * Render a single text edit onto a PDF page.
     */
    renderTextEdit(page, edit, pageHeight) {
        if (!edit?.text || edit.isQRCode) return;
        
        const {
            text,
            fontSize = 12,
            isBold = false,
            isItalic = false,
            boldThickness = 1,
            fontFamily,
            color = '#000000',
            bgColor,
            pdfX = 0,
            pdfY = 0,
            xAdjust = 0,
            yAdjust = 0,
            coverHeight = 0,
            coverY = 0,
        } = edit;
        
        const font = this.fontManager.resolve(fontFamily, isBold, isItalic);
        
        // Calculate final positions
        const textX = pdfX + (xAdjust * 0.5);
        const basePdfY = pageHeight - pdfY;
        const textYFinal = basePdfY + (yAdjust * 0.3);
        
        const textColor = this.colorUtil.hexToRgb(color);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;
        
        // Draw background if specified
        if (bgColor && bgColor !== 'transparent') {
            const coverW = textWidth + 2;
            const coverH = textHeight + (coverHeight * 0.8);
            const coverX = textX - 1;
            const coverYPos = textYFinal - (textHeight * 0.3) - (coverY * 0.5);
            
            page.drawRectangle({
                x: coverX,
                y: coverYPos,
                width: coverW,
                height: coverH,
                color: this.colorUtil.hexToRgb(bgColor),
            });
        }
        
        // Determine if stroke is needed for bold effect
        const shouldDrawStroke = (boldThickness > 1.05);
        
        // Draw text
        page.drawText(text, {
            x: textX,
            y: textYFinal,
            size: fontSize,
            font,
            color: textColor,
            strokeColor: shouldDrawStroke ? textColor : undefined,
            strokeWidth: shouldDrawStroke ? (boldThickness - 1) * 0.5 : 0,
        });
    }
    
    /**
     * Render a text overlay onto a PDF page.
     */
    renderTextOverlay(page, overlay, transformer) {
        if (!overlay.text) return;
        
        const {
            text,
            fontSize = 16,
            isBold = false,
            isItalic = false,
            isUnderline = false,
            fontFamily,
            color = '#000000',
            hasBackground = false,
            backgroundColor,
            bgOpacity = 0.8,
            rotation = 0,
            xFrac = 0.1,
            yFrac = 0.1,
        } = overlay;
        
        const font = this.fontManager.resolve(fontFamily, isBold, isItalic);
        const pos = transformer.fractionToPdf(xFrac, yFrac);
        
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;
        
        // Adjust Y for baseline
        let drawY = pos.y - textHeight * 0.75;
        
        // Draw background rectangle
        if (hasBackground && backgroundColor && backgroundColor !== 'transparent') {
            const paddingX = 8;
            const paddingY = 6;
            page.drawRectangle({
                x: pos.x - paddingX,
                y: drawY - paddingY,
                width: textWidth + paddingX * 2,
                height: textHeight + paddingY * 2,
                color: this.colorUtil.hexToRgb(backgroundColor),
                opacity: bgOpacity,
            });
        }
        
        // Draw text with optional rotation
        page.drawText(text, {
            x: pos.x,
            y: drawY,
            size: fontSize,
            font,
            color: this.colorUtil.hexToRgb(color),
            rotate: rotation || undefined,
        });
        
        // Underline
        if (isUnderline) {
            page.drawLine({
                start: { x: pos.x, y: drawY - 2 },
                end: { x: pos.x + textWidth, y: drawY - 2 },
                thickness: 1,
                color: this.colorUtil.hexToRgb(color),
            });
        }
    }
}

class ImageRenderer {
    constructor(pdfDocLib, logger) {
        this.pdfDocLib = pdfDocLib;
        this.logger = logger;
    }
    
    async embedImage(base64Data) {
        const parts = base64Data.split(',');
        const rawData = parts.length > 1 ? parts[1] : parts[0];
        const imageBytes = Uint8Array.from(atob(rawData), c => c.charCodeAt(0));
        
        if (base64Data.includes('image/png') || base64Data.startsWith('data:image/png')) {
            return this.pdfDocLib.embedPng(imageBytes);
        }
        return this.pdfDocLib.embedJpg(imageBytes);
    }
    
    async renderOverlay(page, overlay, transformer) {
        if (!overlay.data) return;
        
        try {
            const image = await this.embedImage(overlay.data);
            if (!image) return;
            
            const pos = transformer.fractionToPdf(
                overlay.xFrac || 0.1,
                overlay.yFrac || 0.1,
                overlay.wFrac || 0.2,
                overlay.hFrac || 0.15
            );
            
            page.drawImage(image, {
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
            });
        } catch (err) {
            this.logger.error('Failed to render image overlay:', err);
            throw err;
        }
    }
    
    async renderSignature(page, signature, transformer) {
        if (!signature.data) return;
        
        const image = await this.embedImage(signature.data);
        if (!image) return;
        
        const pos = transformer.fractionToPdf(
            signature.xFrac || 0.2,
            signature.yFrac || 0.2,
            signature.wFrac || 0.3,
            signature.hFrac || 0.1
        );
        
        page.drawImage(image, {
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
        });
    }
    
    async renderQRCode(page, qrCode, transformer) {
        if (!qrCode.data) return;
        
        const image = await this.embedImage(qrCode.data);
        if (!image) return;
        
        const pos = transformer.fractionToPdf(
            qrCode.xFrac || 0.1,
            qrCode.yFrac || 0.1,
            qrCode.wFrac || 0.2,
            qrCode.hFrac || 0.2
        );
        
        page.drawImage(image, {
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
        });
    }
    
    async renderReplacement(page, imgEdit) {
        if (!imgEdit.data) return;
        
        const image = await this.embedImage(imgEdit.data);
        if (!image) return;
        
        const { pdfX = 0, pdfY = 0, pdfWidth = 100, pdfHeight = 100 } = imgEdit;
        
        // White out the original area
        page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: PDFLib.rgb(1, 1, 1),
        });
        
        // Draw replacement
        page.drawImage(image, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
    }
}

class DrawingRenderer {
    constructor(colorUtil, logger) {
        this.colorUtil = colorUtil;
        this.logger = logger;
    }
    
    renderFreehand(page, item, transformer) {
        const isFreehand = item.type === 'drawing' || 
                           item.type === 'path' || 
                           item.subType === 'freehand';
        
        if (!isFreehand || !item.points || item.points.length < 2) return;
        
        const color = this.colorUtil.hexToRgb(item.color || '#ff0000');
        const thickness = item.thickness || 3;
        
        // Transform all points
        const points = item.points.map(p => {
            const pdfPos = transformer.canvasToPdf(p.x, p.y);
            return { x: pdfPos.x, y: pdfPos.y };
        });
        
        // Draw line segments
        for (let i = 0; i < points.length - 1; i++) {
            page.drawLine({
                start: { x: points[i].x, y: points[i].y },
                end: { x: points[i + 1].x, y: points[i + 1].y },
                thickness,
                color,
            });
        }
    }
    
    renderHighlight(page, overlay, transformer) {
        if (overlay.type !== 'highlight' || !overlay.color) return;
        
        const pos = transformer.fractionToPdf(
            overlay.xFrac || 0.1,
            overlay.yFrac || 0.1,
            overlay.wFrac || 0.3,
            overlay.hFrac || 0.05
        );
        
        page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            color: this.colorUtil.hexToRgb(overlay.color || '#fff475'),
            opacity: overlay.opacity || 0.4,
        });
    }
    
    renderWatermark(page, overlay, fontManager, imageRenderer, transformer) {
        if (overlay.type !== 'watermark') return;
        
        const opacity = overlay.opacity || 0.3;
        const rotation = overlay.rotation || -30;
        
        if (overlay.subtype === 'text') {
            const font = fontManager.resolve(overlay.fontFamily, overlay.isBold);
            const fontSize = overlay.fontSize || 48;
            const textWidth = font.widthOfTextAtSize(overlay.text, fontSize);
            const textHeight = fontSize;
            
            const pos = transformer.fractionToPdf(overlay.xFrac || 0.5, overlay.yFrac || 0.5);
            const drawX = pos.x - textWidth / 2;
            const drawY = pos.y + textHeight / 2;
            
            page.drawText(overlay.text, {
                x: drawX,
                y: drawY,
                size: fontSize,
                font,
                color: this.colorUtil.hexToRgb(overlay.color || '#cccccc'),
                opacity,
                rotate: rotation,
            });
        } else if (overlay.subtype === 'image' && overlay.imageData) {
            // Image watermarks handled by ImageRenderer
            // This is a placeholder for the async version
            this.logger.debug('Image watermark detected — use async renderWatermarkAsync');
        }
    }
}

class LinkRenderer {
    constructor(pdfDocLib, logger) {
        this.pdfDocLib = pdfDocLib;
        this.logger = logger;
    }
    
    /**
     * Add interactive link annotations to the PDF.
     * Uses pdf-lib's internal API — MONITOR FOR BREAKING CHANGES.
     * 
     * @param {Array} links - Array of link objects from window.pdfLinkSystem
     * @param {Array} pages - Array of PDFLib page objects
     * @returns {{ success: number, failed: number }}
     */
    render(links, pages) {
        let successCount = 0;
        let failCount = 0;
        
        if (!links || links.length === 0) {
            this.logger.info('No links to render');
            return { success: 0, failed: 0 };
        }
        
        this.logger.info(`Rendering ${links.length} link annotations...`);
        
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            
            try {
                const sourcePageIndex = link.sourcePage - 1;
                if (sourcePageIndex < 0 || sourcePageIndex >= pages.length) {
                    this.logger.warn(`Link #${i + 1}: Invalid source page ${link.sourcePage}`);
                    failCount++;
                    continue;
                }
                
                const sourcePage = pages[sourcePageIndex];
                const { height: pageHeight, width: pageWidth } = sourcePage.getSize();
                
                // Calculate annotation rectangle
                let x = 50, y = pageHeight - 50, width = 100;
                if (link.pdfPosition) {
                    x = link.pdfPosition.x || 50;
                    y = pageHeight - (link.pdfPosition.y || 50) - SAVE_CONFIG.LINK_HEIGHT / 2;
                    width = Math.max(
                        SAVE_CONFIG.MIN_LINK_WIDTH,
                        Math.min(SAVE_CONFIG.MAX_LINK_WIDTH, (link.pdfPosition.width || 1) * 40)
                    );
                }
                
                x = Math.max(10, Math.min(x, pageWidth - 60));
                y = Math.max(10, Math.min(y, pageHeight - 40));
                
                // Build annotation dictionary
                const annotDict = this._buildAnnotationDict(link, x, y, width, pages);
                
                if (!annotDict) {
                    failCount++;
                    continue;
                }
                
                // Add to page using internal API
                // WARNING: page.node.addAnnot is NOT part of pdf-lib's public API
                if (typeof sourcePage.node.addAnnot === 'function') {
                    const linkAnnotation = this.pdfDocLib.context.obj(annotDict);
                    sourcePage.node.addAnnot(linkAnnotation);
                    successCount++;
                    this.logger.debug(`Link #${i + 1}: ✓ "${link.sourceText}"`);
                } else {
                    this.logger.warn(`Link #${i + 1}: pdf-lib internal API changed — addAnnot not available`);
                    failCount++;
                }
                
            } catch (err) {
                this.logger.error(`Link #${i + 1} failed:`, err);
                failCount++;
            }
        }
        
        this.logger.info(`Links rendered: ${successCount} succeeded, ${failCount} failed`);
        return { success: successCount, failed: failCount };
    }
    
    _buildAnnotationDict(link, x, y, width, pages) {
        const annotDict = {
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x, y, x + width, y + SAVE_CONFIG.LINK_HEIGHT],
            Border: [0, 0, 1],
            C: [0, 0, 1],
            F: 4, // Print flag
        };
        
        const { type, value } = link.destination;
        
        switch (type) {
            case 'page': {
                const destPageIndex = value - 1;
                if (destPageIndex < 0 || destPageIndex >= pages.length) {
                    this.logger.warn(`Link destination page ${value} out of range`);
                    return null;
                }
                annotDict.Dest = this.pdfDocLib.context.obj([
                    pages[destPageIndex].node,
                    'Fit',
                ]);
                break;
            }
            case 'url': {
                annotDict.A = this.pdfDocLib.context.obj({
                    Type: 'Action',
                    S: 'URI',
                    URI: value,
                });
                break;
            }
            case 'email': {
                annotDict.A = this.pdfDocLib.context.obj({
                    Type: 'Action',
                    S: 'URI',
                    URI: `mailto:${value}`,
                });
                break;
            }
            default: {
                this.logger.warn(`Unknown link destination type: "${type}"`);
                return null;
            }
        }
        
        return annotDict;
    }
}

// =============================================================================
// 9. PROGRESS TRACKER — User-facing progress updates
// =============================================================================

class ProgressTracker {
    constructor(totalPages, onProgress) {
        this.totalPages = totalPages;
        this.processed = 0;
        this.onProgress = onProgress || this._defaultOnProgress;
        this.interval = SAVE_CONFIG.PROGRESS_INTERVAL_PAGES;
    }
    
    increment() {
        this.processed++;
        if (this.processed % this.interval === 0 || this.processed === this.totalPages) {
            this._report();
        }
    }
    
    complete() {
        this.processed = this.totalPages;
        this._report();
    }
    
    _report() {
        const percent = Math.round((this.processed / this.totalPages) * 100);
        this.onProgress({
            processed: this.processed,
            total: this.totalPages,
            percent,
            message: `Processing page ${this.processed} of ${this.totalPages} (${percent}%)`,
        });
    }
    
    _defaultOnProgress(status) {
        logger.info(status.message);
    }
}

// =============================================================================
// 10. MAIN SAVE PIPELINE — Orchestrates all stages
// =============================================================================

/**
 * Main entry point for saving the edited PDF document.
 * 
 * Pipeline stages:
 * 1. Validate state
 * 2. Load PDF into pdf-lib
 * 3. Load fonts (standard + custom)
 * 4. Process all pages (redactions, text, images, drawings, links)
 * 5. Serialize and download
 * 6. Report results
 * 
 * @param {Object} options - Configuration overrides
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onComplete - Completion callback
 * @param {Function} options.onError - Error callback
 */
async function savePDF(options = {}) {
    const {
        onProgress,
        onComplete,
        onError,
    } = options;
    
    const errors = new ErrorCollector();
    const startTime = performance.now();
    
    logger.group('SAVE PDF PIPELINE');
    logger.info('Starting save pipeline...');
    
    try {
        // =====================================================================
        // STAGE 1: VALIDATE
        // =====================================================================
        if (!pdfDoc) {
            const err = new Error('No PDF document loaded');
            logger.error(err.message);
            showNotification('Please load a PDF document first', true);
            if (onError) onError(err);
            return;
        }
        
        logger.info(`PDF loaded: ${pageCount} pages`);
        
        // =====================================================================
        // STAGE 2: LOAD PDF INTO PDF-LIB
        // =====================================================================
        logger.info('Loading PDF data into pdf-lib...');
        const pdfBytes = await pdfDoc.getData();
        logger.info(`PDF size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
        
        const pdfDocLib = await PDFLib.PDFDocument.load(pdfBytes);
        pdfDocLib.getForm().flatten();
        
        // Register fontkit if available
        if (typeof fontkit !== 'undefined') {
            pdfDocLib.registerFontkit(fontkit);
            logger.info('Fontkit registered');
        } else {
            logger.warn('Fontkit not available — custom fonts may fail');
        }
        
        const pages = pdfDocLib.getPages();
        logger.info(`pdf-lib ready: ${pages.length} pages`);
        
        // =====================================================================
        // STAGE 3: LOAD FONTS
        // =====================================================================
        logger.info('Loading fonts...');
        
        // 3a. Standard fonts
        const standardFonts = {
            helvetica:         await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica),
            helveticaBold:     await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaBold),
            helveticaOblique:  await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaOblique),
            timesRoman:        await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRoman),
            timesBold:         await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRomanBold),
            timesItalic:       await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRomanItalic),
            courier:           await pdfDocLib.embedFont(PDFLib.StandardFonts.Courier),
            courierBold:       await pdfDocLib.embedFont(PDFLib.StandardFonts.CourierBold),
            courierOblique:    await pdfDocLib.embedFont(PDFLib.StandardFonts.CourierOblique),
        };
        logger.info('Standard fonts embedded');
        
        // 3b. Custom fonts from localStorage
        const customFonts = await _loadCustomFonts(pdfDocLib);
        
        // Initialize font manager
        const fontManager = new FontManager(pdfDocLib, standardFonts, customFonts);
        
        // =====================================================================
        // STAGE 4: INITIALIZE RENDERERS
        // =====================================================================
        const seededRandom = new SeededRandom(SAVE_CONFIG.BLUR_GRAIN_SEED);
        
        const redactionRenderer = new RedactionRenderer(logger, ColorUtil, seededRandom);
        redactionRenderer.setBlurFont(standardFonts.helveticaBold);
        
        const textRenderer = new TextRenderer(fontManager, ColorUtil, logger);
        const imageRenderer = new ImageRenderer(pdfDocLib, logger);
        const drawingRenderer = new DrawingRenderer(ColorUtil, logger);
        const linkRenderer = new LinkRenderer(pdfDocLib, logger);
        
        // =====================================================================
        // STAGE 5: PROCESS PAGES
        // =====================================================================
        const pageKeys = Object.keys(allPageEdits || {}).filter(
            k => k !== '_metadata' && !isNaN(parseInt(k))
        ).sort((a, b) => parseInt(a) - parseInt(b));
        
        const progressTracker = new ProgressTracker(pageKeys.length, onProgress);
        
        logger.info(`Processing ${pageKeys.length} pages with edits...`);
        
        for (const pageNumber of pageKeys) {
            const pageData = allPageEdits[pageNumber];
            if (!pageData) {
                progressTracker.increment();
                continue;
            }
            
            const pageIndex = parseInt(pageNumber) - 1;
            const page = pages[pageIndex];
            
            if (!page) {
                errors.add('page_missing', pageNumber, `Page index ${pageIndex} not found in document`);
                progressTracker.increment();
                continue;
            }
            
            const { width: pageWidth, height: pageHeight } = page.getSize();
            
            // Get canvas dimensions for coordinate transform
            const canvasWidth = editCanvas?.width || pageWidth;
            const canvasHeight = editCanvas?.height || pageHeight;
            
            const transformer = new CoordinateTransformer(
                canvasWidth, canvasHeight, pageWidth, pageHeight
            );
            
            logger.debug(`Page ${pageNumber}: ${pageWidth.toFixed(1)}x${pageHeight.toFixed(1)} PDF, ` +
                        `${canvasWidth.toFixed(1)}x${canvasHeight.toFixed(1)} canvas, ` +
                        `scale ${transformer.scaleX.toFixed(3)}x${transformer.scaleY.toFixed(3)}`);
            
            // --- 5a. Redactions ---
            if (pageData.redactions?.length > 0) {
                logger.debug(`  Applying ${pageData.redactions.length} redactions`);
                for (const redaction of pageData.redactions) {
                    try {
                        redactionRenderer.render(page, redaction, transformer);
                    } catch (err) {
                        errors.add('redaction', pageNumber, `Mode: ${redaction.mode}`, err);
                    }
                }
            }
            
            // --- 5b. Text Edits ---
            if (pageData.textEdits?.length > 0) {
                logger.debug(`  Applying ${pageData.textEdits.length} text edits`);
                for (const edit of pageData.textEdits) {
                    try {
                        textRenderer.renderTextEdit(page, edit, pageHeight);
                    } catch (err) {
                        errors.add('textEdit', pageNumber, `Text: "${edit.text?.substring(0, 20)}"`, err);
                    }
                }
            }
            
            // --- 5c. Overlays (text, image, highlight, watermark) ---
            if (pageData.overlays?.length > 0) {
                logger.debug(`  Processing ${pageData.overlays.length} overlays`);
                for (const overlay of pageData.overlays) {
                    try {
                        switch (overlay.type) {
                            case 'text':
                                textRenderer.renderTextOverlay(page, overlay, transformer);
                                break;
                            case 'image':
                                await imageRenderer.renderOverlay(page, overlay, transformer);
                                break;
                            case 'highlight':
                                drawingRenderer.renderHighlight(page, overlay, transformer);
                                break;
                            case 'watermark':
                                drawingRenderer.renderWatermark(page, overlay, fontManager, imageRenderer, transformer);
                                break;
                            default:
                                logger.warn(`Unknown overlay type: "${overlay.type}"`);
                        }
                    } catch (err) {
                        errors.add('overlay', pageNumber, `Type: ${overlay.type}`, err);
                    }
                }
            }
            
            // --- 5d. Signatures ---
            if (pageData.signatures?.length > 0) {
                logger.debug(`  Processing ${pageData.signatures.length} signatures`);
                for (const signature of pageData.signatures) {
                    try {
                        await imageRenderer.renderSignature(page, signature, transformer);
                    } catch (err) {
                        errors.add('signature', pageNumber, '', err);
                    }
                }
            }
            
            // --- 5e. Image Replacements ---
            if (pageData.images?.length > 0) {
                logger.debug(`  Processing ${pageData.images.length} image replacements`);
                for (const imgEdit of pageData.images) {
                    try {
                        await imageRenderer.renderReplacement(page, imgEdit);
                    } catch (err) {
                        errors.add('imageReplacement', pageNumber, '', err);
                    }
                }
            }
            
            // --- 5f. Drawings / Freehand ---
            const drawingSources = [
                pageData.drawings,
                pageData.shapes,
                pageData.highlights,
                pageData.annotations,
            ];
            for (const source of drawingSources) {
                if (!source || !Array.isArray(source)) continue;
                for (const item of source) {
                    try {
                        drawingRenderer.renderFreehand(page, item, transformer);
                    } catch (err) {
                        errors.add('drawing', pageNumber, `Type: ${item.type}`, err);
                    }
                }
            }
            
            // --- 5g. QR Codes ---
            if (pageData.qrCodes?.length > 0) {
                logger.debug(`  Processing ${pageData.qrCodes.length} QR codes`);
                for (const qrCode of pageData.qrCodes) {
                    try {
                        await imageRenderer.renderQRCode(page, qrCode, transformer);
                    } catch (err) {
                        errors.add('qrCode', pageNumber, '', err);
                    }
                }
            }
            
            progressTracker.increment();
        }
        
        progressTracker.complete();
        
        // =====================================================================
        // STAGE 6: ADD LINKS
        // =====================================================================
        const links = window.pdfLinkSystem?.links || [];
        const linkResult = linkRenderer.render(links, pages);
        
        // =====================================================================
        // STAGE 7: SERIALIZE & DOWNLOAD
        // =====================================================================
        logger.info('Serializing PDF...');
        const newPdf = await pdfDocLib.save({
            useObjectStreams: SAVE_CONFIG.useObjectStreams,
            addDefaultPage: SAVE_CONFIG.addDefaultPage,
        });
        
        const newSizeKB = (newPdf.length / 1024).toFixed(2);
        logger.info(`Serialized PDF size: ${newSizeKB} KB`);
        
        _triggerDownload(newPdf);
        
        // =====================================================================
        // STAGE 8: REPORT RESULTS
        // =====================================================================
        const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);
        
        const stats = _calculateStats();
        
        const report = {
            pagesProcessed: pageKeys.length,
            elapsedSeconds: parseFloat(elapsedSec),
            outputSizeKB: parseFloat(newSizeKB),
            linksSucceeded: linkResult.success,
            linksFailed: linkResult.failed,
            errors: errors.getReport(),
            ...stats,
        };
        
        logger.table({
            'Pages Processed': report.pagesProcessed,
            'Text Edits': report.textEditCount,
            'Images': report.imageCount,
            'Overlays': report.overlayCount,
            'Links Added': report.linksSucceeded,
            'Errors': report.errors.total,
            'Time': `${elapsedSec}s`,
            'Output Size': `${newSizeKB} KB`,
        });
        
        // User-facing notification
        if (errors.hasErrors()) {
            const errorReport = errors.getReport();
            showNotification(
                `PDF saved with ${errorReport.total} warning(s). ` +
                `Check console for details.`,
                true
            );
            logger.warn('Error report:', errorReport);
        } else {
            showNotification('PDF saved successfully! ✨', false);
        }
        
        logger.groupEnd();
        
        if (onComplete) {
            onComplete(report);
        }
        
        return report;
        
    } catch (error) {
        logger.error('Fatal save error:', error);
        logger.groupEnd();
        showNotification(`Failed to save PDF: ${error.message}`, true);
        
        if (onError) {
            onError(error);
        }
    }
}

// =============================================================================
// 11. PRIVATE HELPERS
// =============================================================================

async function _loadCustomFonts(pdfDocLib) {
    const customFonts = [];
    
    try {
        const saved = localStorage.getItem('customFonts');
        if (!saved) {
            logger.info('No custom fonts in localStorage');
            return customFonts;
        }
        
        const fonts = JSON.parse(saved);
        logger.info(`Loading ${fonts.length} custom fonts...`);
        
        for (let i = 0; i < fonts.length; i++) {
            const font = fonts[i];
            try {
                const base64Data = font.data.includes(',') 
                    ? font.data.split(',')[1] 
                    : font.data;
                const fontBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                const embeddedFont = await pdfDocLib.embedFont(fontBytes);
                customFonts.push({ name: font.name, font: embeddedFont });
                logger.debug(`  ✓ Custom font loaded: "${font.name}"`);
            } catch (fontErr) {
                logger.warn(`  ✗ Failed to load custom font "${font.name}":`, fontErr);
            }
        }
    } catch (e) {
        logger.error('Error loading custom fonts from localStorage:', e);
    }
    
    return customFonts;
}

function _triggerDownload(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited_document_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up after a short delay to ensure the download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _calculateStats() {
    let textEditCount = 0;
    let imageCount = 0;
    let overlayCount = 0;
    
    if (!allPageEdits) return { textEditCount: 0, imageCount: 0, overlayCount: 0 };
    
    for (const key in allPageEdits) {
        if (key === '_metadata') continue;
        const pageData = allPageEdits[key];
        if (!pageData) continue;
        
        if (pageData.textEdits) textEditCount += pageData.textEdits.length;
        if (pageData.images) imageCount += pageData.images.length;
        if (pageData.overlays) overlayCount += pageData.overlays.length;
    }
    
    return { textEditCount, imageCount, overlayCount };
}

// =============================================================================
// 12. EXPORT
// =============================================================================

// Expose for testing and external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        savePDF,
        FontManager,
        CoordinateTransformer,
        ColorUtil,
        RedactionRenderer,
        TextRenderer,
        ImageRenderer,
        DrawingRenderer,
        LinkRenderer,
        ErrorCollector,
        Logger,
        SeededRandom,
        ProgressTracker,
    };
}
