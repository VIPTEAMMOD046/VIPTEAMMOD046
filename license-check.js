// license-check.js
(function() {
    'use strict';
    
    const EXPIRATION_DATE = new Date(2026, 7, 9); // August 9, 2026
    const currentDate = new Date();
    
    console.log('🔐 License Check:');
    console.log('📅 Current:', currentDate.toISOString());
    console.log('📅 Expires:', EXPIRATION_DATE.toISOString());
    
    // Check expiration
    if (currentDate > EXPIRATION_DATE) {
        window.bypassLicenseValid = false;
        window.bypassLicenseMessage = 'License expired on ' + EXPIRATION_DATE.toLocaleDateString();
        console.error('❌ License EXPIRED');
        
        // Show expiration UI immediately
        showExpirationNotice(EXPIRATION_DATE);
        
    } else {
        window.bypassLicenseValid = true;
        const daysRemaining = Math.ceil((EXPIRATION_DATE - currentDate) / (1000 * 60 * 60 * 24));
        window.bypassLicenseMessage = `Valid - ${daysRemaining} days remaining`;
        console.log(`✅ License valid - ${daysRemaining} days remaining`);
        
        // Show warning if close to expiration
        if (daysRemaining <= 7) {
            console.warn(`⚠️ Only ${daysRemaining} days remaining!`);
            window.bypassLicenseWarning = daysRemaining;
        }
    }
    
    // Function to show expiration notice (appears even without menu)
    function showExpirationNotice(expDate) {
        const notice = document.createElement('div');
        notice.id = 'license-expired-notice';
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #e74c3c;
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 999999;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
                animation: slideIn 0.5s ease-out;
                max-width: 300px;
            ">
                <style>
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                <h3 style="margin:0 0 10px 0;">⚠️ License Expired</h3>
                <p style="margin:0 0 10px 0; font-size:14px;">
                    Expired on: <strong>${expDate.toLocaleDateString()}</strong>
                </p>
                <p style="margin:0 0 15px 0; font-size:13px;">
                    Please renew your license to continue using BYPASS features.
                </p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: white;
                    color: #e74c3c;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                ">Close</button>
            </div>
        `;
        document.body.appendChild(notice);
    }
    
})();
