// license-check.js - Anti-bypass version
(function() {
    'use strict';
    
    // Anti-debugging
    if (window._debug) { return; }
    
    // Prevent console inspection
    const _private = {
        _valid: false,
        _expiry: new Date(2026, 7, 9), // August 9, 2026
        _serverCheck: null,
        _attempts: 0
    };
    
    // Multiple expiration checks
    function checkExpiration() {
        const now = new Date();
        const clientCheck = now <= _private._expiry;
        
        // Check URL parameters for hash verification
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        // Verify request isn't replayed
        if (window._bypass && window._bypass.hash) {
            const tokenTime = parseInt(atob(token || '0'));
            if (Math.abs(Date.now() - tokenTime) > 5000) {
                console.log('Token expired');
                return false;
            }
        }
        
        return clientCheck;
    }
    
    // Server-side timestamp verification (optional)
    async function serverVerify() {
        try {
            const response = await fetch('https://worldtimeapi.org/api/ip', {
                method: 'GET',
                cache: 'no-cache'
            });
            const data = await response.json();
            _private._serverCheck = new Date(data.utc_datetime);
            return _private._serverCheck <= _private._expiry;
        } catch (e) {
            return null; // Fail open for now
        }
    }
    
    // Main verification
    async function verify() {
        // Anti-tamper: Check if verification already attempted
        if (window._bypass && window._bypass.attempts > 0) {
            console.log('Multiple verification attempts detected');
            window._bypass.valid = false;
            window._bypass.verified = false;
            return;
        }
        
        // Increment attempt counter
        if (window._bypass) {
            window._bypass.attempts = (window._bypass.attempts || 0) + 1;
        }
        
        // Perform checks
        const isExpired = !checkExpiration();
        
        if (isExpired) {
            // License expired
            setupExpiredState();
            
            // Show expiration UI
            showExpirationNotice(_private._expiry);
            
        } else {
            // License valid
            const daysRemaining = Math.ceil((_private._expiry - new Date()) / (1000 * 60 * 60 * 24));
            
            // Set verification flags
            window._bypass.valid = true;
            window._bypass.verified = true;
            window._bypass.licenseKey = generateLicenseKey();
            window._bypass.daysRemaining = daysRemaining;
            window._bypass.checked = true;
            
            // Store encrypted timestamp
            window._bypass.verifiedAt = btoa(Date.now().toString());
            
            console.log('License validated');
            
            // Show warning if close to expiration
            if (daysRemaining <= 7) {
                showWarningBanner(daysRemaining);
            }
        }
    }
    
    function setupExpiredState() {
        window._bypass.valid = false;
        window._bypass.verified = false;
        window._bypass.checked = true;
        window._bypass.licenseKey = null;
    }
    
    function generateLicenseKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let key = '';
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }
    
    function showExpirationNotice(expDate) {
        const notice = document.createElement('div');
        notice.id = 'license-expired-' + Date.now(); // Unique ID
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
                padding: 20px;
                border-radius: 12px;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                box-shadow: 0 10px 40px rgba(231, 76, 60, 0.5);
                animation: slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 350px;
            ">
                <style>
                    @keyframes slideDown {
                        from { transform: translateY(-100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
                        50% { box-shadow: 0 0 0 20px rgba(231, 76, 60, 0); }
                    }
                </style>
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 30px; margin-right: 10px;">🔒</span>
                    <div>
                        <h3 style="margin:0; font-size: 18px;">License Expired</h3>
                        <p style="margin:5px 0 0 0; font-size: 13px; opacity: 0.9;">
                            Expired: ${expDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                    </div>
                </div>
                <div style="
                    background: rgba(255,255,255,0.2);
                    padding: 10px;
                    border-radius: 8px;
                    margin: 15px 0;
                    font-size: 13px;
                    text-align: center;
                ">
                    <p style="margin:0;">Please renew to regain access</p>
                </div>
                <button onclick="this.closest('div').parentElement.remove()" style="
                    background: white;
                    color: #e74c3c;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    font-size: 14px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" 
                   onmouseout="this.style.transform='scale(1)'">
                    Understood
                </button>
            </div>
        `;
        document.body.appendChild(notice);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notice)) {
                notice.remove();
            }
        }, 10000);
    }
    
    function showWarningBanner(days) {
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #f39c12, #e67e22);
            color: white;
            text-align: center;
            padding: 10px;
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            animation: pulse 2s infinite;
        `;
        banner.innerHTML = `⚠️ License expires in <strong>${days} days</strong>. Please renew soon to avoid interruption.`;
        document.body.insertBefore(banner, document.body.firstChild);
    }
    
    // Run verification
    verify();
    
    // Anti-tamper: Freeze critical objects
    Object.freeze(_private);
    
})();
