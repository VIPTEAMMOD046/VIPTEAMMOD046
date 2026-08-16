javascript:(function(){
// Epstein Library Complete Menu with View/Download
const SVG = {
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
};

// Create overlay
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial;';

const menu = document.createElement('div');
menu.style.cssText = 'background:#fff;border-radius:15px;padding:20px;max-width:600px;width:95%;max-height:90vh;overflow-y:auto;';

menu.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
        <div style="width:50px;height:50px;background:linear-gradient(135deg,#1a237e,#003399);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
            ${SVG.folder}
        </div>
        <h2 style="color:#003399;margin:0;font-size:18px;">Epstein Library</h2>
        <p style="color:#666;font-size:11px;margin:5px 0;">Department of Justice - Complete Files</p>
    </div>
    
    <div style="margin-bottom:15px;">
        <div style="position:relative;">
            <input type="text" id="epsteinSearch" placeholder="Search files..." onkeyup="filterEpstein(this.value)" style="width:100%;padding:10px 15px 10px 40px;border:2px solid #003399;border-radius:8px;font-size:13px;outline:none;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#003399;">${SVG.search}</span>
        </div>
    </div>
    <div id="epsteinContent">Loading files...</div>
`;

overlay.appendChild(menu);
document.body.appendChild(overlay);

// Load data
async function loadEpsteinData() {
    const base = 'https://www.justice.gov/epstein/doj-disclosures/';
    const sections = [];
    
    // Data Sets 1-12
    for(let i = 1; i <= 12; i++) {
        sections.push({
            name: 'Data Set ' + i,
            url: base + 'data-set-' + i + '-files',
            icon: 'folder'
        });
    }
    
    // Special sections
    sections.push(
        {name: 'BOP Video Footage', url: base + 'bop-video-footage', icon: 'video'},
        {name: 'Maxwell Proffer', url: base + 'maxwell-proffer', icon: 'pdf'},
        {name: 'Memoranda & Correspondence', url: base + 'memoranda-and-correspondence', icon: 'pdf'},
        {name: 'First Phase Declassified', url: base + 'first-phase-declassified-epstein-files', icon: 'pdf'},
        {name: 'FBI FOIA Files', url: base + 'foia-federal-bureau-investigation-fbi', icon: 'pdf'},
        {name: 'CBP FOIA Files', url: base + 'foia-customs-and-border-protection-cbp', icon: 'pdf'},
        {name: 'BOP FOIA Files', url: base + 'foia-federal-bureau-prisons-bop', icon: 'pdf'},
        {name: 'Florida FOIA Files', url: base + 'foia-florida', icon: 'pdf'}
    );
    
    let html = '';
    
    for(const section of sections) {
        try {
            const res = await fetch(section.url);
            const pageHTML = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageHTML, 'text/html');
            
            const files = [];
            doc.querySelectorAll('a[href*=".pdf"], a[href*=".mp4"], a[href*="video"]').forEach(a => {
                files.push({
                    title: a.textContent.trim() || 'File',
                    url: a.href,
                    type: a.href.includes('.mp4') || a.href.includes('video') ? 'video' : 'pdf'
                });
            });
            
            html += `
                <div class="epstein-section" data-name="${section.name}" style="margin-bottom:10px;border:2px solid #e0e0e0;border-radius:10px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#1a237e,#003399);color:#fff;padding:10px 15px;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:space-between;">
                        <span>${section.icon === 'video' ? SVG.video : SVG.folder} ${section.name}</span>
                        <span style="font-size:9px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;">${files.length} files</span>
                    </div>
                    <div style="padding:5px;background:#fafafa;">
                        ${files.length > 0 ? files.map(file => `
                            <div class="epstein-item" data-name="${file.title}" data-url="${file.url}" style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;margin:2px 0;background:#fff;border-radius:5px;border:1px solid #e0e0e0;">
                                <span style="flex:1;font-size:10px;color:#333;display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
                                    ${file.type === 'video' ? SVG.video : SVG.pdf}
                                    ${file.title}
                                </span>
                                <div style="display:flex;gap:3px;flex-shrink:0;">
                                    <button onclick="viewEpsteinFile('${file.url.replace(/'/g,"\\'")}')" style="background:#003399;color:#fff;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:9px;display:flex;align-items:center;">${SVG.view}View</button>
                                    <button onclick="downloadEpsteinFile('${file.url.replace(/'/g,"\\'")}','${file.title.replace(/'/g,"\\'")}')" style="background:#28a745;color:#fff;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:9px;display:flex;align-items:center;">${SVG.download}DL</button>
                                </div>
                            </div>
                        `).join('') : '<div style="text-align:center;color:#999;font-size:10px;padding:10px;">No files found</div>'}
                    </div>
                </div>
            `;
        } catch(e) {
            html += `
                <div class="epstein-section" data-name="${section.name}" style="margin-bottom:10px;border:2px solid #e0e0e0;border-radius:10px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#1a237e,#003399);color:#fff;padding:10px 15px;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:space-between;">
                        <span>${SVG.folder} ${section.name}</span>
                        <a href="${section.url}" target="_blank" style="color:#fff;font-size:9px;">Open</a>
                    </div>
                </div>
            `;
        }
    }
    
    document.getElementById('epsteinContent').innerHTML = html || '<div style="text-align:center;color:#666;">No data found</div>';
}

// View function
window.viewEpsteinFile = function(url) {
    window.open(url, '_blank');
};

// Download function
window.downloadEpsteinFile = function(url, title) {
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^a-zA-Z0-9]/g,'_') + (url.includes('.pdf') ? '.pdf' : '');
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Filter function
window.filterEpstein = function(query) {
    query = query.toLowerCase();
    document.querySelectorAll('.epstein-item').forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const url = item.dataset.url.toLowerCase();
        item.style.display = (name.includes(query) || url.includes(query)) ? 'flex' : 'none';
    });
    document.querySelectorAll('.epstein-section').forEach(section => {
        const visible = section.querySelectorAll('.epstein-item[style*="display: flex"], .epstein-item:not([style*="display: none"])');
        section.style.display = visible.length > 0 || !query ? 'block' : 'none';
    });
};

loadEpsteinData();
})();
