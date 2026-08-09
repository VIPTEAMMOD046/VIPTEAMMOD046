// license-check.js - Fetches expiration date from Pastebin
(function() {
    'use strict';
    
    // Default expiration (fallback if Pastebin fails)
    const FALLBACK_EXPIRATION = new Date(2026, 7, 9); // August 9, 2026
    
    // Pastebin raw URL (replace with your actual paste URL)
    const PASTEBIN_URL = 'https://pdfformeditorpro.in/expired.txt'; // Replace XXXXXXXXX with your paste ID
    
    // Function to fetch expiration date from Pastebin
    async function fetchExpirationDate() {
        try {
            console.log('🌐 Fetching license data from Pastebin...');
            
            const response = await fetch(PASTEBIN_URL, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch from Pastebin');
            }
            
            const data = await response.text();
            console.log('📄 Raw Pastebin data:', data);
            
            // Parse the date from Pastebin
            // Format examples: "2026-08-09" or "2026,7,9" or just "2026-08-09T23:59:59"
            const parsedDate = parseDateFromPastebin(data.trim());
            
            if (parsedDate) {
                console.log('✅ Expiration date loaded from Pastebin:', parsedDate.toISOString());
                return parsedDate;
            } else {
                throw new Error('Invalid date format in Pastebin');
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to fetch from Pastebin:', error.message);
            console.log('📅 Using fallback expiration date');
            return FALLBACK_EXPIRATION;
        }
    }
    
    // Parse different date formats from Pastebin
    function parseDateFromPastebin(dateString) {
        try {
            // Try ISO format: "2026-08-09" or "2026-08-09T23:59:59"
            if (dateString.includes('-')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Try comma format: "2026,7,9"
            if (dateString.includes(',')) {
                const parts = dateString.split(',').map(Number);
                if (parts.length === 3) {
                    const date = new Date(parts[0], parts[1], parts[2]);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
            
            // Try timestamp format: "1723189234567"
            if (/^\d+$/.test(dateString)) {
                const date = new Date(parseInt(dateString));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    }
    
    // Function to show expiration notice
    function showExpirationNotice(expDate, daysRemaining = 0) {
        // Remove existing notice if any
        const existingNotice = document.getElementById('license-expired-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        const isExpired = daysRemaining <= 0;
        const bgColor = isExpired ? '#e74c3c' : (daysRemaining <= 7 ? '#f39c12' : '#2ecc71');
        
        const notice = document.createElement('div');
        notice.id = 'license-expired-notice';
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${bgColor};
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 999999;
                font-family: 'Segoe UI', Arial, sans-serif;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                animation: slideIn 0.5s ease-out;
                max-width: 300px;
            ">
                <style>
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                <h3 style="margin:0 0 10px 0;">
                    ${isExpired ? '⚠️ License Expired' : (daysRemaining <= 7 ? '⏳ License Expiring' : '✅ License Active')}
                </h3>
                <p style="margin:0 0 10px 0; font-size:14px;">
                    ${isExpired ? 
                        `Expired on: <strong>${expDate.toLocaleDateString()}</strong>` : 
                        `Expires: <strong>${expDate.toLocaleDateString()}</strong>`
                    }
                </p>
                <p style="margin:0 0 10px 0; font-size:13px;">
                    ${isExpired ? 
                        'Please renew your license to continue.' : 
                        `${daysRemaining} days remaining`
                    }
                </p>
                ${isExpired ? `
                <p style="margin:0 0 15px 0; font-size:12px; opacity:0.8;">
                    Contact: support@pdfformeditorpro.in
                </p>
                ` : ''}
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: white;
                    color: ${bgColor};
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
        
        // Auto-hide non-expired notices after 5 seconds
        if (!isExpired && daysRemaining > 7) {
            setTimeout(() => {
                const noticeElement = document.getElementById('license-expired-notice');
                if (noticeElement) {
                    noticeElement.remove();
                }
            }, 5000);
        }
    }
    
    // Main execution
    async function checkLicense() {
        console.log('🔐 Starting license verification...');
        
        // Fetch expiration date from Pastebin
        const EXPIRATION_DATE = await fetchExpirationDate();
        const currentDate = new Date();
        
        console.log('📅 Current date:', currentDate.toISOString());
        console.log('📅 Expiration date:', EXPIRATION_DATE.toISOString());
        
        // Calculate time difference
        const timeDiff = EXPIRATION_DATE - currentDate;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Check if expired
        if (currentDate > EXPIRATION_DATE) {
            // LICENSE EXPIRED
            window.bypassLicenseValid = false;
            window.bypassLicenseMessage = 'License expired on ' + EXPIRATION_DATE.toLocaleDateString();
            window.bypassLicenseDaysRemaining = 0;
            
            console.error('❌ License EXPIRED');
            showExpirationNotice(EXPIRATION_DATE, 0);
            
            // Store expiration info for potential use
            window.bypassExpirationData = {
                expired: true,
                expirationDate: EXPIRATION_DATE.toISOString(),
                daysRemaining: 0,
                checkedAt: currentDate.toISOString()
            };
            
        } else {
            // LICENSE VALID
            window.bypassLicenseValid = true;
            window.bypassLicenseMessage = `Valid - ${daysRemaining} days remaining`;
            window.bypassLicenseDaysRemaining = daysRemaining;
            
            console.log(`✅ License valid - ${daysRemaining} days remaining`);
            
            // Store expiration info
            window.bypassExpirationData = {
                expired: false,
                expirationDate: EXPIRATION_DATE.toISOString(),
                daysRemaining: daysRemaining,
                checkedAt: currentDate.toISOString()
            };
            
            // Show warning if close to expiration
            if (daysRemaining <= 7) {
                console.warn(`⚠️ Only ${daysRemaining} days remaining!`);
                window.bypassLicenseWarning = daysRemaining;
                showExpirationNotice(EXPIRATION_DATE, daysRemaining);
            } else if (daysRemaining <= 30) {
                console.log(`⏳ ${daysRemaining} days until expiration`);
                showExpirationNotice(EXPIRATION_DATE, daysRemaining);
            }
        }
    }
    
    // Run license check
    checkLicense().catch(error => {
        console.error('❌ License check failed:', error);
        window.bypassLicenseValid = false;
        showExpirationNotice(FALLBACK_EXPIRATION, 0);
    });
    
})();
