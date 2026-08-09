// license-check.js - Expiration checker
(function() {
    'use strict';
    
    const EXPIRATION_DATE = new Date(2026, 7, 9); // August 9, 2026
    const currentDate = new Date();
    
    console.log('🔐 Checking license...');
    console.log('📅 Current date:', currentDate.toDateString());
    console.log('📅 Expiration:', EXPIRATION_DATE.toDateString());
    
    // Update license status in menu
    function updateLicenseStatus(message, isExpired = false) {
        const statusDiv = document.getElementById('license-status');
        if (statusDiv) {
            statusDiv.innerHTML = message;
            statusDiv.style.background = isExpired ? '#e74c3c' : '#27ae60';
        }
    }
    
    // Check expiration
    if (currentDate > EXPIRATION_DATE) {
        updateLicenseStatus('❌ License EXPIRED on ' + EXPIRATION_DATE.toLocaleDateString(), true);
        console.error('❌ License expired');
        
        // Disable menu features
        setTimeout(() => {
            const buttons = document.querySelectorAll('#bypass-menu button');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'License expired';
            });
        }, 1000);
        
        // Show expiration alert
        setTimeout(() => {
            alert('⚠️ License expired! Please renew to continue using BYPASS features.');
        }, 1500);
        
    } else {
        // Calculate remaining time
        const daysRemaining = Math.ceil((EXPIRATION_DATE - currentDate) / (1000 * 60 * 60 * 24));
        updateLicenseStatus(`✅ License active - ${daysRemaining} days remaining`, false);
        console.log(`✅ License valid for ${daysRemaining} more days`);
        
        // Show warning if close to expiration
        if (daysRemaining <= 30) {
            setTimeout(() => {
                alert(`⚠️ License expires in ${daysRemaining} days. Renew now to avoid interruption.`);
            }, 2000);
        }
    }
    
})();
