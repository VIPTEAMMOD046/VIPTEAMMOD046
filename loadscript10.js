javascript:(function(){
// WAR.GOV UFO - Complete Menu
const SVG = {
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    ufo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:25px;height:25px;"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M12 9v5"/><circle cx="12" cy="17" r="1"/><path d="M8 20h8"/></svg>'
};

const MENU_DATA = {
    "Document Bundles (ZIP)": {
        icon: 'zip',
        items: {
            "Release 1 Documents": "https://www.war.gov/medialink/ufo/bundle/Release_1.zip",
            "Release 2 Documents": "https://www.war.gov/medialink/ufo/052226/release_02/release_02_document_bundle.zip",
            "Release 3 Documents": "https://www.war.gov/medialink/ufo/061226/release_03/release_03_documents.zip",
            "Release 4 Documents": "https://www.war.gov/medialink/ufo/071026/release_04/release_04_documents_071026.zip",
            "Release 5 Documents": "https://www.war.gov/medialink/ufo/release_05/Aug_07/release_05_Aug_07_documents.zip"
        }
    },
    "Video Archives (ZIP)": {
        icon: 'video',
        items: {
            "All UAP Videos": "https://d34w7g4gy10iej.cloudfront.net/uapvideos.zip",
            "Release 3 Videos": "https://d34w7g4gy10iej.cloudfront.net/release_03/uap_videos_061226.zip",
            "Release 4 Videos": "https://d34w7g4gy10iej.cloudfront.net/release_04/uap_release04_videos_071026.zip",
            "Release 5 Videos": "https://d34w7g4gy10iej.cloudfront.net/release_05/uap_videos_080726.zip"
        }
    },
    "UFO Images & Renderings": {
        icon: 'image',
        items: {
            "Airborne Triangle (2002)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D025_Digital-Rendering_Airborne-Triangle_2002.jpg",
            "Dark Translucent Triangle (2023)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D027_Digital-Rendering_Dark-Translucent-Triangle_2023.jpg",
            "Dark Triangle with Lights (2011)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D029_Digital-Rendering_Dark-Triangle-with-Lights_2011.jpg",
            "Large Triangle Red Lights (2023)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D031_Digital-Rendering_Large-Triangle-with-Red-Lights_2023.jpg",
            "Multiple Red Lights 1 (2026)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D038_Digital-Rendering-1_Multiple-Red-Lights_2026.jpg",
            "Multiple Red Lights 2 (2026)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D039_Digital-Rendering-2_Multiple-Red-Lights_2026.jpg",
            "Multiple Red Lights 3 (2026)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D041_Digital-Rendering-1_Multiple-Red-Lights_2026.jpg",
            "Multiple Red Lights 4 (2026)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/FBI-UAP-D042_Digital-Rendering-2_Multiple-Red-Lights_2026.jpg",
            "Film Analysis (1953)": "https://www.war.gov/portals/1/Interactive/2026/UFO/080726/Slideshow/DOW-UAP-D098_Film-Analysis-of-Unidentified-Objects_1953.jpg"
        }
    },
    "News Releases": {
        icon: 'folder',
        items: {
            "Release 1 News": "https://www.war.gov/News/Releases/Release/Article/4480582/department-of-war-releases-unidentified-anomalous-phenomena-files-in-historic-t/",
            "Release 2 News": "https://www.war.gov/News/Releases/Release/Article/4499305/department-of-war-publishes-second-release-of-unidentified-anomalous-phenomena/",
            "Release 3 News": "https://www.war.gov/News/Releases/Release/Article/4515408/department-of-war-publishes-third-release-of-unidentified-anomalous-phenomena-f/",
            "Release 4 News": "https://www.war.gov/News/Releases/Release/Article/4539898/department-of-war-publishes-fourth-release-of-unidentified-anomalous-phenomena/",
            "Release 5 News": "https://www.war.gov/News/Releases/Release/Article/4565994/department-of-war-publishes-fifth-release-of-unidentified-anomalous-phenomena-f/"
        }
    },
    "Related Links": {
        icon: 'folder',
        items: {
            "AARO": "https://www.aaro.mil/",
            "UFO Main Page": "https://www.war.gov/UFO/",
            "Release 5 Filter": "https://www.war.gov/ufo/?release=05",
            "Release 4 Filter": "https://www.war.gov/ufo/?release=04",
            "Live Events": "https://www.war.gov/Live",
            "DOW Home": "https://www.war.gov/"
        }
    }
};

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial;';

const menu = document.createElement('div');
menu.style.cssText = 'background:#fff;border-radius:15px;padding:20px;max-width:600px;width:95%;max-height:90vh;overflow-y:auto;';

let sectionsHTML = '';
for(const [section, data] of Object.entries(MENU_DATA)) {
    const icon = SVG[data.icon] || SVG.folder;
    sectionsHTML += `
        <div class="ufo-section" data-name="${section}" style="margin-bottom:12px;border:2px solid #0d47a1;border-radius:10px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0d47a1,#1a237e);color:#fff;padding:12px 15px;font-weight:bold;font-size:13px;display:flex;align-items:center;">
                ${icon}
                ${section}
                <span style="margin-left:auto;font-size:10px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;">${Object.keys(data.items).length}</span>
            </div>
            <div style="padding:8px;background:#fafafa;">
                ${Object.entries(data.items).map(([name,url]) => `
                    <div class="ufo-item" data-name="${name}" data-url="${url}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;margin:3px 0;background:#fff;border-radius:5px;border:1px solid #e0e0e0;">
                        <span style="flex:1;font-size:11px;color:#333;display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
                            ${url.includes('.zip') ? SVG.zip : url.includes('.jpg') ? SVG.image : SVG.folder}
                            ${name}
                        </span>
                        <div style="display:flex;gap:3px;flex-shrink:0;">
                            <button onclick="viewUFO('${url.replace(/'/g,"\\'")}')" style="background:#0d47a1;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:9px;display:flex;align-items:center;">${SVG.view}View</button>
                            <button onclick="downloadUFO('${url.replace(/'/g,"\\'")}','${name.replace(/'/g,"\\'")}')" style="background:#28a745;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:9px;display:flex;align-items:center;">${SVG.download}DL</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

menu.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
        <div style="width:60px;height:60px;background:linear-gradient(135deg,#0d47a1,#1a237e);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
            ${SVG.ufo}
        </div>
        <h2 style="color:#0d47a1;margin:0;font-size:20px;">WAR.GOV UFO Files</h2>
        <p style="color:#666;font-size:11px;margin:5px 0;">PURSUE - UAP Encounters</p>
    </div>
    
    <div style="margin-bottom:15px;">
        <div style="position:relative;">
            <input type="text" id="ufoSearch" placeholder="Search UFO files..." onkeyup="filterUFO(this.value)" style="width:100%;padding:10px 15px 10px 40px;border:2px solid #0d47a1;border-radius:8px;font-size:13px;outline:none;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#0d47a1;">${SVG.search}</span>
        </div>
    </div>
    
    ${sectionsHTML}
    
    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#dc3545;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;">
        ${SVG.close}
        Close Menu
    </button>
`;

overlay.appendChild(menu);
document.body.appendChild(overlay);

window.viewUFO = function(url) { window.open(url, '_blank'); };
window.downloadUFO = function(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[^a-zA-Z0-9]/g,'_');
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
window.filterUFO = function(query) {
    query = query.toLowerCase();
    document.querySelectorAll('.ufo-item').forEach(item => {
        const name = item.dataset.name.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
};
})();
