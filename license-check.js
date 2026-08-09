// license-check.js - Firebase-powered expiration system
(function() {
    'use strict';
    
    // Firebase Configuration
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCQXFVVGKoESiXvRSNvcdOCHk3JJRauweo",
        projectId: "bypass-menu",
        storageBucket: "bypass-menu.firebasestorage.app"
    };
    
    // Load Firebase SDK dynamically
    function loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            // Check if Firebase already loaded
            if (window.firebase && window.firebase.database) {
                resolve();
                return;
            }
            
            // Load Firebase App
            const appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
            appScript.onload = () => {
                // Load Firebase Database
                const dbScript = document.createElement('script');
                dbScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
                dbScript.onload = resolve;
                dbScript.onerror = reject;
                document.head.appendChild(dbScript);
            };
            appScript.onerror = reject;
            document.head.appendChild(appScript);
        });
    }
    
    // Initialize Firebase
    async function initFirebase() {
        try {
            await loadFirebaseSDK();
            
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
                console.log('🔥 Firebase initialized');
            }
            
            return firebase.database();
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return null;
        }
    }
    
    // Fetch expiration from Firebase Realtime Database
    async function fetchExpirationFromFirebase(database) {
        try {
            console.log('🔥 Fetching license from Firebase...');
            
            const licenseRef = database.ref('licenses/bypass-menu');
            const snapshot = await licenseRef.once('value');
            const licenseData = snapshot.val();
            
            if (licenseData && licenseData.expiration) {
                console.log('✅ Firebase data:', licenseData);
                
                // Store additional data globally
                window.bypassFirebaseData = licenseData;
                
                return parseExpirationDate(licenseData.expiration);
            } else {
                throw new Error('No expiration data in Firebase');
            }
        } catch (error) {
            console.warn('⚠️ Firebase fetch failed:', error.message);
            return null;
        }
    }
    
    // Parse various date formats
    function parseExpirationDate(dateValue) {
        try {
            // If it's a timestamp number
            if (typeof dateValue === 'number') {
                return new Date(dateValue);
            }
            
            // If it's a string timestamp
            if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
                return new Date(parseInt(dateValue));
            }
            
            // If it's a date string
            if (typeof dateValue === 'string') {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) return date;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // Fallback expiration (if Firebase fails)
    const FALLBACK_EXPIRATION = new Date(2026, 11, 31); // December 31, 2026
    
    // Show notice UI
    function showExpirationNotice(expDate, daysRemaining = 0, firebaseData = null) {
        const existingNotice = document.getElementById('license-expired-notice');
        if (existingNotice) existingNotice.remove();
        
        const isExpired = daysRemaining <= 0;
        const bgColor = isExpired ? '#e74c3c' : (daysRemaining <= 7 ? '#f39c12' : '#27ae60');
        
        // Get version from Firebase if available
        const version = firebaseData?.version || '1.0';
        const features = firebaseData?.features || 'Standard';
        
        const notice = document.createElement('div');
        notice.id = 'license-expired-notice';
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);
                color: white;
                padding: 20px;
                border-radius: 12px;
                z-index: 999999;
                font-family: 'Segoe UI', Arial, sans-serif;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                animation: slideIn 0.5s ease-out;
                max-width: 320px;
                backdrop-filter: blur(10px);
            ">
                <style>
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 24px; margin-right: 10px;">
                        ${isExpired ? '⚠️' : (daysRemaining <= 7 ? '⏳' : '✅')}
                    </span>
                    <h3 style="margin:0;">
                        ${isExpired ? 'License Expired' : (daysRemaining <= 7 ? 'Expiring Soon' : 'License Active')}
                    </h3>
                </div>
                
                <div style="
                    background: rgba(255,255,255,0.15);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                ">
                    <p style="margin:0 0 8px 0; font-size:14px;">
                        <strong>📅 Expiration:</strong> ${expDate.toLocaleDateString()}
                    </p>
                    <p style="margin:0 0 8px 0; font-size:14px;">
                        <strong>⏰ Status:</strong> ${isExpired ? 'Expired' : `${daysRemaining} days remaining`}
                    </p>
                    ${firebaseData ? `
                        <p style="margin:0 0 4px 0; font-size:12px; opacity:0.8;">
                            Version: ${version} | Features: ${features}
                        </p>
                    ` : ''}
                </div>
                
                ${isExpired ? `
                    <p style="margin:0 0 12px 0; font-size:13px; text-align:center;">
                        Contact support@pdfformeditorpro.in for renewal
                    </p>
                ` : ''}
                
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: white;
                    color: ${bgColor};
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" 
                   onmouseout="this.style.transform='scale(1)'">
                    ${isExpired ? 'Close' : 'Got it!'}
                </button>
            </div>
        `;
        document.body.appendChild(notice);
        
        // Auto-hide success notices
        if (!isExpired && daysRemaining > 7) {
            setTimeout(() => {
                const el = document.getElementById('license-expired-notice');
                if (el) {
                    el.style.animation = 'slideOut 0.5s ease-in';
                    setTimeout(() => el.remove(), 500);
                }
            }, 5000);
        }
    }
    
    // Add slideOut animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Main execution
    async function checkLicense() {
        console.log('🔐 Starting Firebase license verification...');
        
        let EXPIRATION_DATE = null;
        let firebaseData = null;
        
        // Try Firebase first
        const database = await initFirebase();
        
        if (database) {
            EXPIRATION_DATE = await fetchExpirationFromFirebase(database);
            firebaseData = window.bypassFirebaseData;
        }
        
        // Fallback if Firebase fails
        if (!EXPIRATION_DATE) {
            console.warn('⚠️ Using fallback expiration date');
            EXPIRATION_DATE = FALLBACK_EXPIRATION;
        }
        
        const currentDate = new Date();
        
        console.log('📅 Current date:', currentDate.toISOString());
        console.log('📅 Expiration date:', EXPIRATION_DATE.toISOString());
        
        const timeDiff = EXPIRATION_DATE - currentDate;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Set global variables
        if (currentDate > EXPIRATION_DATE) {
            window.bypassLicenseValid = false;
            window.bypassLicenseMessage = 'Expired on ' + EXPIRATION_DATE.toLocaleDateString();
            console.error('❌ License EXPIRED');
        } else {
            window.bypassLicenseValid = true;
            window.bypassLicenseDaysRemaining = daysRemaining;
            window.bypassLicenseMessage = `Valid - ${daysRemaining} days remaining`;
            console.log(`✅ License valid - ${daysRemaining} days remaining`);
            
            if (daysRemaining <= 7) {
                window.bypassLicenseWarning = daysRemaining;
            }
        }
        
        // Store complete data
        window.bypassExpirationData = {
            expired: currentDate > EXPIRATION_DATE,
            expirationDate: EXPIRATION_DATE.toISOString(),
            daysRemaining: daysRemaining,
            checkedAt: currentDate.toISOString(),
            source: firebaseData ? 'firebase' : 'fallback',
            version: firebaseData?.version || '1.0',
            features: firebaseData?.features || 'standard'
        };
        
        // Show notice
        showExpirationNotice(EXPIRATION_DATE, daysRemaining, firebaseData);
    }
    
    // Execute
    checkLicense().catch(error => {
        console.error('❌ Fatal error:', error);
        window.bypassLicenseValid = false;
        showExpirationNotice(FALLBACK_EXPIRATION, 0);
    });
    
})();
