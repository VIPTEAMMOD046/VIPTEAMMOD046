javascript:(function(){
// MKU Complete Data Portal with Auto-Detect & Update
const SVG_ICONS = {
    results: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    college: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    student: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M8 11h6M11 8v6"/></svg>',
    facility: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>',
    accreditation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    degree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    new: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>'
};

// Default MKU Data
const DEFAULT_MKU_DATA = {
    "Results": {
        icon: 'results',
        items: {
            "Main Results Portal": "https://result.mkuniversity.ac.in/",
            "B.Sc April 2023": "https://result.mkuniversity.ac.in/ug_bsc_apr23/",
            "B.Com April 2023": "https://result.mkuniversity.ac.in/ug_bcom_apr23/",
            "BA April 2023": "https://result.mkuniversity.ac.in/ba23/",
            "BBA April 2023": "https://result.mkuniversity.ac.in/ug_bba_apr23/",
            "PG April 2023": "https://result.mkuniversity.ac.in/pgapr23new/",
            "MBA April 2023": "https://result.mkuniversity.ac.in/pgapr23/",
            "Supplementary July 2023": "https://result.mkuniversity.ac.in/result_sup/",
            "Revaluation": "https://result.mkuniversity.ac.in/ug_reval/",
            "Hall Ticket": "https://mkuniversity.ac.in/hallticketpgcbcsapr23/"
        }
    },
    "Examinations": {
        icon: 'exam',
        items: {
            "Exam Schedule": "https://mkuniversity.ac.in/new/examination/ExaminationSchedule",
            "CBCS Forms": "https://mkuniversity.ac.in/new/examination/cbcsform",
            "Seniority List": "https://mkuniversity.ac.in/new/examination/SeniorityListExam",
            "NAD": "https://mkuniversity.ac.in/new/examination/nad",
            "e-SANAD": "https://mkuniversity.ac.in/new/examination/e-SANAD"
        }
    },
    "Forms & Certificates": {
        icon: 'form',
        items: {
            "Provisional Certificate": "https://mkuniversity.ac.in/new/forms/MKU_provisionalcertificate.pdf",
            "Migration Certificate": "https://mkuniversity.ac.in/new/forms/MKU_migrationcertificate.pdf",
            "Special Degree": "https://mkuniversity.ac.in/new/forms/MKU_special_degree_certificate.pdf",
            "Fees Structure": "https://mkuniversity.ac.in/new/forms/MKU-feesstructure1.pdf"
        }
    },
    "Colleges": {
        icon: 'college',
        items: {
            "Affiliated Colleges": "https://mkuniversity.ac.in/new/acollege/afc",
            "Aided Colleges": "https://mkuniversity.ac.in/new/acollege/ac",
            "Autonomous": "https://mkuniversity.ac.in/new/acollege/autocol",
            "MKU College": "https://mkuniversity.ac.in/new/acollege/mkucol",
            "Constituent": "https://mkuniversity.ac.in/new/acollege/concol",
            "Evening Colleges": "https://mkuniversity.ac.in/new/acollege/mkuecol",
            "Self Finance": "https://mkuniversity.ac.in/new/acollege/selffcol",
            "Approved Institutions": "https://mkuniversity.ac.in/new/acollege/appins"
        }
    },
    "Student Services": {
        icon: 'student',
        items: {
            "Student's Corner": "https://mkuniversity.ac.in/new/studentscorner/studentscornernew",
            "International Students": "https://mkuniversity.ac.in/new/international/index",
            "Counselling Cell": "https://mkuniversity.ac.in/new/scc/index",
            "Placement Cell": "https://mkuniversity.ac.in/new/ptc",
            "Scholarships": "https://mkuniversity.ac.in/new/Quicklinks/scholarship",
            "Career": "https://mkuniversity.ac.in/new/Quicklinks/Career",
            "Alumni": "https://mkuniversity.ac.in/new/alumni/index"
        }
    },
    "Research": {
        icon: 'research',
        items: {
            "Research Portal": "http://mkuniversity.ac.in/research/",
            "NRCBS": "http://www.nrcbsmku.org/",
            "Research Management": "http://rsm.mkuniversity.ac.in/WelcomeDashboard"
        }
    },
    "Facilities": {
        icon: 'facility',
        items: {
            "Library": "http://www.mkulibrary.org/",
            "Hostel": "https://mkuniversity.ac.in/new/Facilities/Hostel",
            "Health Centre": "https://mkuniversity.ac.in/new/Facilities/Health_Care_Center",
            "Bank": "https://mkuniversity.ac.in/new/Facilities/bank",
            "CIC": "https://mkuniversity.ac.in/new/Facilities/fcic",
            "Transport": "https://mkuniversity.ac.in/new/Facilities/Transport"
        }
    },
    "Accreditation": {
        icon: 'accreditation',
        items: {
            "NIRF": "https://mkuniversity.ac.in/new/nirf/NIRF_2022_REPORT",
            "IQAC": "https://mkuniversity.ac.in/new/iqac",
            "NAAC": "https://mkuniversity.ac.in/new/University/naac"
        }
    }
};

// Get saved custom links
let customLinks = {};
try {
    customLinks = JSON.parse(localStorage.getItem('mku_custom_links') || '{}');
} catch(e) {}

// Auto-detect new links from current page
const detectedLinks = {};
document.querySelectorAll('a[href]').forEach(a => {
    const text = a.textContent.trim();
    const href = a.href;
    if(text && href && (href.includes('mkuniversity') || href.includes('result.mkuniversity'))) {
        if(!detectedLinks[text]) {
            detectedLinks[text] = href;
        }
    }
});

// Merge detected links
let newLinksCount = 0;
for(const [text, href] of Object.entries(detectedLinks)) {
    if(!customLinks[text]) {
        customLinks[text] = href;
        newLinksCount++;
    }
}

// Save updated links
localStorage.setItem('mku_custom_links', JSON.stringify(customLinks));

// Add custom links to menu
if(Object.keys(customLinks).length > 0) {
    DEFAULT_MKU_DATA["Custom Links"] = {
        icon: 'link',
        items: customLinks
    };
}

// Create Portal UI
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;';

const portal = document.createElement('div');
portal.style.cssText = 'background:#fff;border-radius:15px;padding:20px;max-width:600px;width:95%;max-height:90vh;overflow-y:auto;font-family:Arial;';

let sections = '';
for(const [section, data] of Object.entries(DEFAULT_MKU_DATA)) {
    const icon = SVG_ICONS[data.icon] || SVG_ICONS.link;
    sections += `
        <div style="margin-bottom:15px;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#003399,#0078e7);color:#fff;padding:12px 15px;font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;">
                ${icon}
                ${section}
                ${section === 'Custom Links' && newLinksCount > 0 ? `<span style="background:#ff4444;padding:2px 8px;border-radius:10px;font-size:9px;margin-left:8px;">${newLinksCount} NEW</span>` : ''}
            </div>
            <div style="padding:10px;background:#fafafa;">
                ${Object.entries(data.items).map(([name,url]) => `
                    <a href="${url}" target="_blank" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;margin:3px 0;background:#fff;color:#333;text-decoration:none;border-radius:5px;font-size:12px;border:1px solid #e0e0e0;transition:all 0.2s;" onmouseover="this.style.background='#0078e7';this.style.color='#fff';this.style.borderColor='#0078e7';" onmouseout="this.style.background='#fff';this.style.color='#333';this.style.borderColor='#e0e0e0';">
                        <span style="display:flex;align-items:center;">${SVG_ICONS.link}${name}</span>
                        ${detectedLinks[name] ? SVG_ICONS.new : ''}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

portal.innerHTML = `
    <div style="text-align:center;margin-bottom:15px;">
        <div style="width:50px;height:50px;background:linear-gradient(135deg,#003399,#0078e7);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="width:25px;height:25px;">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
        </div>
        <h2 style="color:#003399;margin:0;font-size:18px;">MKU Data Portal</h2>
        <p style="color:#666;font-size:11px;margin:5px 0;">Madurai Kamaraj University - Complete Access</p>
        ${newLinksCount > 0 ? `<p style="color:#ff4444;font-size:10px;margin:5px 0;font-weight:bold;">${newLinksCount} new link(s) detected!</p>` : ''}
    </div>
    
    <div style="margin-bottom:15px;">
        <div style="position:relative;margin-bottom:8px;">
            <input type="text" id="regSearch" placeholder="Enter Register Number..." style="width:100%;padding:12px 15px 12px 40px;border:2px solid #0078e7;border-radius:8px;font-size:13px;outline:none;font-family:Arial;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#0078e7;">${SVG_ICONS.search}</span>
        </div>
        <button onclick="checkRegResult(this)" style="width:100%;padding:12px;background:linear-gradient(135deg,#003399,#0078e7);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;">
            ${SVG_ICONS.degree}
            Check Results
        </button>
        <button onclick="refreshLinks(this)" style="width:100%;padding:10px;margin-top:8px;background:#28a745;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
            ${SVG_ICONS.refresh}
            Refresh & Detect New Links
        </button>
    </div>
    
    ${sections}
    
    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#dc3545;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;">
        ${SVG_ICONS.close}
        Close Portal
    </button>
`;

overlay.appendChild(portal);
document.body.appendChild(overlay);

// Result checking function
window.checkRegResult = function(btn) {
    const reg = document.getElementById('regSearch').value;
    if(!reg) {
        alert('Please enter register number');
        return;
    }
    
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4"/><path d="M22 12a10 10 0 1 1-10-10"/></svg> Checking...';
    
    const resultUrls = [
        `https://result.mkuniversity.ac.in/ug_bsc_apr23/ugresults.php`,
        `https://result.mkuniversity.ac.in/ug_bcom_apr23/ugresults.php`,
        `https://result.mkuniversity.ac.in/ba23/ugresults.php`,
        `https://result.mkuniversity.ac.in/ug_bba_apr23/ugresults.php`,
        `https://result.mkuniversity.ac.in/pgapr23new/ugresults.php`,
        `https://result.mkuniversity.ac.in/pgapr23/ugresults.php`
    ];
    
    let foundCount = 0;
    resultUrls.forEach(async (url) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'search=' + reg + '&submit=Submit'
            });
            const html = await res.text();
            if(html.includes(reg) && !html.includes('No Record')) {
                foundCount++;
                const w = window.open('', '_blank');
                if(w && foundCount === 1) {
                    w.document.write(html);
                }
                btn.innerHTML = SVG_ICONS.degree + ' Result Found!';
            }
        } catch(e) {
            btn.innerHTML = SVG_ICONS.degree + ' Check Results';
        }
    });
    
    setTimeout(() => {
        if(foundCount === 0) {
            btn.innerHTML = SVG_ICONS.degree + ' No Result Found';
            alert('No results found for register number: ' + reg);
        }
    }, 5000);
};

// Refresh links function
window.refreshLinks = function(btn) {
    btn.innerHTML = SVG_ICONS.refresh + ' Refreshing...';
    setTimeout(() => {
        overlay.remove();
        // Re-run the script
        location.reload();
    }, 1000);
};

// Add spin animation
const style = document.createElement('style');
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// Fetch latest links from MKU website
async function fetchLatestLinks() {
    try {
        const response = await fetch('https://mkuniversity.ac.in/new/');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newLinks = {};
        doc.querySelectorAll('a[href]').forEach(a => {
            const text = a.textContent.trim();
            const href = a.href;
            if(text && href && (href.includes('result') || href.includes('hallticket') || href.includes('examination'))) {
                if(!customLinks[text]) {
                    newLinks[text] = href;
                }
            }
        });
        
        if(Object.keys(newLinks).length > 0) {
            Object.assign(customLinks, newLinks);
            localStorage.setItem('mku_custom_links', JSON.stringify(customLinks));
            console.log('🆕 New links found:', newLinks);
        }
    } catch(err) {
        console.log('Could not fetch latest links');
    }
}

fetchLatestLinks();
})();
