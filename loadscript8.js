javascript:(function(){
// Anna University Complete Menu with Results
const SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    dept: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    result: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M8 11h6M11 8v6"/></svg>'
};

const MENU_DATA = {
    "🏛️ Main Pages": {
        icon: 'home',
        items: {
            "Home": "https://www.annauniv.edu/index.php",
            "NIRF": "https://www.annauniv.edu/nirf.php",
            "Contact Us": "https://www.annauniv.edu/contactus.php",
            "Events": "https://www.annauniv.edu/events.php",
            "Photo Gallery": "https://www.annauniv.edu/photogallery.php",
            "Privacy Policy": "https://www.annauniv.edu/privacy_policy.php"
        }
    },
    "🎯 Results & Exams": {
        icon: 'result',
        items: {
            "COE Results Portal": "https://coe.annauniv.edu/home/",
            "TANCET": "https://tancet.annauniv.edu/tancet",
            "COE Administration": "https://aucoe.annauniv.edu/administration.php",
            "CFA Merit List": "https://cfa.annauniv.edu/cfa/merit.html",
            "Online Services": "https://onlineservices.annauniv.edu/",
            "Grade Verification": "https://gverify.annauniv.edu/"
        }
    },
    "👨‍💼 Administration": {
        icon: 'admin',
        items: {
            "Administration": "https://www.annauniv.edu/administration.php",
            "Syndicate": "https://www.annauniv.edu/syndicate.php",
            "Finance Officers": "https://www.annauniv.edu/finance_officers.php",
            "Officers": "https://www.annauniv.edu/officers.php",
            "Deans": "https://www.annauniv.edu/deans.php",
            "Chairman": "https://www.annauniv.edu/chairman.php",
            "Directors": "https://www.annauniv.edu/directors.php",
            "HODs": "https://www.annauniv.edu/hod.php",
            "Constituent Colleges": "https://www.annauniv.edu/constituent_colleges.php",
            "Annual Budget": "https://www.annauniv.edu/Annual%20Budget.php"
        }
    },
    "🎓 Departments": {
        icon: 'dept',
        items: {
            "University Departments": "https://www.annauniv.edu/univdept.php",
            "CEG": "https://ceg.annauniv.edu/index.php",
            "ACT": "https://www.annauniv.edu/act/",
            "SAP": "https://www.annauniv.edu/sap",
            "MIT": "https://mitindia.edu/en/",
            "AUCoe": "http://aucoe.annauniv.edu/"
        }
    },
    "📄 Important PDFs": {
        icon: 'pdf',
        items: {
            "UG Admission 2026-27": "https://www.annauniv.edu/pdf/UG%20Admission%202026-27.pdf",
            "MBA/MCA Admission": "https://www.annauniv.edu/pdf/Circular%20for%20MBA%20%20MCA%20Admission%202026%20(1)-combined.pdf",
            "CEG Fee Structure": "https://www.annauniv.edu/pdf/CEG_UG_Fee_Structure.pdf",
            "MIT Fee Structure": "https://www.annauniv.edu/pdf/MIT_UG_Fee_Structure.pdf",
            "ACT Fee Structure": "https://www.annauniv.edu/pdf/ACT_UG_Fee_Structure.pdf",
            "University Profile": "https://www.annauniv.edu/Anna%20University%20Profile.pdf",
            "Acts & Statutes": "https://www.annauniv.edu/pdf/Acts%20&%20Statues-New.pdf",
            "All Policies": "https://www.annauniv.edu/pdf/All%20Policies.pdf",
            "Telephone Directory": "https://www.annauniv.edu/pdf/telephone_directory.pdf",
            "Anti-Ragging": "https://www.annauniv.edu/pdf/Anti_Ragging_Committee_Squad.pdf"
        }
    },
    "🌐 Important Links": {
        icon: 'link',
        items: {
            "Library": "https://library.annauniv.edu/",
            "IQAC": "https://iqac.annauniv.edu/",
            "Affiliations": "https://affiliations.annauniv.edu/",
            "CUIC": "https://cuic.annauniv.edu/",
            "Alumni": "https://alumni.annauniv.edu/",
            "E-Learning": "https://auelearn.annauniv.edu/",
            "CDE": "https://cde.annauniv.edu/",
            "CFD": "https://cfd.annauniv.edu/",
            "Grievance Portal": "https://www.auegov.ac.in/GrievancePortal/"
        }
    },
    "🏢 Centres & Cells": {
        icon: 'dept',
        items: {
            "Health Centre": "https://www.annauniv.edu/HealthCentre",
            "POSH": "https://www.annauniv.edu/POSH/index.php",
            "Women Empowerment": "https://www.annauniv.edu/WomenEmpCentre/index.php",
            "SC/ST Cell": "https://www.annauniv.edu/scstcell/index.html",
            "IPR": "https://www.annauniv.edu/ipr/",
            "Estate Office": "https://estateoffice.annauniv.edu/estateoffice/"
        }
    },
    "📱 Social Media": {
        icon: 'link',
        items: {
            "YouTube": "https://www.youtube.com/channel/UCvR0vYmjwNCmVFyTdSAKvMA/",
            "Instagram": "https://www.instagram.com/anna_university.chennai/",
            "Facebook": "https://www.facebook.com/auchennaiofficial",
            "Twitter": "https://twitter.com/auvcochennai",
            "LinkedIn": "https://www.linkedin.com/company/annauniversity-chennai"
        }
    }
};

// Create Menu UI
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial;';

const menu = document.createElement('div');
menu.style.cssText = 'background:#fff;border-radius:15px;padding:20px;max-width:550px;width:95%;max-height:90vh;overflow-y:auto;';

let sectionsHTML = '';
for(const [section, data] of Object.entries(MENU_DATA)) {
    const icon = SVG[data.icon] || SVG.link;
    const isResult = section.includes('Result');
    sectionsHTML += `
        <div style="margin-bottom:12px;border:2px solid ${isResult ? '#28a745' : '#e0e0e0'};border-radius:10px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,${isResult ? '#28a745' : '#1a237e'},${isResult ? '#20c997' : '#0d47a1'});color:#fff;padding:12px 15px;font-weight:bold;font-size:13px;display:flex;align-items:center;">
                ${icon}
                ${section}
                <span style="margin-left:auto;font-size:10px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;">${Object.keys(data.items).length}</span>
            </div>
            <div style="padding:8px;background:#fafafa;">
                ${Object.entries(data.items).map(([name,url]) => `
                    <a href="${url}" target="_blank" style="display:flex;align-items:center;padding:8px 10px;margin:3px 0;background:#fff;color:#333;text-decoration:none;border-radius:5px;font-size:12px;border:1px solid #e0e0e0;transition:all 0.2s;" onmouseover="this.style.background='${isResult ? '#28a745' : '#0d47a1'}';this.style.color='#fff';this.style.borderColor='${isResult ? '#28a745' : '#0d47a1'}';" onmouseout="this.style.background='#fff';this.style.color='#333';this.style.borderColor='#e0e0e0';">
                        ${SVG.link}
                        ${name}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

menu.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
        <div style="width:60px;height:60px;background:linear-gradient(135deg,#1a237e,#0d47a1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="width:30px;height:30px;">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
        </div>
        <h2 style="color:#1a237e;margin:0;font-size:20px;">Anna University</h2>
        <p style="color:#666;font-size:11px;margin:5px 0;">Chennai - Complete Portal</p>
    </div>
    ${sectionsHTML}
    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#dc3545;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;">
        ${SVG.close}
        Close Menu
    </button>
`;

overlay.appendChild(menu);
document.body.appendChild(overlay);
})();
