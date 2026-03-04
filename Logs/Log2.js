
// ==========================================
// FIREBASE INITIALIZATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBsejOUBpCGAb44FJ1KkzaR05HBCK_oNbY",
    authDomain: "pdf-paid.firebaseapp.com",
    projectId: "pdf-paid",
    storageBucket: "pdf-paid.firebasestorage.app",
    messagingSenderId: "194238529471",
    appId: "1:194238529471:android:dad140450829341edd2b0a",
    databaseURL: "https://pdf-paid-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

// ==========================================
// PAYMENT PLANS
// ==========================================
const PAYMENT_PLANS = {
    plan10: { price: 10, edits: 20, name: 'Basic' },
    plan20: { price: 20, edits: 40, name: 'Popular' },
    plan30: { price: 30, edits: 60, name: 'Standard' },
    plan40: { price: 40, edits: 80, name: 'Pro' },
    plan50: { price: 50, edits: 100, name: 'Business' },
    plan100: { price: 100, edits: 200, name: 'Premium' },
    plan500: { price: 500, edits: 1000, name: 'Ultimate' }
};

const UPI_OPTIONS = {
    googlepay: { name: 'Google Pay', id: 'arunkumar6456435@okicici' },
    phonepe: { name: 'PhonePe', id: 'vipteammodvip@ybl' }
};

const ADMIN_EMAIL = 'arun@gmail.com';

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let isOnline = navigator.onLine;
let connectionCheckInterval;
let pdfDoc = null;
let pageNum = 1;
let pageCount = 1;
let scale = 2.16;
let minZoom = 0.5;
let maxZoom = 5.0;
let allPageEdits = {};
let pendingAddNewImage = false;
let textItems = [];
let imageItems = [];
let textBoxes = [];
let imageBoxes = [];
let currentViewport = null;
let originalPageSize = { width: 0, height: 0 };
let currentEditingTextItem = null;
let currentEditingTextBox = null;
let currentEditingImageItem = null;
let currentEditingOverlay = null;
let currentBgColor = '#ffffff';
let currentTextColor = '#000000';
let currentFontSize = 16;
let currentTextBold = false;
let currentTextThin = false;
let currentFontFamily = 'Roboto';
let isBgTransparent = false;
let currentYAdjust = 0;
let currentCoverHeight = 0;
let currentCoverY = 0;
let currentBoldThickness = 1.0;
let originalTextStyles = {};
let formFields = {};
let editInProgress = false;

let watermarkSettings = {
    enabled: false,
    text: 'FREE VERSION - PDF EDITOR',
    fontSize: 72,
    opacity: 0.3,
    color: '#ff0000',
    angle: 45,
    position: 'diagonal',
    pattern: 'single',
    outline: true,
    outlineColor: '#ffffff'
};

// Highlight mode variables
let overlayMode = null;
let isHighlighting = false;
let highlightStart = null;
let currentHighlightEl = null;

// Search highlight settings
let searchHighlightSettings = {
    keywords: [],
    colors: ['#ffeb3b', '#ff5722', '#2196f3', '#4caf50', '#9c27b0', '#ff9800'],
    opacity: 0.4,
    thickness: 24
};

// Write text settings
let writeTextSettings = {
    text: '',
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: '400',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    bgColor: 'transparent',
    alignment: 'left',
    verticalAlign: 'middle',
    rotation: 0,
    opacity: 1,
    letterSpacing: 0,
    lineHeight: 1.2,
    shadow: false,
    shadowColor: '#000000',
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    border: false,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 5
};

function createOverlayBoxes() { return; }

// DOM Elements
const pdfCanvas = document.getElementById('pdf-canvas');
const editCanvas = document.getElementById('edit-canvas');
const pdfCtx = pdfCanvas ? pdfCanvas.getContext('2d') : null;
const editCtx = editCanvas ? editCanvas.getContext('2d') : null;
const pdfContainer = document.getElementById('pdf-container');
const canvasWrapper = document.getElementById('canvas-wrapper');
const pdfPage = document.getElementById('pdf-page');
const loadingOverlay = document.getElementById('loading-overlay');
const notification = document.getElementById('notification');
const editDialog = document.getElementById('edit-dialog');
const dialogInput = document.getElementById('dialog-input');
const dialogSave = document.getElementById('dialog-save');
const dialogCancel = document.getElementById('dialog-cancel');
const textColorInput = document.getElementById('text-color');
const bgColorInput = document.getElementById('bg-color');
const fontSizeInput = document.getElementById('font-size-input');
const transparentToggle = document.getElementById('transparent-toggle');
const pickBgBtn = document.getElementById('pick-bg-btn');
const boldBtn = document.getElementById('bold-btn');
const thinBtn = document.getElementById('thin-btn');
const fontSelect = document.getElementById('font-select');
const qualitySelect = document.getElementById('quality-select');
const imageInput = document.getElementById('image-input');
const yAdjustSlider = document.getElementById('y-adjust-slider');
const yAdjustValue = document.getElementById('y-adjust-value');
const coverHeightSlider = document.getElementById('cover-height-slider');
const coverHeightValue = document.getElementById('cover-height-value');
const coverYSlider = document.getElementById('cover-y-slider');
const coverYValue = document.getElementById('cover-y-value');
const boldThicknessSlider = document.getElementById('bold-thickness-slider');
const boldThicknessValue = document.getElementById('bold-thickness-value');
const openPdfBtn = document.getElementById('open-pdf-btn');
const pdfFileInput = document.getElementById('pdf-file-input');

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (card.classList.contains('locked')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                showPaymentDialog();
                return false;
            }
        }, true);
    });
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function isAdmin(user) {
    return user && user.email === ADMIN_EMAIL;
}

function isPremiumUser(user) {
    if (!user) return false;
    if (user.email === ADMIN_EMAIL) return true;
    if (user.isPremium) return true;
    if (user.toolsUnlockedPercent && Number(user.toolsUnlockedPercent) >= 100) return true;
    return false;
}

function clearPageHighlights() {
    if (!allPageEdits[pageNum]) return;
    if (allPageEdits[pageNum].overlays) {
        allPageEdits[pageNum].overlays = allPageEdits[pageNum].overlays.filter(ov => ov.type !== 'highlight');
    }
}

function clearAllHighlights() {
    Object.keys(allPageEdits).forEach(pageKey => {
        if (allPageEdits[pageKey] && allPageEdits[pageKey].overlays) {
            allPageEdits[pageKey].overlays = allPageEdits[pageKey].overlays.filter(ov => ov.type !== 'highlight');
        }
    });
}

// ==========================================
// ADVANCED TOOLS MANAGEMENT
// ==========================================
function updateAdvancedToolsAccess(userData) {
    const toolCards = Array.from(document.querySelectorAll('.tool-card'));
    const isPremium = userData && userData.isPremium;
    let percent = 0;
    if (userData) {
        percent = userData.toolsUnlockedPercent || 0;
        if ((!percent || percent === 0) && userData.lastPurchaseAmount) {
            const amt = Number(userData.lastPurchaseAmount) || 0;
            if (amt >= 500) percent = 100;
            else if (amt >= 100) percent = 50;
        }
    }

    if (isPremium || percent >= 100) {
        checkPurchaseAndUnlock(userData);
        return;
    }

    if (percent > 0 && toolCards.length > 0) {
        unlockPercentageTools(percent);
        return;
    }

    lockAllTools();
}

function unlockPercentageTools(percent) {
    const toolCards = Array.from(document.querySelectorAll('.tool-card')).filter(card => card.getAttribute('data-tool') !== 'draw-highlight');
    if (toolCards.length === 0) return;

    const toUnlock = Math.round((percent / 100) * toolCards.length);
    toolCards.forEach((card, idx) => {
        if (idx < toUnlock) card.classList.remove('locked');
        else card.classList.add('locked');
    });

    showNotification(`✓ ${percent}% of advanced tools unlocked!`);
}

function enableAdvancedTool(toolName) {
    const tool = document.querySelector(`[data-tool="${toolName}"]`);
    if (tool) {
        tool.classList.remove('locked');
        showNotification(`${toolName} tool unlocked!`);
    }
}

function showAdvancedToolsPanel() {
    const panel = document.getElementById('advanced-tools-panel');
    if (panel) panel.classList.remove('hidden');
}

function hideAdvancedToolsPanel() {
    const panel = document.getElementById('advanced-tools-panel');
    if (panel) panel.classList.add('hidden');
}

function startConnectionMonitoring() {
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    
    connectionCheckInterval = setInterval(() => {
        const wasOnline = isOnline;
        isOnline = navigator.onLine;
        
        if (wasOnline !== isOnline) {
            if (isOnline) {
                showNotification('Connection restored', false);
                enableEditing();
            } else {
                showNotification('Connection lost', true);
                disableEditing();
            }
        }
    }, 3000);
    
    window.addEventListener('online', () => {
        isOnline = true;
        showNotification('Connection restored', false);
        enableEditing();
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showNotification('Connection lost', true);
        disableEditing();
    });
}

function disableEditing() {
    const buttons = ['save-btn', 'open-pdf-btn', 'dialog-save', 'prev-page', 'next-page', 'zoom-in', 'zoom-out'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
    
    textBoxes.forEach(box => {
        box.style.pointerEvents = 'none';
        box.style.opacity = '0.5';
    });
    
    imageBoxes.forEach(box => {
        box.style.pointerEvents = 'none';
        box.style.opacity = '0.5';
    });
}

function enableEditing() {
    const user = auth.currentUser;
    if (!user) return;
    
    getRemainingEdits(user).then(() => {
        const buttons = ['save-btn', 'open-pdf-btn', 'dialog-save', 'prev-page', 'next-page', 'zoom-in', 'zoom-out'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
        
        textBoxes.forEach(box => {
            box.style.pointerEvents = 'auto';
            box.style.opacity = '1';
        });
        
        imageBoxes.forEach(box => {
            box.style.pointerEvents = 'auto';
            box.style.opacity = '1';
        });
    });
}

function showNotification(message, isPersistent = false) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationCancel = document.getElementById('notification-cancel');
    
    if (notification && notificationMessage) {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        notification.classList.remove('error', 'warning');
        
        if (message.includes('Error') || message.includes('failed') || message.includes('No internet')) {
            notification.classList.add('error');
        } else if (message.includes('limit') || message.includes('Limit')) {
            notification.classList.add('warning');
        }
        
        if (notificationCancel) {
            if (isPersistent) {
                notificationCancel.style.display = 'block';
            } else {
                notificationCancel.style.display = 'none';
                setTimeout(() => notification.classList.remove('show'), 3000);
            }
        }
    }
}

function cancelNotification() {
    const notification = document.getElementById('notification');
    if (notification) notification.classList.remove('show');
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.toggle('show', show);
}

// ==========================================
// PROFESSIONAL DIALOG SYSTEM
// ==========================================
function createProfessionalDialog() {
    if (document.getElementById('professional-dialog')) return;
    
    const dialogHTML = `
        <div id="professional-dialog" class="professional-dialog" style="display: none;">
            <div class="dialog-content">
                <div class="dialog-icon" id="dialog-icon"></div>
                <h3 class="dialog-title" id="dialog-title">Information</h3>
                <p class="dialog-message" id="dialog-message"></p>
                <div class="dialog-progress" id="dialog-progress" style="display: none;">
                    <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
                    <div class="progress-text" id="progress-text"></div>
                </div>
                <div class="dialog-buttons" id="dialog-buttons">
                    <button class="dialog-btn-ok" id="dialog-ok-btn">OK</button>
                    <button class="dialog-btn-buy" id="dialog-buy-btn"><i class="fas fa-coins"></i> Buy Edits</button>
                </div>
                <button class="dialog-close" id="dialog-close"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = dialogHTML;
    document.body.appendChild(container.firstElementChild);
    
    document.getElementById('dialog-close').addEventListener('click', hideProfessionalDialog);
    document.getElementById('dialog-ok-btn').addEventListener('click', hideProfessionalDialog);
    document.getElementById('dialog-buy-btn').addEventListener('click', () => {
        hideProfessionalDialog();
        showPaymentDialog();
    });
    
    document.getElementById('professional-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('professional-dialog')) hideProfessionalDialog();
    });
}

function showProfessionalDialog(options = {}) {
    const { type = 'info', title = 'Information', message = '', showProgress = false, progressValue = 0, progressMax = 2, showBuyButton = true } = options;
    
    let dialog = document.getElementById('professional-dialog');
    if (!dialog) { createProfessionalDialog(); dialog = document.getElementById('professional-dialog'); }
    
    const iconMap = { 
        info: '<i class="fas fa-info-circle" style="color: var(--primary);"></i>', 
        success: '<i class="fas fa-check-circle" style="color: var(--success);"></i>', 
        warning: '<i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>', 
        error: '<i class="fas fa-times-circle" style="color: var(--danger);"></i>', 
        limit: '<i class="fas fa-chart-line" style="color: var(--warning);"></i>', 
        premium: '<i class="fas fa-crown" style="color: var(--warning);"></i>' 
    };
    document.getElementById('dialog-icon').innerHTML = iconMap[type] || iconMap.info;
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-message').textContent = message;
    
    const progressDiv = document.getElementById('dialog-progress');
    if (showProgress) {
        progressDiv.style.display = 'block';
        const percentage = (progressValue / progressMax) * 100;
        document.getElementById('progress-fill').style.width = percentage + '%';
        document.getElementById('progress-text').textContent = `${progressValue} of ${progressMax} edits used`;
    } else {
        progressDiv.style.display = 'none';
    }
    
    document.getElementById('dialog-buy-btn').style.display = showBuyButton ? 'block' : 'none';
    dialog.style.display = 'flex';
}

function hideProfessionalDialog() {
    const dialog = document.getElementById('professional-dialog');
    if (dialog) dialog.style.display = 'none';
}

// ==========================================
// CUSTOM DIALOG CREATOR
// ==========================================
function createCustomDialog(options = {}) {
    const {
        title = 'Dialog',
        icon = 'fas fa-cog',
        content = '',
        width = '600px',
        onSave = null,
        onCancel = null,
        saveText = 'Save',
        cancelText = 'Cancel',
        showSave = true,
        showCancel = true
    } = options;

    // Remove existing dialog
    const existingOverlay = document.querySelector('.custom-dialog-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
        <div class="custom-dialog" style="max-width: ${width}">
            <div class="custom-dialog-header">
                <h3><i class="${icon}"></i> ${title}</h3>
                <button class="custom-dialog-close">&times;</button>
            </div>
            <div class="custom-dialog-body">
                ${content}
            </div>
            <div class="custom-dialog-footer">
                ${showCancel ? `<button class="custom-dialog-btn custom-dialog-btn-secondary cancel-btn">${cancelText}</button>` : ''}
                ${showSave ? `<button class="custom-dialog-btn custom-dialog-btn-primary save-btn">${saveText}</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    const closeBtn = overlay.querySelector('.custom-dialog-close');
    const cancelBtn = overlay.querySelector('.cancel-btn');
    const saveBtn = overlay.querySelector('.save-btn');

    const closeDialog = () => overlay.remove();

    closeBtn.addEventListener('click', closeDialog);
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        closeDialog();
    });
    if (saveBtn) saveBtn.addEventListener('click', () => {
        if (onSave) onSave();
        closeDialog();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
    });

    return overlay;
}

// ==========================================
// PAYMENT SYSTEM
// ==========================================
function createPaymentDialog() {
    if (document.getElementById('payment-dialog')) return;
    
    const dialogHTML = `
        <div id="payment-dialog" class="payment-dialog" style="display: none;">
            <div class="payment-content">
                <div class="payment-header">
                    <h2><i class="fas fa-coins"></i> Buy Edits</h2>
                    <button class="payment-close" id="payment-close"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="payment-plans" id="payment-plans"></div>
                
                <div class="payment-upi" id="payment-upi" style="display: none;">
                    <h3>Pay via UPI</h3>
                    <div class="upi-options" id="upi-options"></div>
                    <div class="selected-upi" id="selected-upi"></div>
                </div>
                
                <div class="payment-screenshot" id="payment-screenshot" style="display: none;">
                    <h3>Upload Payment Screenshot</h3>
                    <div class="screenshot-preview" id="screenshot-preview"></div>
                    <input type="file" id="screenshot-input" accept="image/*" style="display: none;">
                    <button id="upload-screenshot-btn"><i class="fas fa-camera"></i> Choose Screenshot</button>
                    <p class="screenshot-info">Max size: 5MB (JPEG/PNG)</p>
                </div>
                <br><br><br><br><br><br>
                <div class="payment-actions" id="payment-actions" style="display: none;">
                    <button class="payment-btn payment-back" id="payment-back"><i class="fas fa-arrow-left"></i> Back</button>
                    <button class="payment-btn payment-submit" id="payment-submit"><i class="fas fa-check"></i> Submit Payment</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = dialogHTML;
    document.body.appendChild(container.firstElementChild);
    
    document.getElementById('payment-close').addEventListener('click', hidePaymentDialog);
    document.getElementById('upload-screenshot-btn').addEventListener('click', () => {
        document.getElementById('screenshot-input').click();
    });
    
    document.getElementById('screenshot-input').addEventListener('change', handleScreenshotUpload);
    document.getElementById('payment-submit').addEventListener('click', submitPayment);
    document.getElementById('payment-back').addEventListener('click', showPaymentPlans);
    
    document.getElementById('payment-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('payment-dialog')) hidePaymentDialog();
    });
}

function showPaymentDialog() {
    let dialog = document.getElementById('payment-dialog');
    if (!dialog) { createPaymentDialog(); dialog = document.getElementById('payment-dialog'); }
    
    dialog.style.display = 'flex';
    showPaymentPlans();
}

function hidePaymentDialog() {
    const dialog = document.getElementById('payment-dialog');
    if (dialog) dialog.style.display = 'none';
}

function showPaymentPlans() {
    document.getElementById('payment-plans').style.display = 'grid';
    document.getElementById('payment-upi').style.display = 'none';
    document.getElementById('payment-screenshot').style.display = 'none';
    document.getElementById('payment-actions').style.display = 'none';
    
    const plansContainer = document.getElementById('payment-plans');
    plansContainer.innerHTML = '';
    
    Object.entries(PAYMENT_PLANS).forEach(([key, plan]) => {
        const planCard = document.createElement('div');
        planCard.className = `plan-card ${key === 'plan20' ? 'popular' : ''}`;
        planCard.innerHTML = `
            <div class="plan-price"><i class="fas fa-rupee-sign"></i>${plan.price}</div>
            <div class="plan-edits">${plan.edits} Edits</div>
            <div class="plan-name">${plan.name}</div>
            ${key === 'plan20' ? '<div class="popular-tag"><i class="fas fa-fire"></i> Popular</div>' : ''}
        `;
        planCard.addEventListener('click', (e) => selectPlan(key, e));
        plansContainer.appendChild(planCard);
    });
}

let selectedPlan = null;
let selectedUPI = null;
let screenshotData = null;

function selectPlan(planKey, event) {
    selectedPlan = PAYMENT_PLANS[planKey];
    
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    document.getElementById('payment-plans').style.display = 'none';
    document.getElementById('payment-upi').style.display = 'block';
    
    const upiOptions = document.getElementById('upi-options');
    upiOptions.innerHTML = '';
    
    Object.entries(UPI_OPTIONS).forEach(([key, upi]) => {
        const option = document.createElement('div');
        option.className = 'upi-option';
        option.innerHTML = `<strong>${upi.name}</strong><br><small>${upi.id}</small>`;
        option.addEventListener('click', (e) => selectUPI(key, e));
        upiOptions.appendChild(option);
    });
}

function selectUPI(upiKey, event) {
    selectedUPI = UPI_OPTIONS[upiKey];
    
    document.querySelectorAll('.upi-option').forEach(o => o.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    document.getElementById('selected-upi').innerHTML = `<strong>Pay to:</strong> ${selectedUPI.name}<br><span style="font-size: 1.1rem; color: var(--dark);">${selectedUPI.id}</span>`;
    
    document.getElementById('payment-screenshot').style.display = 'block';
    document.getElementById('payment-actions').style.display = 'flex';
}

function handleScreenshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File too large. Max 5MB', true);
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', true);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        screenshotData = event.target.result;
        const preview = document.getElementById('screenshot-preview');
        preview.innerHTML = `<img src="${screenshotData}" alt="Screenshot Preview">`;
    };
    reader.readAsDataURL(file);
}

async function submitPayment() {
    if (!selectedPlan || !selectedUPI || !screenshotData) {
        showNotification('Please complete all steps', true);
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please login first', true);
        return;
    }
    
    showLoading(true);
    
    try {
        const paymentData = {
            userId: user.uid,
            userEmail: user.email,
            plan: selectedPlan,
            upi: selectedUPI,
            screenshot: screenshotData,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        await database.ref('payments/' + Date.now()).set(paymentData);
        
        showProfessionalDialog({
            type: 'success',
            title: 'Payment Submitted',
            message: `Your payment of ${selectedPlan.price} for ${selectedPlan.edits} edits has been submitted for approval.\n\nAdmin will verify and add credits within 24 hours.`,
            showBuyButton: false
        });
        
        hidePaymentDialog();
        
        selectedPlan = null;
        selectedUPI = null;
        screenshotData = null;
        
    } catch (error) {
        console.error('Payment submission error:', error);
        showNotification('Error submitting payment: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

// ==========================================
// ADMIN APPROVAL PANEL
// ==========================================
function createAdminPanel() {
    if (document.getElementById('admin-panel')) return;
    
    const panelHTML = `
        <div id="admin-panel" class="admin-panel" style="display: none;">
            <div class="admin-content">
                <div class="admin-header">
                    <h2><i class="fas fa-crown"></i> Admin Approval Panel</h2>
                    <button class="admin-close" id="admin-close"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="admin-stats" id="admin-stats"></div>
                
                <div class="admin-payments" id="admin-payments"></div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = panelHTML;
    document.body.appendChild(container.firstElementChild);
    
    document.getElementById('admin-close').addEventListener('click', hideAdminPanel);
}

function showAdminPanel() {
    const user = auth.currentUser;
    if (!isAdmin(user)) {
        showNotification('Admin access only', true);
        return;
    }
    
    let panel = document.getElementById('admin-panel');
    if (!panel) { createAdminPanel(); panel = document.getElementById('admin-panel'); }
    
    panel.style.display = 'flex';
    loadPendingPayments();
}

function hideAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) panel.style.display = 'none';
}

async function loadPendingPayments() {
    try {
        const snapshot = await database.ref('payments').once('value');
        const payments = snapshot.val() || {};
        
        updateAdminStats(payments);
        
        const container = document.getElementById('admin-payments');
        container.innerHTML = '';
        
        const paymentsArray = Object.entries(payments).map(([id, data]) => ({ id, ...data }));
        const pendingPayments = paymentsArray.filter(p => p.status === 'pending');
        
        if (pendingPayments.length === 0) {
            container.innerHTML = '<div class="no-payments"><i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i><br>No pending payments</div>';
            return;
        }
        
        pendingPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        pendingPayments.forEach(payment => {
            const paymentEl = document.createElement('div');
            paymentEl.className = 'payment-item';
            paymentEl.innerHTML = `
                <div class="payment-header-info">
                    <span class="payment-user"><i class="fas fa-user"></i> ${payment.userEmail}</span>
                    <span class="payment-status status-pending">Pending</span>
                </div>
                <div class="payment-details">
                    <div><i class="fas fa-rupee-sign"></i> ${payment.plan.price}</div>
                    <div><i class="fas fa-edit"></i> ${payment.plan.edits} edits</div>
                    <div><i class="fas fa-mobile-alt"></i> ${payment.upi.name}</div>
                </div>
                <div class="payment-details">
                    <div>UPI ID: ${payment.upi.id}</div>
                    <div>Time: ${new Date(payment.timestamp).toLocaleString()}</div>
                </div>
                <img class="payment-screenshot" src="${payment.screenshot}" alt="Payment Screenshot" onclick="window.open(this.src, '_blank')">
                <div class="payment-actions">
                    <button class="action-btn approve-btn" onclick="approvePayment('${payment.id}', '${payment.userId}', ${payment.plan.edits})"><i class="fas fa-check"></i> Approve</button>
                    <button class="action-btn reject-btn" onclick="rejectPayment('${payment.id}')"><i class="fas fa-times"></i> Reject</button>
                </div>
            `;
            container.appendChild(paymentEl);
        });
        
    } catch (error) {
        console.error('Error loading payments:', error);
        showNotification('Error loading payments', true);
    }
}

function updateAdminStats(payments) {
    const paymentsArray = Object.values(payments);
    const totalPayments = paymentsArray.length;
    const pendingCount = paymentsArray.filter(p => p.status === 'pending').length;
    const approvedCount = paymentsArray.filter(p => p.status === 'approved').length;
    const totalRevenue = paymentsArray.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.plan.price, 0);
    
    document.getElementById('admin-stats').innerHTML = `
        <div class="admin-stat-card">
            <div class="admin-stat-value">${totalPayments}</div>
            <div class="admin-stat-label">Total Payments</div>
        </div>
        <div class="admin-stat-card">
            <div class="admin-stat-value">${pendingCount}</div>
            <div class="admin-stat-label">Pending</div>
        </div>
        <div class="admin-stat-card">
            <div class="admin-stat-value">${totalRevenue}</div>
            <div class="admin-stat-label">Revenue</div>
        </div>
    `;
}

// ==========================================
// SECURE UNLOCK CHECK
// ==========================================
function checkPurchaseAndUnlock(userData) {
    if (!userData) {
        lockAllTools();
        return;
    }

    const amount = Number(userData.lastPurchaseAmount) || 0;

    if (amount >= 500) {
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            if (card.getAttribute('data-tool') !== 'draw-highlight') {
                card.classList.remove('locked');
            }
        });

        userData.isPremium = true;
        userData.toolsUnlockedPercent = 100;
        console.log("Full Premium Activated (100%)");
        return;
    }

    if (amount >= 200) {
        unlockPercentageTools(50);
        userData.isPremium = false;
        userData.toolsUnlockedPercent = 50;
        console.log("Half Premium Activated (50%)");
        return;
    }

    lockAllTools();
    console.log("No valid purchase — all tools locked");
}

function lockAllTools() {
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        if (card.getAttribute('data-tool') !== 'draw-highlight') {
            card.classList.add('locked');
        }
    });
}

function unlockSpecificTool(toolName) {
    const tool = document.querySelector(`[data-tool="${toolName}"]`);
    if (tool) {
        tool.classList.remove('locked');
        showNotification(`✓ ${toolName} tool unlocked!`);
    }
}

function lockSpecificTool(toolName) {
    const tool = document.querySelector(`[data-tool="${toolName}"]`);
    if (tool) {
        tool.classList.add('locked');
    }
}

function updateToolUnlockStatus(isPremium = false) {
    if (isPremium) {
        checkPurchaseAndUnlock(userData);
    } else {
        lockAllTools();
    }
}

async function saveToolsAccessToDatabase(userId, isPremium, toolsUnlockedPercent = 0) {
    try {
        const userRef = database.ref('users/' + userId);
        await userRef.update({
            isPremium: !!isPremium,
            toolsUnlockedPercent: toolsUnlockedPercent || 0,
            toolsUnlockedDate: (isPremium || (toolsUnlockedPercent && toolsUnlockedPercent > 0)) ? new Date().toISOString() : null
        });
        console.log('Tools access saved to database');
    } catch (error) {
        console.error('Error saving tools access:', error);
    }
}

async function checkAndUpdateToolsAccess(userId) {
    try {
        const userRef = database.ref('users/' + userId);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};

        updateAdvancedToolsAccess(userData);

        const isPremium = !!(userData.isPremium || (userData.toolsUnlockedPercent && userData.toolsUnlockedPercent >= 100));
        return isPremium;
    } catch (error) {
        console.error('Error checking tools access:', error);
        return false;
    }
}

async function approvePayment(paymentId, userId, editsToAdd) {
    try {
        showLoading(true);

        await database.ref('payments/' + paymentId).update({ status: 'approved' });

        const paymentSnap = await database.ref('payments/' + paymentId).once('value');
        const payment = paymentSnap.val() || {};
        const price = (payment.plan && payment.plan.price) ? Number(payment.plan.price) : 0;

        const userRef = database.ref('users/' + userId);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };

        const currentMaxEdits = userData.maxEdits || 10;
        const newMaxEdits = currentMaxEdits + editsToAdd;

        let isPremiumFlag = false;
        let unlockPercent = 0;
        if (price >= 500) {
            isPremiumFlag = true;
            unlockPercent = 100;
        } else if (price >= 100) {
            isPremiumFlag = false;
            unlockPercent = 50;
        }

        await userRef.update({
            maxEdits: newMaxEdits,
            lastPurchase: new Date().toISOString(),
            lastPurchaseAmount: price,
            isPremium: !!isPremiumFlag,
            toolsUnlockedPercent: unlockPercent,
            toolsUnlockedDate: (isPremiumFlag || unlockPercent > 0) ? new Date().toISOString() : null
        });

        if (isPremiumFlag) {
            checkPurchaseAndUnlock(userData);
        } else if (unlockPercent > 0) {
            unlockPercentageTools(unlockPercent);
        } else {
            lockAllTools();
        }

        if (isPremiumFlag) {
            showProfessionalDialog({
                type: 'success',
                title: 'Payment Approved',
                message: `${editsToAdd} edits added to user account.\nNew total: ${newMaxEdits} edits\n\n✓ All advanced tools unlocked!`,
                showBuyButton: false
            });
        } else if (unlockPercent === 50) {
            showProfessionalDialog({
                type: 'success',
                title: 'Payment Approved',
                message: `${editsToAdd} edits added to user account.\nNew total: ${newMaxEdits} edits\n\n✓ 50% of advanced tools unlocked for this user.`,
                showBuyButton: false
            });
        } else {
            showProfessionalDialog({
                type: 'success',
                title: 'Payment Approved',
                message: `${editsToAdd} edits added to user account.\nNew total: ${newMaxEdits} edits`,
                showBuyButton: false
            });
        }

        loadPendingPayments();

    } catch (error) {
        console.error('Error approving payment:', error);
        showNotification('Error approving payment', true);
    } finally {
        showLoading(false);
    }
}

async function rejectPayment(paymentId) {
    try {
        showLoading(true);
        
        await database        .ref('payments/' + paymentId).update({ status: 'rejected' });
        
        showProfessionalDialog({
            type: 'warning',
            title: 'Payment Rejected',
            message: 'Payment has been rejected',
            showBuyButton: false
        });
        
        loadPendingPayments();
        
    } catch (error) {
        console.error('Error rejecting payment:', error);
        showNotification('Error rejecting payment', true);
    } finally {
        showLoading(false);
    }
}

// ==========================================
// USER CREDIT SYSTEM
// ==========================================
async function initializeUserEditCount(user) {
    if (!user || isAdmin(user)) return;

    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
        // New user
        await userRef.set({
            email: user.email || null,
            editCount: 0,
            maxEdits: 10,
            createdAt: new Date().toISOString(),
            lastEdit: null
        });
    } else {
        // Existing user
        const data = snapshot.val();

        if (data.maxEdits === undefined) {
            await userRef.update({
                maxEdits: 10
            });
        }
    }
}

async function getRemainingEdits(user) {
    if (!user) return 0;
    if (isAdmin(user)) return 'Unlimited';
    
    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };
    
    return userData.maxEdits - userData.editCount;
}

async function canUserEdit(user) {
    if (!user) return false;
    if (isAdmin(user)) return true;
    
    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };
    
    return userData.editCount < userData.maxEdits;
}

async function incrementEditCount(user) {
    if (!user) return false;
    if (isAdmin(user)) return true;
    
    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };
    
    if (userData.editCount < userData.maxEdits) {
        const newCount = userData.editCount + 1;
        await userRef.update({
            editCount: newCount,
            lastEdit: new Date().toISOString()
        });
        
        const updatedData = { ...userData, editCount: newCount, email: user.email };
        updateUserDashboard(updatedData);
        
        return true;
    }
    return false;
}

// ==========================================
// PDF EDITOR CORE FUNCTIONS
// ==========================================
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    if (openPdfBtn && pdfFileInput) {
        openPdfBtn.addEventListener('click', async () => {
            if (!isOnline) {
                showNotification('No internet connection. Please check your network.', true);
                return;
            }
            if (!await checkEditLimitBeforeAction()) return;
            pdfFileInput.click();
        });
        pdfFileInput.addEventListener('change', handleFileUpload);
    }

    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    
    if (prevPage) prevPage.addEventListener('click', () => { 
        if (!isOnline) { showNotification('No internet connection', true); return; }
        if (pageNum > 1) { pageNum--; renderPage(pageNum); }
    });
    
    if (nextPage) nextPage.addEventListener('click', () => { 
        if (!isOnline) { showNotification('No internet connection', true); return; }
        if (pageNum < pageCount) { pageNum++; renderPage(pageNum); }
    });
    
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    
    if (zoomIn) zoomIn.addEventListener('click', () => { scale = Math.min(scale * 1.2, maxZoom); renderPage(pageNum); });
    if (zoomOut) zoomOut.addEventListener('click', () => { scale = Math.max(scale / 1.2, minZoom); renderPage(pageNum); });
    
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!isOnline) { showNotification('No internet connection. Cannot save PDF.', true); return; }
            if (!await checkEditLimitBeforeAction()) return;
            await savePDF();
        });
    }
    
    const fscreenBtn = document.getElementById('FScreen-btn');
    if (fscreenBtn) {
        fscreenBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((e) => console.error(e));
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }
    
    if (imageInput) imageInput.addEventListener('change', handleImageSelect);
    
    if (dialogSave) {
        dialogSave.addEventListener('click', async () => {
            if (!isOnline) { showNotification('No internet connection', true); closeDialog(); return; }
            if (!await checkEditLimitBeforeAction()) { closeDialog(); return; }
            await saveDialogText();
        });
    }
    if (dialogCancel) dialogCancel.addEventListener('click', closeDialog);
    
    if (dialogInput) {
        dialogInput.addEventListener('keydown', async (e) => { 
            if (e.key === 'Enter') {
                if (!isOnline) { showNotification('No internet connection', true); closeDialog(); return; }
                if (!await checkEditLimitBeforeAction()) { closeDialog(); return; }
                await saveDialogText();
            } else if (e.key === 'Escape') closeDialog();
        });
    }
    
    if (textColorInput) textColorInput.addEventListener('input', (e) => { currentTextColor = e.target.value; previewChanges(); });
    if (fontSizeInput) fontSizeInput.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value) || 12; previewChanges(); });
    
    if (yAdjustSlider) yAdjustSlider.addEventListener('input', (e) => { currentYAdjust = parseInt(e.target.value); if (yAdjustValue) yAdjustValue.textContent = currentYAdjust; previewChanges(); });
    if (coverHeightSlider) coverHeightSlider.addEventListener('input', (e) => { currentCoverHeight = parseInt(e.target.value); if (coverHeightValue) coverHeightValue.textContent = currentCoverHeight; previewChanges(); });
    if (coverYSlider) coverYSlider.addEventListener('input', (e) => { currentCoverY = parseInt(e.target.value); if (coverYValue) coverYValue.textContent = currentCoverY; previewChanges(); });
    
    if (boldThicknessSlider) {
        boldThicknessSlider.addEventListener('input', (e) => {
            currentBoldThickness = parseFloat(e.target.value);
            if (boldThicknessValue) boldThicknessValue.textContent = currentBoldThickness.toFixed(1);
            if (!currentTextBold && currentBoldThickness > 1.0) {
                currentTextBold = true;
                currentTextThin = false;
                if (boldBtn) boldBtn.classList.add('active');
                if (thinBtn) thinBtn.classList.remove('active');
            }
            previewChanges();
        });
    }

    if (bgColorInput) bgColorInput.addEventListener('input', (e) => { currentBgColor = e.target.value; isBgTransparent = false; updateTransparentUI(); previewChanges(); });
    if (transparentToggle) transparentToggle.addEventListener('click', () => { isBgTransparent = !isBgTransparent; updateTransparentUI(); previewChanges(); });
    if (pickBgBtn) pickBgBtn.addEventListener('click', pickBackgroundColor);
    
    if (boldBtn) {
        boldBtn.addEventListener('click', () => { 
            currentTextBold = !currentTextBold; 
            boldBtn.classList.toggle('active');
            if (currentTextBold) {
                currentTextThin = false;
                if (thinBtn) thinBtn.classList.remove('active');
                if (currentBoldThickness < 1.0) currentBoldThickness = 1.5;
            } else {
                currentBoldThickness = 1.0;
            }
            if (boldThicknessSlider) boldThicknessSlider.value = currentBoldThickness;
            if (boldThicknessValue) boldThicknessValue.textContent = currentBoldThickness.toFixed(1);
            previewChanges();
        });
    }
    
    if (thinBtn) {
        thinBtn.addEventListener('click', () => { 
            currentTextThin = !currentTextThin; 
            thinBtn.classList.toggle('active');
            if (currentTextThin) {
                currentTextBold = false;
                if (boldBtn) boldBtn.classList.remove('active');
                currentBoldThickness = 0.5;
            } else {
                currentBoldThickness = 1.0;
            }
            if (boldThicknessSlider) boldThicknessSlider.value = currentBoldThickness;
            if (boldThicknessValue) boldThicknessValue.textContent = currentBoldThickness.toFixed(1);
            previewChanges();
        });
    }
    
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => { 
            currentFontFamily = e.target.value;
            if (currentFontFamily === 'Roboto Thin') { currentTextThin = true; currentTextBold = false; currentBoldThickness = 0.5; }
            else if (currentFontFamily === 'Roboto Bold' || currentFontFamily === 'Roboto Black') { currentTextBold = true; currentTextThin = false; currentBoldThickness = 2.0; }
            else { currentTextBold = false; currentTextThin = false; currentBoldThickness = 1.0; }
            if (boldBtn) boldBtn.classList.toggle('active', currentTextBold);
            if (thinBtn) thinBtn.classList.toggle('active', currentTextThin);
            if (boldThicknessSlider) boldThicknessSlider.value = currentBoldThickness;
            if (boldThicknessValue) boldThicknessValue.textContent = currentBoldThickness.toFixed(1);
            previewChanges();
        });
    }
}

async function checkEditLimitBeforeAction() {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please login first');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'flex';
        return false;
    }
    
    if (!isOnline) { showNotification('No internet connection. Please check your network.', true); return false; }
    
    if (isAdmin(user)) return true;
    
    const canEdit = await canUserEdit(user);
    if (!canEdit) {
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || { editCount: 0, maxEdits: 10 };
        
        showProfessionalDialog({
            type: 'warning',
            title: 'Edit Limit Reached',
            message: `You have used all ${userData.maxEdits} edits.\n\nBuy more edits to continue!`,
            showProgress: true,
            progressValue: userData.editCount, // ← FIXED: use editCount, not maxEdits
            progressMax: userData.maxEdits,
            showBuyButton: true
        });
        return false;
    }
    
    return true;
}
function updateTransparentUI() {
    if (!transparentToggle || !bgColorInput) return;
    if (isBgTransparent) { transparentToggle.classList.add('active'); bgColorInput.disabled = true; bgColorInput.style.opacity = 0.5; }
    else { transparentToggle.classList.remove('active'); bgColorInput.disabled = false; bgColorInput.style.opacity = 1; }
}

function previewChanges() {
    if (currentEditingOverlay) {
        const ov = currentEditingOverlay;
        ov.text = dialogInput ? (dialogInput.value || ov.text) : ov.text;
        ov.color = currentTextColor;
        ov.fontFamily = currentFontFamily;
        ov.fontSize = currentFontSize;
        ov.fontWeight = currentTextBold ? '700' : (currentTextThin ? '300' : '400');
        ov.boldThickness = currentBoldThickness;
        ov.bgColor = isBgTransparent ? 'transparent' : currentBgColor;

        const overlays = (allPageEdits[pageNum] && allPageEdits[pageNum].overlays) || [];
        const idx = overlays.indexOf(ov);
        if (idx > -1) {
            const el = document.querySelector(`.overlay-box[data-ov-index="${idx}"]`);
            if (el && ov.type === 'text') {
                const span = el.querySelector('.overlay-text');
                if (span) {
                    span.textContent = ov.text;
                    span.style.color = ov.color || '#000';
                    span.style.fontFamily = ov.fontFamily || 'Roboto';
                    span.style.fontWeight = ov.fontWeight || '400';
                    span.style.fontSize = (ov.fontSize || 16) + 'px';
                }
            }
        }
        redrawEditedContent();
        return;
    }

    if (!currentEditingTextItem) return;
    if (dialogInput && dialogInput.value) currentEditingTextItem.text = dialogInput.value;
    currentEditingTextItem.color = currentTextColor;
    currentEditingTextItem.fontFamily = currentFontFamily;
    currentEditingTextItem.fontSize = currentFontSize * scale;
    currentEditingTextItem.isBold = currentTextBold;
    currentEditingTextItem.isThin = currentTextThin;
    currentEditingTextItem.boldThickness = currentBoldThickness;
    currentEditingTextItem.yAdjust = currentYAdjust;
    currentEditingTextItem.coverHeight = currentCoverHeight;
    currentEditingTextItem.coverY = currentCoverY;
    currentEditingTextItem.bgColor = isBgTransparent ? 'transparent' : currentBgColor;
    redrawEditedContent();
}

async function handleFileUpload(e) {
    if (!auth.currentUser) {
        showNotification('Please login first');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'flex';
        return;
    }
    
    if (!isOnline) { showNotification('No internet connection. Cannot load PDF.', true); return; }
    
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') { showNotification('Please select a valid PDF file.'); return; }

    showLoading(true);
    showNotification('Loading PDF, please wait...');

    const fileReader = new FileReader();
    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
            window.originalPdfBytes = typedarray;
            
            allPageEdits = {};
            originalTextStyles = {};
            formFields = {};
            imageItems = [];
            imageBoxes = [];
            currentEditingImageItem = null;
            editInProgress = false;
            clearAllHighlights();

            const loadingTask = pdfjsLib.getDocument(typedarray);
            loadingTask.promise.then(function(pdf) {
                pdfDoc = pdf;
                pageCount = pdf.numPages;
                pageNum = 1;
                renderPage(pageNum);
                showNotification(`"${file.name}" loaded successfully.`);
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
                showNotification('Error parsing PDF: ' + error.message);
                showLoading(false);
            });
        } catch (error) {
            console.error('Error processing file:', error);
            showNotification('Error processing file: ' + error.message);
            showLoading(false);
        }
    };
    fileReader.onerror = function() { showNotification('Error reading file.'); showLoading(false); };
    fileReader.readAsArrayBuffer(file);
    e.target.value = '';
}


function extractTextStyles(item) {
    const styles = { color: '#000000', fontFamily: 'Roboto', fontWeight: 'normal', isBold: false, isThin: false };
    if (item.color && Array.isArray(item.color) && item.color.length >= 3) {
        const r = Math.round(item.color[0] * 255), g = Math.round(item.color[1] * 255), b = Math.round(item.color[2] * 255);
        styles.color = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    if (item.fontName) {
        const fontName = item.fontName.toLowerCase();
        if (fontName.includes('helvetica') || fontName.includes('arial')) styles.fontFamily = 'Arial';
        else if (fontName.includes('times')) styles.fontFamily = 'Times New Roman';
        else if (fontName.includes('courier')) styles.fontFamily = 'Courier New';
        if (fontName.includes('bold') || fontName.includes('black')) { styles.fontWeight = 'bold'; styles.isBold = true; }
        else if (fontName.includes('thin') || fontName.includes('light')) { styles.fontWeight = 'thin'; styles.isThin = true; }
    }
    return styles;
}

function createTextBoxes() {
    if (!pdfPage || !canvasWrapper) return;
    const pdfPageRect = pdfPage.getBoundingClientRect();
    const canvasRect = canvasWrapper.getBoundingClientRect();
    textItems.forEach((item) => {
        const textBox = document.createElement('div');
        textBox.className = 'text-box' + (item.edited ? ' edited' : '');
        textBox.dataset.index = item.originalIndex;
        textBox.title = item.text;
        textBox.style.left = ((canvasRect.left - pdfPageRect.left) + item.x) + 'px';
        textBox.style.top = ((canvasRect.top - pdfPageRect.top) + (item.y - item.height)) + 'px';
        textBox.style.width = item.width + 'px';
        textBox.style.height = item.height + 'px';
        textBox.addEventListener('click', async (e) => { 
            e.stopPropagation(); 
            if (!isOnline) { showNotification('No internet connection', true); return; }
            if (!await checkEditLimitBeforeAction()) return;
            editText(item, textBox); 
        });
        pdfPage.appendChild(textBox);
        textBoxes.push(textBox);
    });
}

function createImageBoxes() {
    if (!pdfPage || !canvasWrapper) return;
    const pdfPageRect = pdfPage.getBoundingClientRect();
    const canvasRect = canvasWrapper.getBoundingClientRect();
    imageItems.forEach((item) => {
        const imageBox = document.createElement('div');
        imageBox.className = 'image-box' + (item.edited ? ' edited' : '');
        imageBox.style.left = ((canvasRect.left - pdfPageRect.left) + item.x) + 'px';
        imageBox.style.top = ((canvasRect.top - pdfPageRect.top) + item.y) + 'px';
        imageBox.style.width = item.width + 'px';
        imageBox.style.height = item.height + 'px';
        imageBox.addEventListener('click', async (e) => { 
            e.stopPropagation(); 
            if (!isOnline) { showNotification('No internet connection', true); return; }
            if (!await checkEditLimitBeforeAction()) return;
            replaceImage(item, imageBox); 
        });
        pdfPage.appendChild(imageBox);
        imageBoxes.push(imageBox);
    });
}

function replaceImage(imageItem, imageBoxElement) {
    currentEditingImageItem = { ...imageItem, box: imageBoxElement };
    if (imageInput) imageInput.click();
}

async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (!isOnline) { showNotification('No internet connection', true); return; }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const imageData = event.target.result;

        if (pendingAddNewImage) {
            pendingAddNewImage = false;
            if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
            const pageEdits = allPageEdits[pageNum];
            pageEdits.overlays = pageEdits.overlays || [];
            pageEdits.overlays.push({ type: 'image', data: imageData, xFrac: 0.2, yFrac: 0.2, wFrac: 0.5, hFrac: 0.3 });
            createOverlayBoxes();
            showNotification('Image added to page — drag/resize it now');
            if (imageInput) imageInput.value = '';
            return;
        }

        if (!currentEditingImageItem) return;
        if (!currentEditingImageItem.edited && auth.currentUser) {
            const incremented = await incrementEditCount(auth.currentUser);
            if (!incremented && !isAdmin(auth.currentUser)) { showNotification('Edit limit reached!', true); return; }
        }
        const itemIndex = currentEditingImageItem.index;
        if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
        const pageEdits = allPageEdits[pageNum];
        const existingImageEdit = pageEdits.images.find(edit => edit.index === itemIndex);
        if (existingImageEdit) existingImageEdit.data = imageData;
        else pageEdits.images.push({ index: itemIndex, data: imageData });
        const imageItem = imageItems.find(item => item.index === itemIndex);
        if (imageItem) { imageItem.edited = true; imageItem.newImageData = imageData; }
        redrawEditedContent();
        if (currentEditingImageItem.box) currentEditingImageItem.box.classList.add('edited');
        showNotification('Image replaced and saved.');
    };
    reader.readAsDataURL(file);
    if (imageInput) imageInput.value = '';
}

function clearTextBoxes() { textBoxes.forEach(textBox => textBox.remove()); textBoxes = []; }
function clearImageBoxes() { imageBoxes.forEach(box => { if (box && box.parentNode) box.parentNode.removeChild(box); }); imageBoxes = []; document.querySelectorAll('.image-box').forEach(box => box.remove()); currentEditingImageItem = null; }

function editText(textItem, textBoxElement) {
    if (!textItem) return;
    if (currentEditingTextItem === textItem) return;
    currentEditingTextItem = textItem;
    currentEditingTextBox = textBoxElement;
    if (dialogInput) dialogInput.value = textItem.text;
    if (textColorInput) textColorInput.value = textItem.color;
    let displaySize = Math.round(textItem.fontSize / scale);
    if (displaySize < 4) displaySize = 12;
    if (fontSizeInput) fontSizeInput.value = displaySize;
    currentFontSize = displaySize;
    currentYAdjust = textItem.yAdjust || 0;
    if (yAdjustSlider) yAdjustSlider.value = currentYAdjust;
    if (yAdjustValue) yAdjustValue.textContent = currentYAdjust;
    currentCoverHeight = textItem.coverHeight || 0;
    if (coverHeightSlider) coverHeightSlider.value = currentCoverHeight;
    if (coverHeightValue) coverHeightValue.textContent = currentCoverHeight;
    currentCoverY = textItem.coverY || 0;
    if (coverYSlider) coverYSlider.value = currentCoverY;
    if (coverYValue) coverYValue.textContent = currentCoverY;
    currentBoldThickness = textItem.boldThickness !== undefined ? textItem.boldThickness : 1.0;
    if (boldThicknessSlider) boldThicknessSlider.value = currentBoldThickness;
    if (boldThicknessValue) boldThicknessValue.textContent = currentBoldThickness.toFixed(1);
    if (textItem.bgColor === 'transparent') { isBgTransparent = true; currentBgColor = '#ffffff'; }
    else { isBgTransparent = false; currentBgColor = textItem.bgColor || '#ffffff'; }
    if (bgColorInput) bgColorInput.value = currentBgColor;
    updateTransparentUI();
    if (fontSelect) fontSelect.value = textItem.fontFamily;
    currentFontFamily = textItem.fontFamily;
    if (textItem.isThin) { currentTextThin = true; currentTextBold = false; if (thinBtn) thinBtn.classList.add('active'); if (boldBtn) boldBtn.classList.remove('active'); }
    else if (textItem.isBold) { currentTextBold = true; currentTextThin = false; if (boldBtn) boldBtn.classList.add('active'); if (thinBtn) thinBtn.classList.remove('active'); }
    else { currentTextBold = false; currentTextThin = false; if (boldBtn) boldBtn.classList.remove('active'); if (thinBtn) thinBtn.classList.remove('active'); }
    if (editDialog) editDialog.style.display = 'block';
    if (dialogInput) { dialogInput.focus(); dialogInput.select(); }
    autoHideOriginalText(textItem);
}

function autoHideOriginalText(textItem) {
    if (isBgTransparent || !pdfCtx) return;
    const sampleX = Math.max(0, Math.floor(textItem.x));
    const sampleY = Math.max(0, Math.floor(textItem.y - textItem.height / 2));
    try {
        const pixel = pdfCtx.getImageData(sampleX, sampleY, 1, 1).data;
        const bgHex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        textItem.bgColor = bgHex;
        currentBgColor = bgHex;
        if (bgColorInput) bgColorInput.value = bgHex;
        previewChanges();
    } catch(e) {}
}

async function saveDialogText() {
    if (dialogInput && dialogInput.value.trim() && currentEditingOverlay) {
        const ov = currentEditingOverlay;
        ov.text = dialogInput.value;
        ov.color = textColorInput ? textColorInput.value : (ov.color || '#000000');
        ov.fontFamily = currentFontFamily || ov.fontFamily || 'Roboto';
        ov.fontSize = currentFontSize || ov.fontSize || 16;
        ov.fontWeight = currentTextBold ? '700' : (currentTextThin ? '300' : '400');
        ov.boldThickness = currentBoldThickness || ov.boldThickness || 1.0;
        ov.bgColor = isBgTransparent ? 'transparent' : currentBgColor;
        createOverlayBoxes();
        showNotification('Text overlay updated');
        currentEditingOverlay = null;
    } else if (dialogInput && dialogInput.value.trim() && currentEditingTextItem) {
        if (!isOnline) { showNotification('No internet connection', true); closeDialog(); return; }
        if (!currentEditingTextItem.edited && auth.currentUser) {
            const incremented = await incrementEditCount(auth.currentUser);
            if (!incremented && !isAdmin(auth.currentUser)) { showNotification('Edit limit reached!', true); closeDialog(); return; }
        }
        currentEditingTextItem.text = dialogInput.value;
        if (textColorInput) currentEditingTextItem.color = textColorInput.value;
        currentEditingTextItem.bgColor = isBgTransparent ? 'transparent' : currentBgColor;
        currentEditingTextItem.fontFamily = currentFontFamily;
        currentEditingTextItem.fontSize = currentFontSize * scale;
        currentEditingTextItem.isBold = currentTextBold;
        currentEditingTextItem.isThin = currentTextThin;
        currentEditingTextItem.boldThickness = currentBoldThickness;
        currentEditingTextItem.yAdjust = currentYAdjust;
        currentEditingTextItem.coverHeight = currentCoverHeight;
        currentEditingTextItem.coverY = currentCoverY;
        currentEditingTextItem.fontWeight = currentTextBold ? '700' : (currentTextThin ? '300' : '400');
        currentEditingTextItem.edited = true;
        updateTextItem(currentEditingTextItem);
        previewChanges();
        redrawEditedContent();
        if (currentEditingTextBox) currentEditingTextBox.classList.add('edited');
        showNotification('Text updated successfully');
    }
    closeDialog();
}

function updateTextItem(textItem) {
    if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [] };
    const pageEditList = allPageEdits[pageNum].textEdits;
    const editIndex = pageEditList.findIndex(edit => edit.originalIndex === textItem.originalIndex);
    const editData = {
        originalIndex: textItem.originalIndex, text: textItem.text, color: textItem.color, bgColor: textItem.bgColor,
        fontFamily: textItem.fontFamily, fontWeight: textItem.fontWeight, isBold: textItem.isBold, isThin: textItem.isThin,
        boldThickness: textItem.boldThickness, original_indices: textItem.original_indices, x: textItem.x, y: textItem.y,
        width: textItem.width, height: textItem.height, fontSize: textItem.fontSize, yAdjust: textItem.yAdjust,
        coverHeight: textItem.coverHeight, coverY: textItem.coverY
    };
    if (editIndex > -1) pageEditList[editIndex] = editData;
    else pageEditList.push(editData);
    const textBox = textBoxes.find(box => box && parseInt(box.dataset.index) === textItem.originalIndex);
    if (textBox) { textBox.classList.add('edited'); textBox.title = textItem.text; }
    updateTextBoxes();
    redrawEditedContent();
}

function redrawEditedContent() {
    if (!editCtx || !editCanvas) return;
    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
    textItems.forEach(item => {
        if (item.edited) {
            editCtx.save();
            let fontWeight = item.isThin ? '300' : (item.isBold ? '700' : '400');
            editCtx.font = `${fontWeight} ${item.fontSize}px ${item.fontFamily}`;
            const metrics = editCtx.measureText(item.text);
            const ascent = metrics.actualBoundingBoxAscent || item.fontSize * 0.8;
            const descent = metrics.actualBoundingBoxDescent || item.fontSize * 0.2;
            const textHeight = ascent + descent;
            const trueWidth = Math.max(item.width, metrics.width);
            const yCorrection = (item.yAdjust || 0) * (item.fontSize / 100);
            const baselineY = item.y - yCorrection;
            if (item.bgColor && item.bgColor !== 'transparent') {
                editCtx.fillStyle = item.bgColor;
                const heightScale = item.fontSize / 50;
                const yScale = item.fontSize / 50;
                const coverExtra = (item.coverHeight || 0) * heightScale;
                const coverYShift = (item.coverY || 0) * yScale;
                editCtx.fillRect(item.x - 2, baselineY - ascent - 2 - coverExtra + coverYShift, trueWidth + 4, textHeight + 4 + (coverExtra * 2));
            }
            editCtx.fillStyle = item.color;
            editCtx.textBaseline = 'alphabetic';
            const thickness = item.boldThickness || 1.0;
            if (thickness > 1.0 && item.isBold) {
                editCtx.lineWidth = thickness * (item.fontSize / 100);
                editCtx.strokeStyle = item.color;
                editCtx.strokeText(item.text, item.x, baselineY);
                editCtx.fillText(item.text, item.x, baselineY);
            } else if (thickness < 1.0 && item.isThin) {
                editCtx.font = `300 ${item.fontSize}px ${item.fontFamily}`;
                editCtx.fillText(item.text, item.x, baselineY);
            } else {
                editCtx.fillText(item.text, item.x, baselineY);
            }
            editCtx.restore();
        }
    });
    imageItems.forEach(item => {
        if (item.edited && item.newImageData) {
            const img = new Image();
            img.onload = () => { if (editCtx) editCtx.drawImage(img, item.x, item.y, item.width, item.height); };
            img.src = item.newImageData;
        }
    });
}

function closeDialog() {
    if (editDialog) editDialog.style.display = 'none';
    currentEditingTextItem = null;
    currentEditingTextBox = null;
    currentEditingOverlay = null;
    redrawEditedContent();
}

function pickBackgroundColor() {
    if (!currentEditingTextItem || !pdfCtx) return;
    const item = currentEditingTextItem;
    const x = Math.floor(item.x);
    const y = Math.floor(item.y - item.height/2);
    try {
        const pixel = pdfCtx.getImageData(x, y, 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        currentBgColor = hex;
        isBgTransparent = false;
        updateTransparentUI();
        if (bgColorInput) bgColorInput.value = hex;
        previewChanges();
        showNotification('Background color picked');
    } catch(e) { showNotification('Could not pick color'); }
}

function addWatermarkToCanvas(ctx, width, height) {
    if (!watermarkSettings.enabled) return;
    ctx.save();
    ctx.globalAlpha = watermarkSettings.opacity;
    const fontSize = Math.min(watermarkSettings.fontSize, width / 8);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = watermarkSettings.color;
    if (watermarkSettings.outline) { ctx.strokeStyle = watermarkSettings.outlineColor; ctx.lineWidth = 3; }
    const text = watermarkSettings.text;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(watermarkSettings.angle * Math.PI / 180);
    if (watermarkSettings.outline) ctx.strokeText(text, -textWidth / 2, -textHeight / 2);
    ctx.fillText(text, -textWidth / 2, -textHeight / 2);
    ctx.restore();
    ctx.restore();
}

    

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
}

function updateTextBoxes() {
    if (!pdfPage || !canvasWrapper) return;
    const pdfPageRect = pdfPage.getBoundingClientRect();
    const canvasRect = canvasWrapper.getBoundingClientRect();
    textItems.forEach((item) => {
        const textBox = textBoxes.find(box => box && parseInt(box.dataset.index) === item.originalIndex);
        if (textBox) {
            textBox.style.left = ((canvasRect.left - pdfPageRect.left) + item.x) + 'px';
            textBox.style.top = ((canvasRect.top - pdfPageRect.top) + (item.y - item.height)) + 'px';
            textBox.style.width = item.width + 'px';
            textBox.style.height = item.height + 'px';
            textBox.title = item.text;
        }
    });
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    if (pageInfo) pageInfo.textContent = `Page ${pageNum} of ${pageCount}`;
    if (prevPage) prevPage.disabled = pageNum <= 1;
    if (nextPage) nextPage.disabled = pageNum >= pageCount;
}

function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) zoomLevel.textContent = Math.round(scale * 100) + '%';
}

// ==========================================
// OVERLAY & HIGHLIGHT FUNCTIONS
// ==========================================
function createOverlayBoxes() {
    document.querySelectorAll('.overlay-box, .overlay-highlight').forEach(el => el.remove());
    if (!allPageEdits[pageNum] || !allPageEdits[pageNum].overlays) return;
    const overlays = allPageEdits[pageNum].overlays;
    
    overlays.forEach((ov, idx) => {
        const wrap = document.getElementById('canvas-wrapper');
        if (!wrap) return;
        
        const x = (ov.xFrac || 0.1) * currentViewport.width;
        const y = (ov.yFrac || 0.1) * currentViewport.height;
        const w = (ov.wFrac || 0.2) * currentViewport.width;
        const h = (ov.hFrac || 0.1) * currentViewport.height;

        if (ov.type === 'image' || ov.type === 'drawing') {
            const box = document.createElement('div');
            box.className = 'overlay-box';
            box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
            box.dataset.ovIndex = idx;
            const img = document.createElement('img'); img.className = 'overlay-img'; img.src = ov.data || '';
            box.appendChild(img);
            const handle = document.createElement('div'); handle.className = 'overlay-handle'; box.appendChild(handle);
            const del = document.createElement('div'); del.className = 'overlay-delete'; del.innerHTML = '&times;'; box.appendChild(del);
            wrap.appendChild(box);
            makeOverlayDraggableResizable(box, idx);
            del.addEventListener('click', () => { removeOverlay(idx); });
        } else if (ov.type === 'text') {
            const box = document.createElement('div');
            box.className = 'overlay-box';
            box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
            box.dataset.ovIndex = idx;
            const span = document.createElement('div'); span.className = 'overlay-text'; span.textContent = ov.text || '';
            span.style.color = ov.color || '#000'; span.style.fontSize = (ov.fontSize || 16) + 'px'; span.style.textAlign = 'center'; span.style.fontFamily = ov.fontFamily || 'Roboto'; span.style.fontWeight = ov.fontWeight || '400';
            box.appendChild(span);
            const handle = document.createElement('div'); handle.className = 'overlay-handle'; box.appendChild(handle);
            const del = document.createElement('div'); del.className = 'overlay-delete'; del.innerHTML = '&times;'; box.appendChild(del);
            wrap.appendChild(box);
            makeOverlayDraggableResizable(box, idx);
            del.addEventListener('click', () => { removeOverlay(idx); });
            span.addEventListener('dblclick', () => {
                currentEditingOverlay = ov;
                if (dialogInput) dialogInput.value = ov.text || '';
                if (textColorInput) textColorInput.value = ov.color || '#000000';
                if (fontSizeInput) fontSizeInput.value = Math.round(ov.fontSize || 16);
                currentFontSize = ov.fontSize || 16;
                currentFontFamily = ov.fontFamily || 'Roboto';
                if (fontSelect) fontSelect.value = currentFontFamily;
                currentTextBold = !!(ov.fontWeight && String(ov.fontWeight).indexOf('700') === 0);
                if (editDialog) editDialog.style.display = 'block';
                if (dialogInput) { dialogInput.focus(); dialogInput.select(); }
            });
        } else if (ov.type === 'highlight') {
            const hl = document.createElement('div'); hl.className = 'overlay-highlight';
            hl.style.left = x + 'px'; hl.style.top = y + 'px'; hl.style.width = w + 'px'; hl.style.height = h + 'px';
            hl.style.background = ov.color || '#ff0'; hl.style.opacity = (ov.opacity !== undefined ? ov.opacity : 0.45);
            hl.dataset.ovIndex = idx;
            wrap.appendChild(hl);
        }
    });
}

function clearOverlayBoxes() {
    document.querySelectorAll('.overlay-box, .overlay-highlight').forEach(el => el.remove());
}

function makeOverlayDraggableResizable(el, idx) {
    let dragging = false; let resizing = false; let startX=0, startY=0, startW=0, startH=0, startLeft=0, startTop=0;
    const handle = el.querySelector('.overlay-handle');
    
    const onPointerDown = (e) => {
        if (e.target.classList.contains('overlay-handle') || e.target.classList.contains('overlay-delete')) return;
        e.preventDefault(); e.stopPropagation();
        dragging = true; startX = e.clientX; startY = e.clientY;
        startLeft = parseFloat(el.style.left); startTop = parseFloat(el.style.top);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    };
    
    const onResizeDown = (e) => {
        e.preventDefault(); e.stopPropagation(); 
        resizing = true; startX = e.clientX; startY = e.clientY;
        startW = parseFloat(el.style.width); startH = parseFloat(el.style.height);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    };
    
    const onPointerMove = (e) => {
        if (dragging) {
            const dx = e.clientX - startX; const dy = e.clientY - startY;
            el.style.left = (startLeft + dx) + 'px'; el.style.top = (startTop + dy) + 'px';
        } else if (resizing) {
            const dx = e.clientX - startX; const dy = e.clientY - startY;
            el.style.width = Math.max(20, startW + dx) + 'px'; el.style.height = Math.max(12, startH + dy) + 'px';
        }
    };
    
    const onPointerUp = () => {
        dragging = false; resizing = false; 
        document.removeEventListener('pointermove', onPointerMove); document.removeEventListener('pointerup', onPointerUp);
        const ovIndex = parseInt(el.dataset.ovIndex);
        const ov = allPageEdits[pageNum] && allPageEdits[pageNum].overlays ? allPageEdits[pageNum].overlays[ovIndex] : null;
        if (ov) updateOverlayFromElement(el, ov);
    };
    
    el.addEventListener('pointerdown', onPointerDown);
    if (handle) handle.addEventListener('pointerdown', onResizeDown);
}

function updateOverlayFromElement(el, ov) {
    const left = parseFloat(el.style.left); 
    const top = parseFloat(el.style.top); 
    const w = parseFloat(el.style.width); 
    const h = parseFloat(el.style.height);
    
    if (currentViewport) {
        ov.xFrac = left / currentViewport.width;
        ov.yFrac = top / currentViewport.height;
        ov.wFrac = w / currentViewport.width;
        ov.hFrac = h / currentViewport.height;
    }
}

function removeOverlay(idx) {
    if (!allPageEdits[pageNum] || !allPageEdits[pageNum].overlays) return;
    allPageEdits[pageNum].overlays.splice(idx, 1);
    createOverlayBoxes();
    showNotification('Overlay removed');
}

// ==========================================
// ADVANCED TOOLS IMPLEMENTATIONS
// ==========================================
function activateTool(toolName) {
    const toolCard = document.querySelector(`.tool-card[data-tool="${toolName}"]`);
    if (toolCard && toolCard.classList.contains('locked')) {
        showPaymentDialog();
        return;
    }
    const toolFunctions = {
        'batch': toolBatchProcessing,
        'merger': toolPDFMerger,
        'splitter': toolPDFSplitter,
        'rotate': toolPDFRotate,
        'ocr': toolOCRScanner,
        'compression': toolPDFCompression,
        'watermark': toolWatermarkPro,
        'signature': toolDigitalSignature,
        'add-image': toolAddImage,
        'add-text': toolAddText,
        'draw-signature': toolDrawSignature,
        'draw-highlight': toolDrawHighlight,
        'templates': toolTemplateLibrary,
        'recognition': toolFormRecognition,
        'pdf-search-highlight': toolPDFSearchHighlight,
        'write-text-full': toolWriteTextFull,
        'image-to-pdf': toolImageToPdf,
        'pdf-image-extract': toolPDFImageExtract,
        'zip-to-pdf': toolZipToPdf,
        'pdf-delete-pages': toolPDFDeletePages,
        'ocr-v2': toolOCRV2,
        'password-protect': toolPasswordProtect,
        'stamp-seal': toolStampSeal,
        'page-numbers': toolPageNumbers,
        'header-footer': toolHeaderFooter,
        'redact': toolRedact,
        'extract-pages': toolExtractPages,
        'pdf-to-images': toolPDFToImages,
        'crop-pages': toolCropPages,
        'flatten': toolFlattenPDF,
        'reorder-pages': toolReorderPages
    };

    if (toolFunctions[toolName]) toolFunctions[toolName]();
    else showNotification(`Tool ${toolName} not found`, true);
}

// ==========================================
// SEARCH & HIGHLIGHT PRO - ENHANCED
// ==========================================
function toolPDFSearchHighlight() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }

    const dialogContent = `
        <div class="dialog-form-group">
            <label>Keywords (comma separated)</label>
            <input type="text" id="search-keywords" class="dialog-form-control" placeholder="e.g. contract, agreement, date">
        </div>
        <div class="dialog-form-row">
            <div class="dialog-form-group">
                <label>Highlight Color</label>
                <div class="color-swatches">
                    <div class="color-swatch active" style="background: #ffeb3b;" data-color="#ffeb3b"></div>
                    <div class="color-swatch" style="background: #ff5722;" data-color="#ff5722"></div>
                    <div class="color-swatch" style="background: #2196f3;" data-color="#2196f3"></div>
                    <div class="color-swatch" style="background: #4caf50;" data-color="#4caf50"></div>
                    <div class="color-swatch" style="background: #9c27b0;" data-color="#9c27b0"></div>
                    <div class="color-swatch" style="background: #ff9800;" data-color="#ff9800"></div>
                </div>
            </div>
            <div class="dialog-form-group">
                <label>Opacity</label>
                <input type="range" id="search-opacity" min="10" max="100" value="40" class="dialog-form-control">
                <span id="search-opacity-value">40%</span>
            </div>
        </div>
        <div class="dialog-form-group">
            <div class="dialog-checkbox-group">
                <input type="checkbox" id="search-case-sensitive">
                <label for="search-case-sensitive">Case Sensitive</label>
            </div>
            <div class="dialog-checkbox-group">
                <input type="checkbox" id="search-whole-word">
                <label for="search-whole-word">Match Whole Word</label>
            </div>
            <div class="dialog-checkbox-group">
                <input type="checkbox" id="search-all-pages" checked>
                <label for="search-all-pages">Search All Pages</label>
            </div>
        </div>
        <div id="search-results" class="search-results" style="display:none;"></div>
    `;

    const dialog = createCustomDialog({
        title: 'Search & Highlight Pro',
        icon: 'fas fa-search',
        content: dialogContent,
        width: '550px',
        saveText: 'Highlight All',
        onSave: () => {
            const keywordsInput = document.getElementById('search-keywords').value;
            const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k);
            if (keywords.length === 0) { showNotification('Please enter keywords', true); return false; }
            
            const activeSwatch = document.querySelector('.color-swatch.active');
            const color = activeSwatch ? activeSwatch.dataset.color : '#ffeb3b';
            const opacity = parseInt(document.getElementById('search-opacity').value) / 100;
            const caseSensitive = document.getElementById('search-case-sensitive').checked;
            const wholeWord = document.getElementById('search-whole-word').checked;
            const allPages = document.getElementById('search-all-pages').checked;

            performSearchHighlight(keywords, color, opacity, caseSensitive, wholeWord, allPages);
        }
    });

    // Setup color swatches
    dialog.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            dialog.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
        });
    });

    document.getElementById('search-opacity').addEventListener('input', (e) => {
        document.getElementById('search-opacity-value').textContent = e.target.value + '%';
    });
}

async function performSearchHighlight(keywords, color, opacity, caseSensitive, wholeWord, allPages) {
    showLoading(true);
    showNotification('Searching and highlighting...');

    try {
        const pagesToSearch = allPages ? Array.from({ length: pageCount }, (_, i) => i + 1) : [pageNum];
        let totalMatches = 0;

        for (const pNum of pagesToSearch) {
            const page = await pdfDoc.getPage(pNum);
            const viewport = page.getViewport({ scale: scale });
            const textContent = await page.getTextContent();

            if (!allPageEdits[pNum]) allPageEdits[pNum] = { textEdits: [], images: [], overlays: [] };
            if (!allPageEdits[pNum].overlays) allPageEdits[pNum].overlays = [];

            textContent.items.forEach(item => {
                if (!item.str) return;
                let text = item.str;
                let searchStr = caseSensitive ? item.str : item.str.toLowerCase();

                keywords.forEach(keyword => {
                    let searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
                    let regex;
                    
                    if (wholeWord) {
                        regex = new RegExp(`\\b${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
                    } else {
                        regex = new RegExp(searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
                    }

                    let match;
                    while ((match = regex.exec(searchStr)) !== null) {
                        // Calculate position
                        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                        const fontSize = Math.hypot(tx[2], tx[3]) || 12;
                        
                        // Approximate x position based on character offset
                        const charWidth = (item.width * scale) / item.str.length;
                        const matchX = tx[4] + (match.index * charWidth);
                        const matchWidth = keyword.length * charWidth;
                        
                        const highlight = {
                            type: 'highlight',
                            xFrac: matchX / viewport.width,
                            yFrac: (tx[5] - fontSize) / viewport.height,
                            wFrac: matchWidth / viewport.width,
                            hFrac: fontSize / viewport.height,
                            color: color,
                            opacity: opacity,
                            keyword: keyword
                        };

                        allPageEdits[pNum].overlays.push(highlight);
                        totalMatches++;
                    }
                });
            });
        }

        showLoading(false);
        showNotification(`Found and highlighted ${totalMatches} matches!`);
        renderPage(pageNum); // Refresh current page

    } catch (error) {
        console.error('Search highlight error:', error);
        showLoading(false);
        showNotification('Error during search: ' + error.message, true);
    }
}

// ==========================================
// WRITE TEXT FULL - COMPLETE OPTIONS
// ==========================================
function toolWriteTextFull() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }

    const dialogContent = `
        <div class="tab-buttons">
            <button class="tab-btn active" data-tab="text-content">Text</button>
            <button class="tab-btn" data-tab="text-font">Font</button>
            <button class="tab-btn" data-tab="text-style">Style</button>
            <button class="tab-btn" data-tab="text-position">Position</button>
        </div>

        <div id="tab-text-content" class="tab-content active">
            <div class="dialog-form-group">
                <label>Text Content</label>
                <textarea id="write-text-content" class="dialog-form-control" rows="4" placeholder="Enter your text here..."></textarea>
            </div>
        </div>

        <div id="tab-text-font" class="tab-content">
            <div class="dialog-form-row">
                <div class="dialog-form-group">
                    <label>Font Family</label>
                    <select id="write-font-family" class="dialog-form-control">
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Montserrat">Montserrat</option>
                    </select>
                </div>
                <div class="dialog-form-group">
                    <label>Font Size</label>
                    <input type="number" id="write-font-size" class="dialog-form-control" value="16" min="8" max="200">
                </div>
            </div>
            <div class="style-buttons">
                <button class="style-btn" id="write-bold">Bold</button>
                <button class="style-btn" id="write-italic">Italic</button>
                <button class="style-btn" id="write-underline">Underline</button>
                <button class="style-btn" id="write-strike">Strikethrough</button>
            </div>
        </div>

        <div id="tab-text-style" class="tab-content">
            <div class="dialog-form-row">
                <div class="dialog-form-group">
                    <label>Text Color</label>
                    <input type="color" id="write-text-color" class="dialog-form-control" value="#000000">
                </div>
                <div class="dialog-form-group">
                    <label>Background</label>
                    <input type="color" id="write-bg-color" class="dialog-form-control" value="#ffffff">
                    <div class="dialog-checkbox-group">
                        <input type="checkbox" id="write-bg-transparent">
                        <label for="write-bg-transparent">Transparent</label>
                    </div>
                </div>
            </div>
            <div class="dialog-form-group">
                <label>Opacity</label>
                <input type="range" id="write-opacity" min="0" max="100" value="100" class="dialog-form-control">
            </div>
            <div class="dialog-checkbox-group">
                <input type="checkbox" id="write-shadow">
                <label for="write-shadow">Text Shadow</label>
            </div>
            <div class="dialog-checkbox-group">
                <input type="checkbox" id="write-border">
                <label for="write-border">Border</label>
            </div>
        </div>

        <div id="tab-text-position" class="tab-content">
            <div class="dialog-form-row">
                <div class="dialog-form-group">
                    <label>X Position (%)</label>
                    <input type="number" id="write-x-pos" class="dialog-form-control" value="10" min="0" max="100">
                </div>
                <div class="dialog-form-group">
                    <label>Y Position (%)</label>
                    <input type="number" id="write-y-pos" class="dialog-form-control" value="10" min="0" max="100">
                </div>
            </div>
            <div class="dialog-form-row">
                <div class="dialog-form-group">
                    <label>Width (%)</label>
                    <input type="number" id="write-width" class="dialog-form-control" value="30" min="5" max="100">
                </div>
                <div class="dialog-form-group">
                    <label>Rotation (°)</label>
                    <input type="number" id="write-rotation" class="dialog-form-control" value="0" min="-360" max="360">
                </div>
            </div>
            <div class="dialog-form-group">
                <label>Alignment</label>
                <div class="style-buttons">
                    <button class="style-btn active" id="write-align-left"><i class="fas fa-align-left"></i></button>
                    <button class="style-btn" id="write-align-center"><i class="fas fa-align-center"></i></button>
                    <button class="style-btn" id="write-align-right"><i class="fas fa-align-right"></i></button>
                </div>
            </div>
        </div>

        <div class="preview-box">
            <div id="write-preview" class="preview-text" style="font-size: 16px; color: #000;">Preview Text</div>
        </div>
    `;

    const dialog = createCustomDialog({
        title: 'Write Text to PDF',
        icon: 'fas fa-font',
        content: dialogContent,
        width: '600px',
        saveText: 'Add Text',
        onSave: () => {
            const text = document.getElementById('write-text-content').value;
            if (!text) { showNotification('Please enter text', true); return false; }
            
            const fontFamily = document.getElementById('write-font-family').value;
            const fontSize = parseInt(document.getElementById('write-font-size').value);
            const color = document.getElementById('write-text-color').value;
            const bgColor = document.getElementById('write-bg-transparent').checked ? 'transparent' : document.getElementById('write-bg-color').value;
            const opacity = parseInt(document.getElementById('write-opacity').value) / 100;
            const shadow = document.getElementById('write-shadow').checked;
            const border = document.getElementById('write-border').checked;
            const xPos = parseInt(document.getElementById('write-x-pos').value) / 100;
            const yPos = parseInt(document.getElementById('write-y-pos').value) / 100;
            const width = parseInt(document.getElementById('write-width').value) / 100;
            const rotation = parseInt(document.getElementById('write-rotation').value);
            
            let fontWeight = '400';
            let fontStyle = 'normal';
            let textDecoration = 'none';
            
            if (document.getElementById('write-bold').classList.contains('active')) fontWeight = '700';
            if (document.getElementById('write-italic').classList.contains('active')) fontStyle = 'italic';
            if (document.getElementById('write-underline').classList.contains('active')) textDecoration = 'underline';
            if (document.getElementById('write-strike').classList.contains('active')) textDecoration = 'line-through';

            let alignment = 'left';
            if (document.getElementById('write-align-center').classList.contains('active')) alignment = 'center';
            if (document.getElementById('write-align-right').classList.contains('active')) alignment = 'right';

            // Add text overlay
            if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
            allPageEdits[pageNum].overlays.push({
                type: 'text',
                text: text,
                xFrac: xPos,
                yFrac: yPos,
                wFrac: width,
                hFrac: (fontSize / (pdfCanvas.height / scale)) * 1.5,
                fontFamily: fontFamily,
                fontSize: fontSize,
                fontWeight: fontWeight,
                fontStyle: fontStyle,
                color: color,
                bgColor: bgColor,
                opacity: opacity,
                shadow: shadow,
                border: border,
                rotation: rotation,
                alignment: alignment,
                textDecoration: textDecoration
            });

            createOverlayBoxes();
            showNotification('Text added! You can drag to reposition.');
        }
    });

    // Tab switching
    dialog.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dialog.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            dialog.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // Style buttons toggle
    dialog.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id.includes('align')) {
                dialog.querySelectorAll('[id^="write-align"]').forEach(b => b.classList.remove('active'));
            }
            btn.classList.toggle('active');
            updateWritePreview();
        });
    });

    // Live preview
    function updateWritePreview() {
        const preview = document.getElementById('write-preview');
        preview.textContent = document.getElementById('write-text-content').value || 'Preview Text';
        preview.style.fontFamily = document.getElementById('write-font-family').value;
        preview.style.fontSize = document.getElementById('write-font-size').value + 'px';
        preview.style.color = document.getElementById('write-text-color').value;
        preview.style.backgroundColor = document.getElementById('write-bg-transparent').checked ? 'transparent' : document.getElementById('write-bg-color').value;
    }

    dialog.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', updateWritePreview);
    });
}

// ==========================================
// ADDITIONAL VIP TOOLS
// ==========================================
function toolPDFSplitter() {
    document.getElementById('pdfSplitInput').click();
    document.getElementById('pdfSplitInput').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showLoading(true);
        showNotification('Splitting PDF...');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdf.getPageCount();
            
            // Split into individual pages
            for (let i = 0; i < totalPages; i++) {
                const newPdf = await PDFLib.PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdf, [i]);
                newPdf.addPage(copiedPage);
                const pdfBytes = await newPdf.save();
                downloadPDF(pdfBytes, `page_${i + 1}.pdf`);
            }
            
            showNotification(`Split into ${totalPages} files!`);
        } catch (err) {
            showNotification('Error splitting PDF: ' + err.message, true);
        }
        showLoading(false);
    };
}

function toolPDFRotate() {
    document.getElementById('pdfRotateInput').click();
    document.getElementById('pdfRotateInput').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const angle = prompt("Enter rotation angle (90, 180, 270):", "90");
        if (!angle) return;
        
        showLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdf.getPages();
            
            pages.forEach(page => {
                const currentRotation = page.getRotation().angle;
                page.setRotation(PDFLib.degrees(currentRotation + parseInt(angle)));
            });
            
            const pdfBytes = await pdf.save();
            downloadPDF(pdfBytes, 'rotated.pdf');
            showNotification('PDF rotated successfully!');
        } catch (err) {
            showNotification('Error rotating PDF: ' + err.message, true);
        }
        showLoading(false);
    };
}

function toolPasswordProtect() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    
    const password = prompt("Enter password to protect PDF:");
    if (!password) return;
    
    showLoading(true);
    showNotification('Adding password protection...');
    
    setTimeout(() => {
        showNotification('Password protection requires server-side implementation.', true);
        showLoading(false);
    }, 1000);
}

function toolStampSeal() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    openSignatureModal();
}

function toolPageNumbers() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    
    const startNum = prompt("Start numbering from:", "1");
    if (!startNum) return;
    
    const position = prompt("Position (bottom-center, bottom-left, bottom-right):", "bottom-center");
    
    showNotification('Page numbers will be added when you save the PDF.');
    
    // Add page numbers as overlays
    for (let i = 1; i <= pageCount; i++) {
        if (!allPageEdits[i]) allPageEdits[i] = { textEdits: [], images: [], overlays: [] };
        
        let xFrac = 0.45; // center default
        if (position.includes('left')) xFrac = 0.1;
        if (position.includes('right')) xFrac = 0.85;
        
        allPageEdits[i].overlays.push({
            type: 'text',
            text: `${parseInt(startNum) + i - 1}`,
            xFrac: xFrac,
            yFrac: 0.92,
            wFrac: 0.1,
            hFrac: 0.05,
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#000000',
            alignment: 'center'
        });
    }
    
    renderPage(pageNum);
}

function toolHeaderFooter() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    
    const header = prompt("Enter header text (leave empty for none):");
    const footer = prompt("Enter footer text (leave empty for none):");
    
    for (let i = 1; i <= pageCount; i++) {
        if (!allPageEdits[i]) allPageEdits[i] = { textEdits: [], images: [], overlays: [] };
        
        if (header) {
            allPageEdits[i].overlays.push({
                type: 'text',
                text: header,
                xFrac: 0.1,
                yFrac: 0.02,
                wFrac: 0.8,
                hFrac: 0.03,
                fontSize: 10,
                fontFamily: 'Arial',
                color: '#666666'
            });
        }
        
        if (footer) {
            allPageEdits[i].overlays.push({
                type: 'text',
                text: footer,
                xFrac: 0.1,
                yFrac: 0.95,
                wFrac: 0.8,
                hFrac: 0.03,
                fontSize: 10,
                fontFamily: 'Arial',
                color: '#666666'
            });
        }
    }
    
    renderPage(pageNum);
    showNotification('Header/Footer added!');
}

function toolRedact() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    toolDrawHighlight();
    showNotification('Draw black boxes over sensitive content. Change highlight color to black.');
}

function toolExtractPages() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    
    const pages = prompt("Enter page numbers to extract (e.g., 1,3,5-7):");
    if (!pages) return;
    
    // Parse page numbers
    const pageList = [];
    pages.split(',').forEach(p => {
        if (p.includes('-')) {
            const [start, end] = p.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) pageList.push(i);
        } else {
            pageList.push(parseInt(p.trim()));
        }
    });
    
    showNotification(`Extracted pages ${pageList.join(', ')}. Feature requires PDF-lib for actual extraction.`);
}

function toolPDFToImages() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    
    showLoading(true);
    showNotification('Converting pages to images...');
    
    const zip = new JSZip();
    let processed = 0;
    
    for (let i = 1; i <= pageCount; i++) {
        pdfDoc.getPage(i).then(async page => {
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            canvas.toBlob(blob => {
                zip.file(`page_${i}.png`, blob);
                processed++;
                if (processed === pageCount) {
                    zip.generateAsync({ type: 'blob' }).then(content => {
                        saveAs(content, 'pdf_images.zip');
                        showNotification('Images extracted successfully!');
                        showLoading(false);
                    });
                }
            }, 'image/png');
        });
    }
}

function toolCropPages() {
    showNotification('Crop tool: Resize the view and save to effectively crop.');
}

function toolFlattenPDF() {
    showNotification('PDF will be flattened (all edits merged) when you save.');
}

function toolReorderPages() {
    showNotification('Page reorder feature - drag pages to reorder (visual placeholder).');
}

// Existing tool implementations continue...
function toolImageToPdf() {
    document.getElementById('imageToPdfInput').click();
}

document.getElementById('imageToPdfInput')?.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files).sort((a,b) => a.lastModified - b.lastModified);
    if (!files.length) return;

    const pdfDoc = await PDFLib.PDFDocument.create();

    for (const file of files) {
        const imgBytes = await file.arrayBuffer();
        let img;
        try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }

        const pageWidth = img.width;
        const pageHeight = img.height;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    downloadPDF(pdfBytes, 'images_to_pdf.pdf');
    showNotification('Images converted to PDF!');
    this.value = '';
});

function toolPDFImageExtract() {
    document.getElementById('pdfImageExtractInput').click();
}

document.getElementById('pdfImageExtractInput')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const zip = new JSZip();

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            zip.file(`page_${i}.png`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'pdf_images.zip');
        showNotification('Images extracted!');
    } catch (err) {
        showNotification('Error: ' + err.message, true);
    }
    this.value = '';
});

function toolZipToPdf() {
    document.getElementById('zipToPdfInput').click();
}

document.getElementById('zipToPdfInput')?.addEventListener('change', async function(e) {
    const zipFile = e.target.files[0];
    if (!zipFile) return;

    const zip = await JSZip.loadAsync(zipFile);
    const pdfDoc = await PDFLib.PDFDocument.create();

    const imageFiles = Object.values(zip.files)
        .filter(f => !f.dir && /\.(png|jpg|jpeg|webp)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (!imageFiles.length) {
        showNotification("No images found in ZIP!", true);
        return;
    }

    for (const file of imageFiles) {
        const imgBytes = await file.async("uint8array");
        let img;
        try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }
        
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    downloadPDF(pdfBytes, 'zip_images_to_pdf.pdf');
    showNotification('ZIP converted to PDF!');
    this.value = '';
});

function toolPDFDeletePages() {
    document.getElementById('pdfDeleteInput').click();
}

let deletePdfBytes;

document.getElementById('pdfDeleteInput')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    deletePdfBytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(deletePdfBytes);
    const totalPages = pdf.getPageCount();

    const list = document.getElementById('pageList');
    if (list) {
        list.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const div = document.createElement('div');
            div.textContent = 'Page ' + i;
            div.dataset.page = i;
            div.onclick = () => div.classList.toggle('active');
            list.appendChild(div);
        }
        document.getElementById('pagePreviewContainer').style.display = 'block';
    }
});

document.getElementById('deletePagesBtn')?.addEventListener('click', async () => {
    const selected = [...document.querySelectorAll('#pageList .active')].map(d => parseInt(d.dataset.page) - 1);
    if (selected.length === 0) {
        showNotification('Select pages to delete', true);
        return;
    }

    const pdfDoc = await PDFLib.PDFDocument.load(deletePdfBytes);
    selected.sort((a, b) => b - a).forEach(index => pdfDoc.removePage(index));

    const newPdf = await pdfDoc.save();
    saveAs(new Blob([newPdf], { type: 'application/pdf' }), 'deleted_pages.pdf');
    showNotification('Pages deleted!');
});

function toolOCRV2() {
    document.getElementById('ocrV2Input').click();
}

document.getElementById('ocrV2Input')?.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    showNotification("OCR V2 Processing...");

    const pdfDoc = await PDFLib.PDFDocument.create();
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

    for (const file of files) {
        const enhancedBlob = await enhanceImage(file);
        const result = await Tesseract.recognize(enhancedBlob, 'eng', { logger: m => console.log(m) });
        const text = cleanOCRText(result.data.text);
        const page = pdfDoc.addPage([595, 842]);
        
        let y = 800;
        for (const line of text.split('\n')) {
            if (y < 50) { y = 800; pdfDoc.addPage([595, 842]); }
            page.drawText(line, { x: 40, y: y, size: 12, font: font });
            y -= 16;
        }
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    downloadPDF(pdfBytes, 'OCR_V2_ULTRA_CLEAR.pdf');
    showNotification("OCR V2 Completed!");
    this.value = '';
});

async function enhanceImage(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.filter = 'grayscale(100%) contrast(160%) brightness(110%)';
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => resolve(blob), 'image/png', 1);
        };
        img.src = URL.createObjectURL(file);
    });
}

function cleanOCRText(text) {
    return text.replace(/[^\x20-\x7E\n]/g, '').replace(/\n{3,}/g, '\n\n').replace(/[ ]{2,}/g, ' ').trim();
}

function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function toolAddImage() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    pendingAddNewImage = true;
    showNotification('Select an image file to add.');
    if (imageInput) imageInput.click();
}

function toolAddText() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    const txt = prompt('Enter text to add:');
    if (!txt) return;
    if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
    allPageEdits[pageNum].overlays.push({ type: 'text', text: txt, xFrac: 0.2, yFrac: 0.2, wFrac: 0.4, hFrac: 0.08, fontSize: 16, color: '#000000', fontFamily: 'Roboto' });
    createOverlayBoxes();
    showNotification('Text added — drag to position.');
}

function toolDrawSignature() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    openSignatureModal();
}

function toolDrawHighlight() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    const toolbar = document.getElementById('highlight-toolbar');
    if (!toolbar) return;
    toolbar.style.display = 'flex';
    showNotification('Drag on the page to highlight.');
    enterHighlightMode();
}

function toolBatchProcessing() {
    showNotification('Batch processing - select multiple PDFs');
    // Implementation similar to merger but with edit application
}

function toolPDFMerger() {
    document.getElementById('pdfMergeInput').click();
}

document.getElementById('pdfMergeInput')?.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    if (files.length < 2) { showNotification('Select at least 2 PDFs', true); return; }

    showLoading(true);
    showNotification('Merging PDFs...');

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(bytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        downloadPDF(pdfBytes, 'merged.pdf');
        showNotification('PDFs merged!');
    } catch (err) {
        showNotification('Error: ' + err.message, true);
    }
    showLoading(false);
});

function toolOCRScanner() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    showLoading(true);
    showNotification('Extracting text...');

    (async () => {
        let allText = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            allText += `\n--- Page ${i} ---\n` + content.items.map(item => item.str).join(' ');
        }
        
        navigator.clipboard.writeText(allText);
        showNotification('Text copied to clipboard!');
        showLoading(false);
    })();
}

function toolPDFCompression() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    showNotification('Saving with standard compression...');
    savePDF();
}

function toolWatermarkPro() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    const text = prompt("Watermark text:", "CONFIDENTIAL");
    if (!text) return;
    
    watermarkSettings.enabled = true;
    watermarkSettings.text = text;
    showNotification('Watermark added. Save PDF to apply.');
}

function toolDigitalSignature() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    openSignatureModal();
}

function toolTemplateLibrary() {
    showNotification('Template library coming soon!');
}

function toolFormRecognition() {
    if (!pdfDoc) { showNotification('Please load a PDF first', true); return; }
    showNotification('Scanning for form fields...');
}

// ==========================================
// SIGNATURE & HIGHLIGHT HANDLERS
// ==========================================
function openSignatureModal() {
    const modal = document.getElementById('signature-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    initSignatureCanvas();
}

function closeSignatureModal() { 
    const modal = document.getElementById('signature-modal'); 
    if (modal) modal.style.display = 'none'; 
}

function initSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas'); 
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect(); 
    canvas.width = rect.width * devicePixelRatio; 
    canvas.height = rect.height * devicePixelRatio; 
    canvas.style.width = rect.width + 'px'; 
    canvas.style.height = rect.height + 'px';
    
    const ctx = canvas.getContext('2d'); 
    ctx.scale(devicePixelRatio, devicePixelRatio); 
    ctx.lineCap = 'round'; 
    ctx.lineJoin = 'round'; 
    ctx.lineWidth = 3; 
    ctx.strokeStyle = '#000'; 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let drawing = false; 
    let lastX = 0, lastY = 0;
    
    canvas.onpointerdown = (e) => { 
        drawing = true; 
        const r = canvas.getBoundingClientRect(); 
        lastX = (e.clientX - r.left); 
        lastY = (e.clientY - r.top); 
    };
    
    canvas.onpointermove = (e) => { 
        if (!drawing) return; 
        const r = canvas.getBoundingClientRect(); 
        const x = (e.clientX - r.left); 
        const y = (e.clientY - r.top); 
        ctx.beginPath(); 
        ctx.moveTo(lastX, lastY); 
        ctx.lineTo(x, y); 
        ctx.stroke(); 
        lastX = x; 
        lastY = y; 
    };
    
    canvas.onpointerup = canvas.onpointercancel = () => { drawing = false; };

    document.getElementById('signature-clear').onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); };
    document.getElementById('signature-close').onclick = () => { closeSignatureModal(); };
    document.getElementById('signature-save').onclick = () => {
        const dataUrl = canvas.toDataURL('image/png');
        if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
        allPageEdits[pageNum].overlays = allPageEdits[pageNum].overlays || [];
        allPageEdits[pageNum].overlays.push({ type: 'image', data: dataUrl, xFrac: 0.2, yFrac: 0.7, wFrac: 0.25, hFrac: 0.12 });
        closeSignatureModal(); 
        createOverlayBoxes(); 
        showNotification('Signature added.');
    };
}

function enterHighlightMode() {
    overlayMode = 'highlight';
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    wrapper.style.cursor = 'crosshair';
    
    const thicknessSlider = document.getElementById('highlight-thickness');
    const thicknessValue = document.getElementById('thickness-value');
    
    if (thicknessSlider) {
        thicknessSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (thicknessValue) thicknessValue.textContent = val;
            if (currentHighlightEl) {
                const opacity = 0.15 + ((val - 4) / 76) * 0.6;
                currentHighlightEl.style.opacity = opacity;
            }
        });
    }
    
    const onDown = (e) => {
        if (overlayMode !== 'highlight') return;
        isHighlighting = true; 
        const rect = wrapper.getBoundingClientRect(); 
        highlightStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        
        const thicknessVal = parseInt(document.getElementById('highlight-thickness').value || '24');
        const opacity = 0.15 + ((thicknessVal - 4) / 76) * 0.6;
        
        currentHighlightEl = document.createElement('div'); 
        currentHighlightEl.className = 'overlay-highlight'; 
        currentHighlightEl.style.left = highlightStart.x + 'px'; 
        currentHighlightEl.style.top = highlightStart.y + 'px'; 
        currentHighlightEl.style.width = '0px'; 
        currentHighlightEl.style.height = '0px'; 
        currentHighlightEl.style.background = document.getElementById('highlight-color').value || '#ff0'; 
        currentHighlightEl.style.opacity = opacity; 
        wrapper.appendChild(currentHighlightEl);
        
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        e.preventDefault();
    };
    
    const onMove = (e) => { 
        if (!isHighlighting) return; 
        const rect = wrapper.getBoundingClientRect(); 
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top; 
        const w = Math.abs(x - highlightStart.x); 
        const h = Math.abs(y - highlightStart.y); 
        currentHighlightEl.style.left = Math.min(x, highlightStart.x) + 'px'; 
        currentHighlightEl.style.top = Math.min(y, highlightStart.y) + 'px'; 
        currentHighlightEl.style.width = w + 'px'; 
        currentHighlightEl.style.height = h + 'px'; 
    };
    
    const onUp = (e) => {
        if (!isHighlighting) return; 
        isHighlighting = false; 
        document.removeEventListener('pointermove', onMove); 
        document.removeEventListener('pointerup', onUp);
        
        const rect = wrapper.getBoundingClientRect(); 
        const left = parseFloat(currentHighlightEl.style.left); 
        const top = parseFloat(currentHighlightEl.style.top); 
        const w = parseFloat(currentHighlightEl.style.width); 
        const h = parseFloat(currentHighlightEl.style.height);
        
        if (!allPageEdits[pageNum]) allPageEdits[pageNum] = { textEdits: [], images: [], overlays: [] };
        allPageEdits[pageNum].overlays = allPageEdits[pageNum].overlays || [];
        
        const thicknessVal = parseInt(document.getElementById('highlight-thickness').value || '24');
        const opacity = 0.15 + ((thicknessVal - 4) / 76) * 0.6;
        
        allPageEdits[pageNum].overlays.push({ 
            type: 'highlight', 
            xFrac: left / currentViewport.width, 
            yFrac: top / currentViewport.height, 
            wFrac: w / currentViewport.width, 
            hFrac: h / currentViewport.height, 
            color: document.getElementById('highlight-color').value || '#ff0', 
            opacity: opacity, 
            thickness: thicknessVal 
        });
        
        currentHighlightEl.remove(); 
        currentHighlightEl = null; 
        createOverlayBoxes(); 
        showNotification('Highlight added');
    };
    
    wrapper.addEventListener('pointerdown', onDown, { once: false });

    document.getElementById('highlight-done').onclick = () => { 
        overlayMode = null; 
        wrapper.style.cursor = 'default'; 
        document.getElementById('highlight-toolbar').style.display = 'none'; 
        showNotification('Highlight mode exited'); 
    };
    
    document.getElementById('highlight-cancel').onclick = () => { 
        overlayMode = null; 
        wrapper.style.cursor = 'default'; 
        document.getElementById('highlight-toolbar').style.display = 'none'; 
    };
    
    document.getElementById('highlight-clear').onclick = () => { 
        clearPageHighlights(); 
        showNotification('Highlights cleared'); 
        createOverlayBoxes(); 
    };
}

// ==========================================
// MAKE EDIT DIALOG DRAGGABLE
// ==========================================
function makeDialogDraggable() {
    const dialog = document.getElementById('edit-dialog');
    if (!dialog) return;
    
    const dialogHeader = dialog.querySelector('.dialog-header');
    const minimizeBtn = document.getElementById('dialog-minimize');
    
    let isDragging = false;
    let isMinimized = false;
    let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
    
    function loadSavedPosition() {
        const savedPos = localStorage.getItem('dialogPosition');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                dialog.style.left = pos.left;
                dialog.style.top = pos.top;
                dialog.style.transform = 'none';
                xOffset = parseInt(pos.left) || 0;
                yOffset = parseInt(pos.top) || 0;
            } catch (e) {}
        }
    }
    
    function savePosition() {
        localStorage.setItem('dialogPosition', JSON.stringify({ left: dialog.style.left, top: dialog.style.top }));
    }
    
    dialog.style.position = 'fixed';
    loadSavedPosition();
    
    dialogHeader.addEventListener('mousedown', (e) => {
        if (e.target === minimizeBtn) return;
        isDragging = true;
        const rect = dialog.getBoundingClientRect();
        xOffset = rect.left;
        yOffset = rect.top;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        dialog.style.transition = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dialog.style.transition = 'all 0.1s ease';
            savePosition();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        const maxX = window.innerWidth - dialog.offsetWidth;
        const maxY = window.innerHeight - dialog.offsetHeight;
        currentX = Math.min(Math.max(0, currentX), maxX);
        currentY = Math.min(Math.max(0, currentY), maxY);
        dialog.style.left = currentX + 'px';
        dialog.style.top = currentY + 'px';
        dialog.style.transform = 'none';
    });
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            const controls = dialog.querySelectorAll('.edit-controls');
            const input = dialog.querySelector('#dialog-input');
            const buttons = dialog.querySelector('.dialog-buttons');
            if (isMinimized) {
                controls.forEach(c => c.style.display = 'none');
                if (input) input.style.display = 'none';
                if (buttons) buttons.style.display = 'none';
                dialog.style.minWidth = '200px';
                minimizeBtn.textContent = '□';
            } else {
                controls.forEach(c => c.style.display = 'flex');
                if (input) input.style.display = 'block';
                if (buttons) buttons.style.display = 'flex';
                dialog.style.minWidth = '550px';
                minimizeBtn.textContent = '−';
            }
        });
    }
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); if (auth.currentUser && pdfDoc) savePDF(); }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); if (auth.currentUser) pdfFileInput.click(); }
    if (e.key === 'Escape' && editDialog && editDialog.style.display === 'block') closeDialog();
});

// ==========================================
// TOUCH SUPPORT
// ==========================================
let touchStartX, touchStartY;
if (pdfContainer) {
    pdfContainer.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; });
    pdfContainer.addEventListener('touchend', (e) => {
        if (!touchStartX) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0 && pageNum < pageCount) { pageNum++; renderPage(pageNum); }
            else if (diffX < 0 && pageNum > 1) { pageNum--; renderPage(pageNum); }
        }
    });
}

// ==========================================
// GLOBAL ERROR HANDLERS
// ==========================================
window.addEventListener('error', function(e) { console.error('Global error:', e.error); showNotification('An error occurred: ' + e.message); showLoading(false); return false; });
window.addEventListener('unhandledrejection', function(e) { console.error('Unhandled rejection:', e.reason); showNotification('An error occurred: ' + e.reason.message); showLoading(false); });

// ==========================================
// UPDATE USER DASHBOARD
// ==========================================
function updateUserDashboard(userData) {
    const dashboard = document.getElementById('user-dashboard');
    const loginForm = document.getElementById('login-form');
    const loginHeader = document.getElementById('login-header');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const userPlan = document.getElementById('user-plan');
    const dashboardPlanBadge = document.getElementById('dashboard-plan-badge');
    
    if (!userData) {
        dashboard.style.display = 'none';
        loginForm.style.display = 'block';
        loginHeader.innerHTML = '<h2><i class="fas fa-lock"></i> Login Required</h2><p>Please login to access PDF Form Editor</p>';
        return;
    }
    
    dashboard.style.display = 'block';
    loginForm.style.display = 'none';
    loginHeader.innerHTML = '<h2><i class="fas fa-hand-peace"></i> Welcome Back!</h2><p>Manage your account</p>';
    userEmail.textContent = userData.email || 'User';
    userAvatar.textContent = userData.email ? userData.email.charAt(0).toUpperCase() : 'U';
    
    const used = userData.editCount || 0;
    const total = userData.maxEdits || 10;
    const remaining = total - used;
    const progressPercent = (used / total) * 100;
    
    document.getElementById('dashboard-used').textContent = used;
    document.getElementById('dashboard-total').textContent = total;
    document.getElementById('dashboard-remaining').textContent = remaining;
    document.getElementById('dashboard-used-count').textContent = used;
    document.getElementById('dashboard-progress').style.width = progressPercent + '%';
    document.getElementById('dashboard-edits').textContent = used;
    
    if (pdfDoc) document.getElementById('dashboard-pages').textContent = pageCount;
    else document.getElementById('dashboard-pages').textContent = '0';
    
    if (userData.email === 'arun@gmail.com') {
        userPlan.textContent = 'Admin Plan';
        dashboardPlanBadge.textContent = 'Admin';
    } else {
        userPlan.textContent = 'Free Plan';
        dashboardPlanBadge.textContent = 'Free';
    }
    
    updateAdvancedToolsAccess(userData);
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    createProfessionalDialog();
    startConnectionMonitoring();
    makeDialogDraggable();
    
    const loginModal = document.getElementById('login-modal');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const logoutButtonInside = document.getElementById('logout-button-inside');
    const closeLogin = document.getElementById('close-login');
    const loginStatusBtn = document.getElementById('login-status-btn');
    const notificationCancel = document.getElementById('notification-cancel');
    
    if (notificationCancel) notificationCancel.addEventListener('click', cancelNotification);
    
    // Add Admin Panel Button
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
        const adminBtn = document.createElement('button');
        adminBtn.className = 'save-btn';
        adminBtn.id = 'admin-panel-btn';
        adminBtn.innerHTML = '<i class="fas fa-crown"></i> Admin';
        adminBtn.style.display = 'none';
        adminBtn.addEventListener('click', showAdminPanel);
        headerControls.appendChild(adminBtn);
        
        const buyBtn = document.createElement('button');
        buyBtn.className = 'save-btn';
        buyBtn.id = 'buy-edits-btn';
        buyBtn.innerHTML = '<i class="fas fa-coins"></i> Buy Edits';
        buyBtn.addEventListener('click', showPaymentDialog);
        headerControls.insertBefore(buyBtn, document.getElementById('save-btn'));
    }
    
    document.getElementById('dashboard-buy-btn')?.addEventListener('click', showPaymentDialog);
    document.getElementById('dashboard-refresh-btn')?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            const snapshot = await database.ref('users/' + user.uid).once('value');
            const userData = snapshot.val() || { editCount: 0, maxEdits: 10, email: user.email };
            updateUserDashboard(userData);
            showNotification('Dashboard updated');
        }
    });
    
    // Advanced Tools Panel
    const advancedToolsBtn = document.getElementById('advanced-tools-btn');
    const advancedToolsPanel = document.getElementById('advanced-tools-panel');
    const closeAdvancedToolsBtn = document.getElementById('close-advanced-tools');
    const upgradeFromToolsBtn = document.getElementById('upgrade-from-tools');
    
    if (advancedToolsBtn) {
        advancedToolsBtn.addEventListener('click', () => {
            advancedToolsPanel.classList.remove('hidden');
        });
    }
    
    if (closeAdvancedToolsBtn) {
        closeAdvancedToolsBtn.addEventListener('click', () => {
            advancedToolsPanel.classList.add('hidden');
        });
    }
    
    if (advancedToolsPanel) {
        advancedToolsPanel.addEventListener('click', (e) => {
            if (e.target === advancedToolsPanel) {
                advancedToolsPanel.classList.add('hidden');
            }
        });
    }
    
    if (upgradeFromToolsBtn) {
        upgradeFromToolsBtn.addEventListener('click', () => {
            advancedToolsPanel.classList.add('hidden');
            showPaymentDialog();
        });
    }
    
    // Tool card click handlers
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const toolName = card.getAttribute('data-tool');
            const user = auth.currentUser;
            const isLocked = card.classList.contains('locked');
            
            if (!user) {
                showNotification('Please login first to access premium tools', true);
                return;
            }
            
            if (isLocked) {
                showNotification(`${toolName} is locked. Upgrade to Premium!`, true);
                setTimeout(() => showPaymentDialog(), 1500);
            } else {
                activateTool(toolName);
            }
        });
    });
    
    // Auth State Listener
    auth.onAuthStateChanged(async (user) => {
        const adminBtn = document.getElementById('admin-panel-btn');
        if (user) {
        
        // ✅ ADD THIS LINE
        await initializeUserEditCount(user);
            const userRef = database.ref('users/' + user.uid);
            const snapshot = await userRef.once('value');
            let userData = snapshot.val();
            listenUserPremium(user.uid);
            if (!userData) userData = { email: user.email, editCount: 0, maxEdits: 10 };
            else userData.email = user.email;

            updateUserDashboard(userData);
            updateAdvancedToolsAccess(userData);

            if (loginStatusBtn) loginStatusBtn.innerHTML = '<i class="fas fa-user-check"></i> ' + user.email.split('@')[0];

            if (isAdmin(user)) {
                if (loginStatusBtn) loginStatusBtn.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
                if (adminBtn) adminBtn.style.display = 'inline-flex';
                watermarkSettings.enabled = false;
                checkPurchaseAndUnlock(userData);
            } else {
                if (loginStatusBtn) loginStatusBtn.style.background = 'linear-gradient(135deg, #059669, #047857)';
                if (adminBtn) adminBtn.style.display = 'none';
                checkPurchaseAndUnlock(userData);
                const purchased = userData && Number(userData.lastPurchaseAmount || 0) > 0;
                watermarkSettings.enabled = !purchased;
            }

            if (isOnline) enableEditing();

        } else {
            document.getElementById('user-dashboard').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-header').innerHTML = '<h2><i class="fas fa-lock"></i> Login Required</h2><p>Please login to access PDF Form Editor</p>';
            if (loginStatusBtn) {
                loginStatusBtn.innerHTML = '<i class="fas fa-user"></i> Login';
                loginStatusBtn.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
            }
            if (adminBtn) adminBtn.style.display = 'none';

            watermarkSettings.enabled = true;
            lockAllTools();
        }
    });
    
    function listenUserPremium(uid) {
        firebase.database().ref('users/' + uid).on('value', snapshot => {
            const userData = snapshot.val();
            if (!userData) { lockAllTools(); return; }
            checkPurchaseAndUnlock(userData);
        }, error => {
            console.error("Firebase permission error:", error);
            lockAllTools();
        });
    }

    function logout() {
        auth.signOut().then(() => { showNotification('Logged out successfully'); if (loginModal) loginModal.style.display = 'flex'; }).catch((error) => { showNotification('Logout failed: ' + error.message, true); });
    }

// ==========================================
// CHECK IF USER IS LOGGED IN (PAID_PDF.html)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Check localStorage first (fast)
    const isLoggedIn = localStorage.getItem('pdfUserLoggedIn') === 'true';
    const userEmail = localStorage.getItem('pdfUserEmail');
    const userName = localStorage.getItem('pdfUserName');
    const userUID = localStorage.getItem('pdfUserUID');
    
    if (isLoggedIn && userEmail) {
        // User is logged in according to localStorage
        console.log('User logged in:', userEmail);
        
        // Optional: Verify with Firebase
        if (auth.currentUser) {
            // Already have Firebase session
            loadPDFEditor();
        } else {
            // Wait for Firebase to restore session
            auth.onAuthStateChanged(function(user) {
                if (user) {
                    loadPDFEditor();
                } else {
                    // Firebase session expired, redirect to home
                    redirectToHome();
                }
            });
        }
    } else {
        // No localStorage data, redirect to home
        redirectToHome();
    }
});

function loadPDFEditor() {
    // Hide loading, show editor
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('editorContainer').style.display = 'block';
    
    // Display user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `Welcome, ${localStorage.getItem('pdfUserName') || localStorage.getItem('pdfUserEmail')}!`;
    }
    
    // Your existing PDF editor initialization code here
    console.log('PDF Editor loaded');
}

function redirectToHome() {
    // Clear any stale data
    localStorage.removeItem('pdfUserLoggedIn');
    localStorage.removeItem('pdfUserEmail');
    localStorage.removeItem('pdfUserUID');
    localStorage.removeItem('pdfUserName');
    
    // Redirect to home page
    window.location.href = 'PAID_PDF_Home.html';
}

// Optional: Add logout function for editor page
function logoutFromEditor() {
    // Clear localStorage
    localStorage.removeItem('pdfUserLoggedIn');
    localStorage.removeItem('pdfUserEmail');
    localStorage.removeItem('pdfUserUID');
    localStorage.removeItem('pdfUserName');
    
    // Sign out from Firebase
    auth.signOut().then(() => {
        window.location.href = 'PAID_PDF_Home.html';
    });
}
    
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const email = loginEmail ? loginEmail.value : '';
            const password = loginPassword ? loginPassword.value : '';
            if (!email || !password) { showNotification('Please enter email and password'); return; }
            showLoading(true);
            auth.signInWithEmailAndPassword(email, password)
                .then(() => { showNotification('Login successful!'); if (loginEmail) loginEmail.value = ''; if (loginPassword) loginPassword.value = ''; })
                .catch((error) => { let message = 'Login failed: '; if (error.code === 'auth/user-not-found') message += 'User not found'; else if (error.code === 'auth/wrong-password') message += 'Wrong password'; else message += error.message; showNotification(message, true); })
                .finally(() => showLoading(false));
        });
    }

    if (logoutButton) logoutButton.addEventListener('click', logout);
    if (logoutButtonInside) logoutButtonInside.addEventListener('click', logout);
    
    if (closeLogin) {
        closeLogin.addEventListener('click', () => {
            if (auth.currentUser) { if (loginModal) loginModal.style.display = 'none'; }
            else showNotification('Please login to continue');
        });
    }
    
    if (loginPassword) loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter' && loginButton) loginButton.click(); });
    if (loginEmail) loginEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter' && loginPassword) loginPassword.focus(); });
    if (loginStatusBtn) loginStatusBtn.addEventListener('click', () => { if (loginModal) loginModal.style.display = 'flex'; });
    
    window.approvePayment = approvePayment;
    window.rejectPayment = rejectPayment;

    // Window functions for tools management
    window.lockAllTools = lockAllTools;
    window.unlockSpecificTool = unlockSpecificTool;
    window.lockSpecificTool = lockSpecificTool;
    window.updateToolUnlockStatus = updateToolUnlockStatus;
    window.checkAndUpdateToolsAccess = checkAndUpdateToolsAccess;
    window.saveToolsAccessToDatabase = saveToolsAccessToDatabase;
    window.showAdvancedToolsPanel = showAdvancedToolsPanel;
    window.hideAdvancedToolsPanel = hideAdvancedToolsPanel;
    
    window.activateTool = activateTool;
    window.toolBatchProcessing = toolBatchProcessing;
    window.toolPDFMerger = toolPDFMerger;
    window.toolOCRScanner = toolOCRScanner;
    window.toolPDFCompression = toolPDFCompression;
    window.toolWatermarkPro = toolWatermarkPro;
    window.toolDigitalSignature = toolDigitalSignature;
    window.toolTemplateLibrary = toolTemplateLibrary;
    window.toolFormRecognition = toolFormRecognition;
    window.toolPDFSearchHighlight = toolPDFSearchHighlight;
    window.toolWriteTextFull = toolWriteTextFull;

    window.unlockToolsForCurrentUser = async function() {
        const user = auth.currentUser;
        if (!user) { console.log('❌ No user logged in'); return; }
        try {
            checkPurchaseAndUnlock(userData);
            await saveToolsAccessToDatabase(user.uid, true);
            console.log('✓ All tools unlocked for:', user.email);
        } catch (error) {
            console.error('Error unlocking tools:', error);
        }
    };
    
    window.lockToolsForCurrentUser = async function() {
        const user = auth.currentUser;
        if (!user) { console.log('❌ No user logged in'); return; }
        try {
            lockAllTools();
            await saveToolsAccessToDatabase(user.uid, false);
            console.log('✓ All tools locked for:', user.email);
        } catch (error) {
            console.error('Error locking tools:', error);
        }
    };
    
    window.checkToolsStatus = function() {
        const user = auth.currentUser;
        if (!user) { console.log('❌ No user logged in'); return; }
        const toolCards = document.querySelectorAll('.tool-card');
        const lockedCount = document.querySelectorAll('.tool-card.locked').length;
        const unlockedCount = toolCards.length - lockedCount;
        
        console.log(`%c📊 Tools Status for ${user.email}`, 'color: #2563eb; font-weight: bold;');
        console.log(`Total Tools: ${toolCards.length}`);
        console.log(`%cUnlocked: ${unlockedCount}`, 'color: #059669; font-weight: bold;');
        console.log(`%cLocked: ${lockedCount}`, 'color: #dc2626; font-weight: bold;');
        
        const tools = Array.from(toolCards).map(card => ({
            name: card.querySelector('.name').textContent,
            status: card.classList.contains('locked') ? '🔒 Locked' : '🔓 Unlocked'
        }));
        console.table(tools);
    };
    
    // Configure PDF.js worker
    if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    init();
});
