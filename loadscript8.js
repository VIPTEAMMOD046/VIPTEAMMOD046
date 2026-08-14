javascript:(function(){
// Anna University Complete Menu with ZIP Download
const SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    dept: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    result: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    hidden: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><polyline points="19 12 5 12"/><polyline points="12 19 5 12 12 5"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-left:3px;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>'
};

if(typeof jQuery !== 'undefined' && !jQuery.fn.selectpicker) {
    jQuery.fn.selectpicker = function(action) {
        if(action === 'refresh') jQuery(this).trigger('change');
        return this;
    };
}

const MENU_DATA = {
    "Main Pages": {icon:'home',items:{"Home":"https://www.annauniv.edu/index.php","NIRF":"https://www.annauniv.edu/nirf.php","Contact Us":"https://www.annauniv.edu/contactus.php","Events":"https://www.annauniv.edu/events.php","Photo Gallery":"https://www.annauniv.edu/photogallery.php"}},
    "Results & Exams": {icon:'result',items:{"COE Results":"https://coe.annauniv.edu/home/","TANCET":"https://tancet.annauniv.edu/tancet","Grade Verification":"https://gverify.annauniv.edu/"}},
    "Administration": {icon:'admin',items:{"Administration":"https://www.annauniv.edu/administration.php","Syndicate":"https://www.annauniv.edu/syndicate.php","Officers":"https://www.annauniv.edu/officers.php","Deans":"https://www.annauniv.edu/deans.php","HODs":"https://www.annauniv.edu/hod.php"}},
    "Departments": {icon:'dept',items:{"University Departments":"https://www.annauniv.edu/univdept.php","CEG":"https://ceg.annauniv.edu/index.php","MIT":"https://mitindia.edu/en/"}},
    "Important PDFs": {icon:'pdf',items:{"UG Admission":"https://www.annauniv.edu/pdf/UG%20Admission%202026-27.pdf","MBA/MCA":"https://www.annauniv.edu/pdf/Circular%20for%20MBA%20%20MCA%20Admission%202026%20(1)-combined.pdf","CEG Fees":"https://www.annauniv.edu/pdf/CEG_UG_Fee_Structure.pdf","MIT Fees":"https://www.annauniv.edu/pdf/MIT_UG_Fee_Structure.pdf","University Profile":"https://www.annauniv.edu/Anna%20University%20Profile.pdf","All Policies":"https://www.annauniv.edu/pdf/All%20Policies.pdf","Telephone Directory":"https://www.annauniv.edu/pdf/telephone_directory.pdf","Anti-Ragging":"https://www.annauniv.edu/pdf/Anti_Ragging_Committee_Squad.pdf"}},
    "Important Links": {icon:'link',items:{"Library":"https://library.annauniv.edu/","IQAC":"https://iqac.annauniv.edu/","Alumni":"https://alumni.annauniv.edu/","E-Learning":"https://auelearn.annauniv.edu/","Grievance":"https://www.auegov.ac.in/GrievancePortal/"}}
};

let allHiddenData = [];
let hiddenPDFs = [];

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial;';
const menu = document.createElement('div');
menu.style.cssText = 'background:#fff;border-radius:15px;padding:20px;max-width:600px;width:95%;max-height:90vh;overflow-y:auto;';

function renderMainPage() {
    let sectionsHTML = '';
    for(const [section, data] of Object.entries(MENU_DATA)) {
        const icon = SVG[data.icon] || SVG.link;
        const isResult = section.includes('Result');
        const isPDF = section.includes('PDF');
        sectionsHTML += `
            <div class="section-block" data-section="${section}" style="margin-bottom:12px;border:2px solid ${isResult ? '#28a745' : isPDF ? '#e53935' : '#e0e0e0'};border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,${isResult ? '#28a745' : isPDF ? '#c62828' : '#1a237e'},${isResult ? '#20c997' : isPDF ? '#ef5350' : '#0d47a1'});color:#fff;padding:12px 15px;font-weight:bold;font-size:13px;display:flex;align-items:center;">${icon}${section}<span style="margin-left:auto;font-size:10px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;">${Object.keys(data.items).length}</span></div>
                <div style="padding:8px;background:#fafafa;">
                    ${Object.entries(data.items).map(([name,url]) => `
                        <div class="menu-item" data-name="${name}" data-url="${url}" style="display:flex;align-items:center;justify-content:space-between;padding:8px;margin:3px 0;background:#fff;border-radius:5px;border:1px solid #e0e0e0;">
                            <a href="${url}" target="_blank" style="flex:1;color:#333;text-decoration:none;font-size:12px;display:flex;align-items:center;">${isPDF ? SVG.doc : SVG.link}${name}${SVG.external}</a>
                            <div style="display:flex;gap:3px;">
                                <button onclick="viewItem('${url}')" style="background:#1a237e;color:#fff;border:none;border-radius:4px;padding:4px 7px;cursor:pointer;font-size:9px;">${SVG.eye}</button>
                                <button onclick="downloadItem('${url}','${name}')" style="background:#28a745;color:#fff;border:none;border-radius:4px;padding:4px 7px;cursor:pointer;font-size:9px;">${SVG.download}</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    menu.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
            <div style="width:60px;height:60px;background:linear-gradient(135deg,#1a237e,#0d47a1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="width:30px;height:30px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <h2 style="color:#1a237e;margin:0;font-size:20px;">Anna University</h2>
            <p style="color:#666;font-size:11px;margin:5px 0;">Chennai - Complete Portal</p>
        </div>
        <div style="margin-bottom:15px;">
            <div style="position:relative;margin-bottom:5px;">
                <input type="text" id="menuSearch" placeholder="Search links..." onkeyup="filterMenu(this.value)" style="width:100%;padding:12px 15px 12px 40px;border:2px solid #1a237e;border-radius:8px;font-size:13px;outline:none;">
                <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#1a237e;">${SVG.search}</span>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                <button onclick="filterType('all')" style="flex:1;padding:6px;background:#1a237e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;">All</button>
                <button onclick="filterType('pdf')" style="flex:1;padding:6px;background:#c62828;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;">PDFs</button>
                <button onclick="filterType('php')" style="flex:1;padding:6px;background:#28a745;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;">PHP</button>
                <button onclick="downloadAllPDFs()" style="flex:1;padding:6px;background:#6a1b9a;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;">${SVG.download} All PDFs</button>
            </div>
            <button onclick="showHiddenPage()" style="width:100%;padding:10px;margin-top:5px;background:linear-gradient(135deg,#6a1b9a,#9c27b0);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;gap:8px;">${SVG.hidden} Find Hidden Data</button>
        </div>
        <div id="menuContent">${sectionsHTML}</div>
        <button onclick="this.closest('div').parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#dc3545;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;">${SVG.close} Close</button>
    `;
}

function showHiddenPage() {
    menu.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
            <div style="width:50px;height:50px;background:linear-gradient(135deg,#6a1b9a,#9c27b0);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="width:25px;height:25px;"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </div>
            <h2 style="color:#6a1b9a;margin:0;font-size:18px;">Hidden Data Finder</h2>
        </div>
        <button onclick="renderMainPage()" style="width:100%;padding:10px;margin-bottom:10px;background:#1a237e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:8px;">${SVG.back} Back to Menu</button>
        <div style="position:relative;margin-bottom:10px;">
            <input type="text" id="hiddenSearch" placeholder="Search hidden data..." onkeyup="filterHiddenData(this.value)" style="width:100%;padding:12px 15px 12px 40px;border:2px solid #6a1b9a;border-radius:8px;font-size:13px;outline:none;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#6a1b9a;">${SVG.search}</span>
        </div>
        <button onclick="downloadHiddenPDFsAsZip()" id="hiddenZipBtn" style="width:100%;padding:10px;margin-bottom:10px;background:#e65100;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;gap:8px;">${SVG.zip} Download All Hidden PDFs as ZIP</button>
        <div id="hiddenContent"><div style="text-align:center;color:#666;padding:30px;">Scanning...</div></div>
    `;
    findHiddenData();
}

async function findHiddenData() {
    allHiddenData = [];
    hiddenPDFs = [];
    try {
        const res = await fetch('https://www.annauniv.edu/');
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html,'text/html');
        
        const subs = html.match(/https?:\/\/([a-z0-9-]+)\.annauniv\.edu/gi);
        if(subs) [...new Set(subs)].forEach(s=>allHiddenData.push({type:'Subdomain',value:s}));
        
        const apis = html.match(/https?:\/\/[^"'\s>]+api[^"'\s>]*/gi);
        if(apis) [...new Set(apis)].forEach(a=>allHiddenData.push({type:'API',value:a}));
        
        const ems = doc.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if(ems) [...new Set(ems)].forEach(e=>allHiddenData.push({type:'Email',value:e}));
        
        const phs = doc.body.innerText.match(/(?:\+91[-\s]?)?[0]?(?:[-\s]?\d){10}/g);
        if(phs) [...new Set(phs)].forEach(p=>allHiddenData.push({type:'Phone',value:p}));
        
        const ips = html.match(/\b(?:10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
        if(ips) [...new Set(ips)].forEach(ip=>allHiddenData.push({type:'IP',value:ip}));
        
        const paths = html.match(/["'](\/[a-zA-Z0-9_\/-]+\/[a-zA-Z0-9_\/-]+\.(?:php|json|xml|txt|yml|env|config))["']/g);
        if(paths) [...new Set(paths)].forEach(p=>allHiddenData.push({type:'Path',value:p.replace(/["']/g,'')}));
        
        doc.querySelectorAll('iframe').forEach(f=>allHiddenData.push({type:'Iframe',value:f.src||'inline'}));
        
        const comments = html.match(/<!--[\s\S]*?-->/g);
        if(comments) comments.forEach(c=>{const links=c.match(/https?:\/\/[^\s"'<>]+/g);if(links)links.forEach(l=>allHiddenData.push({type:'Comment',value:l}));});
        
        // Find all PDF links
        doc.querySelectorAll('a[href*=".pdf"]').forEach(a => {
            const pdfURL = a.href;
            hiddenPDFs.push({name: a.textContent.trim() || pdfURL.split('/').pop(), url: pdfURL});
        });
        
        const dirs = ['admin','api','backup','config','database','debug','dev','hidden','internal','private','secret','staff','test','tmp','upload'];
        for(const dir of dirs){try{const r=await fetch('https://www.annauniv.edu/'+dir,{method:'HEAD'});if(r.status!==404)allHiddenData.push({type:'Directory',value:'https://www.annauniv.edu/'+dir+' ['+r.status+']'});}catch(e){}}
        
        renderHiddenData(allHiddenData);
        document.getElementById('hiddenZipBtn').textContent = '📦 Download ' + hiddenPDFs.length + ' Hidden PDFs as ZIP';
    } catch(err) {
        document.getElementById('hiddenContent').innerHTML = '<div style="text-align:center;color:red;padding:30px;">Error: '+err.message+'</div>';
    }
}

function renderHiddenData(data) {
    const grouped = {};
    data.forEach(item => {
        if(!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item.value);
    });
    
    let html2 = '';
    for(const [type, items] of Object.entries(grouped)) {
        html2 += `<div class="hidden-section" data-type="${type}" style="margin-bottom:10px;border:2px solid #6a1b9a;border-radius:10px;overflow:hidden;"><div style="background:#6a1b9a;color:#fff;padding:10px 12px;font-weight:bold;font-size:12px;">${type} (${items.length})</div><div style="padding:8px;background:#fafafa;">`;
        items.forEach(item => {
            html2 += `<div class="hidden-item" data-value="${item}" style="display:flex;align-items:center;justify-content:space-between;padding:6px;margin:3px 0;background:#fff;border:1px solid #e0e0e0;border-radius:5px;"><span style="font-size:10px;word-break:break-all;flex:1;">${item}</span><div style="display:flex;gap:3px;"><button onclick="viewItem('${item}')" style="background:#1a237e;color:#fff;border:none;border-radius:3px;padding:3px 6px;cursor:pointer;font-size:9px;">${SVG.eye}</button><button onclick="downloadItem('${item}','${type}_${Date.now()}')" style="background:#28a745;color:#fff;border:none;border-radius:3px;padding:3px 6px;cursor:pointer;font-size:9px;">${SVG.download}</button></div></div>`;
        });
        html2 += `</div></div>`;
    }
    
    document.getElementById('hiddenContent').innerHTML = html2 || '<div style="text-align:center;color:#666;padding:30px;">No hidden data found</div>';
}

window.downloadHiddenPDFsAsZip = async function() {
    const btn = document.getElementById('hiddenZipBtn');
    btn.textContent = '⏳ Downloading...';
    
    // Load JSZip
    if(typeof JSZip === 'undefined') {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }
    
    const zip = new JSZip();
    let downloaded = 0;
    
    for(const pdf of hiddenPDFs) {
        try {
            const response = await fetch(pdf.url);
            const blob = await response.blob();
            const fileName = pdf.name.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
            zip.file(fileName, blob);
            downloaded++;
            btn.textContent = '⏳ Downloaded ' + downloaded + '/' + hiddenPDFs.length;
        } catch(e) {
            console.log('Failed:', pdf.url);
        }
    }
    
    const content = await zip.generateAsync({type: 'blob'});
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Anna_University_Hidden_PDFs_' + Date.now() + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    btn.textContent = '✅ Downloaded ' + downloaded + ' PDFs';
    console.log('✅ ZIP downloaded with', downloaded, 'PDFs');
};

window.filterHiddenData = function(query) {
    query = query.toLowerCase();
    document.querySelectorAll('.hidden-item').forEach(item => {
        const value = item.dataset.value.toLowerCase();
        item.style.display = value.includes(query) ? 'flex' : 'none';
    });
    document.querySelectorAll('.hidden-section').forEach(section => {
        const visible = section.querySelectorAll('.hidden-item[style*="display: flex"]');
        section.style.display = visible.length > 0 ? 'block' : 'none';
    });
};

window.viewItem = function(url){window.open(url,'_blank');};
window.downloadItem = function(url,name){const a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9]/g,'_');a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a);};
window.filterMenu = function(q){q=q.toLowerCase();document.querySelectorAll('.menu-item').forEach(i=>{const n=i.dataset.name.toLowerCase();const u=i.dataset.url.toLowerCase();i.style.display=(n.includes(q)||u.includes(q))?'flex':'none';});};
window.filterType = function(t){document.querySelectorAll('.menu-item').forEach(i=>{const u=i.dataset.url.toLowerCase();let show=false;if(t==='all')show=true;else if(t==='pdf')show=u.includes('.pdf');else if(t==='php')show=u.includes('.php');i.style.display=show?'flex':'none';});};
window.downloadAllPDFs = function(){for(const[d,data]of Object.entries(MENU_DATA)){for(const[n,u]of Object.entries(data.items)){if(u.includes('.pdf')){setTimeout(()=>{const a=document.createElement('a');a.href=u;a.download=n.replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a);},500);}}}};
window.showHiddenPage = showHiddenPage;
window.renderMainPage = renderMainPage;

renderMainPage();
document.body.appendChild(overlay);
overlay.appendChild(menu);
})();
