javascript:(async()=>{
  /* ═══════════════════════════════════════════════════════
     0. FIREBASE CONFIG + SDK LOAD
     ═══════════════════════════════════════════════════════ */
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCQXFVVGKoESiXvRSNvcdOCHk3JJRauweo",
    authDomain: "bypass-menu.firebaseapp.com",
    projectId: "bypass-menu",
    storageBucket: "bypass-menu.firebasestorage.app",
    messagingSenderId: "727948786192",
    appId: "1:727948786192:android:6b6097bdb6958b9afe2895"
  };

  async function loadScript(src) {
    if ([...document.scripts].some(s => s.src === src)) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  try {
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
  } catch (e) {
    alert('Firebase SDK load failed (CSP?).');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();

  /* ═══════════════════════════════════════════════════════
     1. COMPONENT / SERVICE RESOLUTION
     ═══════════════════════════════════════════════════════ */
  const findComp = () => {
    const t = document.querySelector('mat-table');
    if (!t || typeof ng === 'undefined' || !ng.getOwningComponent) return null;
    try { return ng.getOwningComponent(t); } catch { return null; }
  };

  const comp = findComp();
  const region = comp?.regionService;
  const ds     = region?.dataService;

  const hasMethod = (obj, name) => {
    let p = obj;
    while (p && p !== Object.prototype) {
      if (typeof p[name] === 'function') return true;
      p = Object.getPrototypeOf(p);
    }
    return false;
  };

  const getFreshComp = () => {
    const t = document.querySelector('mat-table');
    if (!t || typeof ng === 'undefined' || !ng.getOwningComponent) return null;
    try { return ng.getOwningComponent(t); } catch { return null; }
  };

  /* ═══════════════════════════════════════════════════════
     2. SWAP MAPS + APPLY
     ═══════════════════════════════════════════════════════ */
  const SWAPS = {
    VEHICLE:    { 'TN60BV5920': 'TN00AA0001', 'TN00AA0001': 'TN60BV5920' },
    MINERAL:    { 'Rough Stone': 'Gravel', 'Gravel': 'Rough Stone' },
    MINERAL_ID: { 3132: 3133, 3133: 3132 },
    SP_NO:      {},
    targetId:       null,
    targetPassCode: null
  };
  window.__SWAPS = SWAPS;

  const TRANSIT_MINERAL_NAME = 'Rough Stone';
  const TRANSIT_MINERAL_ID   = 3132;
  const UNLOCK_PASSWORD      = '89';

  const applySwap = (r, label) => {
    if (!r || typeof r !== 'object') return false;
    let hit = false;

    const isTransitRow = !!r.pass_code || !!r.transit_id;

    if (isTransitRow) {
      if (r.mineral_name  !== TRANSIT_MINERAL_NAME) { r.mineral_name  = TRANSIT_MINERAL_NAME; hit = true; }
      if ('mineral_name2' in r && r.mineral_name2 !== TRANSIT_MINERAL_NAME) {
        r.mineral_name2 = TRANSIT_MINERAL_NAME; hit = true;
      }
      if (Number(r.mineral_id) !== TRANSIT_MINERAL_ID) { r.mineral_id = TRANSIT_MINERAL_ID; hit = true; }
    } else {
      if (r.mineral_name  in SWAPS.MINERAL) { r.mineral_name  = SWAPS.MINERAL[r.mineral_name];  hit = true; }
      if (r.mineral_name2 in SWAPS.MINERAL) { r.mineral_name2 = SWAPS.MINERAL[r.mineral_name2]; hit = true; }
      const mid = Number(r.mineral_id);
      if (!isNaN(mid) && mid in SWAPS.MINERAL_ID) { r.mineral_id = SWAPS.MINERAL_ID[mid]; hit = true; }
    }

    if (r.vehicle_number in SWAPS.VEHICLE) { r.vehicle_number = SWAPS.VEHICLE[r.vehicle_number]; hit = true; }
    if (r.sp_no in SWAPS.SP_NO)           { r.sp_no          = SWAPS.SP_NO[r.sp_no];           hit = true; }

    if (typeof r.jsondata === 'string' && r.jsondata) {
      try {
        const j = JSON.parse(r.jsondata);
        let jHit = false;
        (j?.form_value?.quantity_details || []).forEach(q => {
          if (q.mineral_name in SWAPS.MINERAL) { q.mineral_name = SWAPS.MINERAL[q.mineral_name]; jHit = true; }
          const qid = Number(q.mineral_id);
          if (!isNaN(qid) && qid in SWAPS.MINERAL_ID) { q.mineral_id = SWAPS.MINERAL_ID[qid]; jHit = true; }
        });
        if (jHit) { r.jsondata = JSON.stringify(j); hit = true; }
      } catch {}
    }

    return hit;
  };

  /* ═══════════════════════════════════════════════════════
     3. POST WRAPPER — PDF endpoints
     ═══════════════════════════════════════════════════════ */
  if (ds && hasMethod(ds, 'post') && !ds.__origPost) {
    ds.__origPost = ds.post.bind(ds);
    const origPost = ds.__origPost;

    ds.post = function (url, body, ...rest) {
      const obs = origPost(url, body, ...rest);
      const isDispatchEdit = /\/api\/edit\/dispatch/.test(url);
      const isTransitEdit  = /\/api\/edit\/transitpass/.test(url);
      if (!isDispatchEdit && !isTransitEdit) return obs;

      const bodyId = body?.dispatch_id ?? body?.pass_id ?? body?.id;
      if (SWAPS.targetId && bodyId !== SWAPS.targetId) return obs;

      const label = isDispatchEdit ? 'dispatch-pdf' : 'transit-pdf';

      return new (obs.constructor)(subscriber => obs.subscribe({
        next: res => {
          const row = res?.Data?.[0];
          if (row) applySwap(row, label);
          subscriber.next(res);
        },
        error: e => subscriber.error(e),
        complete: () => subscriber.complete()
      }));
    };
  }

  /* ═══════════════════════════════════════════════════════
     4. CATCH-ALL POST WRAPPER
     ═══════════════════════════════════════════════════════ */
  if (ds && ds.post && !ds.__catchAllHooked) {
    ds.__catchAllHooked = true;
    const prevPost = ds.post;
    ds.post = function (url, body, ...rest) {
      const obs = prevPost.call(ds, url, body, ...rest);
      const skip = /\/api\/(list|login|auth|user|dashboard)/.test(url);
      if (skip) return obs;
      return new (obs.constructor)(subscriber => obs.subscribe({
        next: res => {
          const walk = (obj, depth = 0) => {
            if (!obj || depth > 5) return;
            if (Array.isArray(obj)) { obj.forEach(o => walk(o, depth + 1)); return; }
            if (typeof obj !== 'object') return;
            if ('vehicle_number' in obj || 'mineral_name' in obj || 'sp_no' in obj) applySwap(obj, 'auto');
            Object.values(obj).forEach(v => walk(v, depth + 1));
          };
          walk(res);
          subscriber.next(res);
        },
        error: e => subscriber.error(e),
        complete: () => subscriber.complete()
      }));
    };
  }

  /* ═══════════════════════════════════════════════════════
     5. TRANSIT PDF METHOD WRAPPER
     ═══════════════════════════════════════════════════════ */
  const pdfSvc = comp?.dispatchPdfService;
  if (pdfSvc && hasMethod(pdfSvc, 'generateTransitPDF') && !pdfSvc.__origTransitPDF) {
    pdfSvc.__origTransitPDF = pdfSvc.generateTransitPDF.bind(pdfSvc);
    pdfSvc.generateTransitPDF = function (...args) {
      const rowArg = args.find(a => a && typeof a === 'object' && (
        'vehicle_number' in a || 'pass_code' in a || 'transit_id' in a || 'id' in a
      ));
      if (rowArg) {
        const okRow =
          !SWAPS.targetId ||
          rowArg.id === SWAPS.targetId ||
          rowArg.pass_code === SWAPS.targetPassCode;
        if (okRow) applySwap(rowArg, 'transit-pdf-row');
      }
      return pdfSvc.__origTransitPDF(...args);
    };
  }

  /* ═══════════════════════════════════════════════════════
     6. API TIMING TRACKER
     ═══════════════════════════════════════════════════════ */
  const API_LOG = [];
  const API_MAX = 50;
  const SLOW_MS = 500;
  window.__API_LOG = API_LOG;

  const pushApi = (entry) => {
    API_LOG.unshift(entry);
    if (API_LOG.length > API_MAX) API_LOG.length = API_MAX;
    renderApiLog();
  };

  if (!window.__origFetch) window.__origFetch = window.fetch.bind(window);
  if (!window.__fetchHooked) {
    window.__fetchHooked = true;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = (init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
      const t0 = performance.now();
      return window.__origFetch.apply(this, arguments).then(
        res => { pushApi({ url, method, ms: Math.round(performance.now() - t0), ok: res.ok, status: res.status }); return res; },
        err => { pushApi({ url, method, ms: Math.round(performance.now() - t0), ok: false, status: 'ERR' }); throw err; }
      );
    };
  }
  if (!window.__xhrHooked) {
    window.__xhrHooked = true;
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__api = { method: (method || 'GET').toUpperCase(), url: String(url) };
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      const meta = this.__api;
      if (meta) {
        const t0 = performance.now();
        this.addEventListener('loadend', () => {
          pushApi({
            url: meta.url, method: meta.method,
            ms: Math.round(performance.now() - t0),
            ok: this.status >= 200 && this.status < 300,
            status: this.status
          });
        }, { once: true });
      }
      return origSend.apply(this, arguments);
    };
  }

  /* ═══════════════════════════════════════════════════════
     7. STYLES
     ═══════════════════════════════════════════════════════ */
  const old = document.getElementById('__swapPanel');
  if (old) old.remove();
  const oldHint = document.getElementById('__swpHint');
  if (oldHint) oldHint.remove();
  const oldLogin = document.getElementById('__swpLogin');
  if (oldLogin) oldLogin.remove();

  if (!document.getElementById('__swapStyles')) {
    const style = document.createElement('style');
    style.id = '__swapStyles';
    style.textContent = `
      #__swapPanel {
        position: fixed; right: 12px; bottom: 12px; z-index: 999999;
        width: 280px; height: 380px;
        background: linear-gradient(145deg, #0b1120, #0f172a);
        color: #e2e8f0; font: 11px/1.4 'Segoe UI', system-ui, sans-serif;
        border: 1px solid #1e293b; border-radius: 10px;
        box-shadow: 0 12px 24px rgba(0,0,0,.6), 0 0 0 1px rgba(34,197,94,.15);
        display: flex; flex-direction: column;
        transition: opacity .18s, transform .18s, height .18s;
        user-select: none;
        overflow: hidden;
      }
      #__swapPanel.swp-hidden {
        opacity: 0; transform: scale(.95) translateY(10px); pointer-events: none;
      }
      /* Login mode — shrink to fit content */
      #__swapPanel.swp-auth {
        height: auto;
        min-height: 0;
      }
      #__swapPanel:hover { box-shadow: 0 12px 32px rgba(0,0,0,.7), 0 0 0 1px rgba(34,197,94,.3); }
      #__swapPanel .swp-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 8px; border-bottom: 1px solid #1e293b;
        cursor: grab; flex-shrink: 0;
      }
      #__swapPanel .swp-header:active { cursor: grabbing; }
      #__swapPanel .swp-title {
        font-weight: 700; font-size: 11px; letter-spacing: .3px;
        background: linear-gradient(90deg, #22c55e, #4ade80);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        display: flex; align-items: center; gap: 5px;
        pointer-events: none;
      }
      #__swapPanel .swp-title::before {
        content: ''; width: 6px; height: 6px; border-radius: 50%;
        background: #22c55e; box-shadow: 0 0 6px #22c55e;
        animation: swpPulse 2s infinite;
      }
      @keyframes swpPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: .5; transform: scale(.85); }
      }
      #__swapPanel .swp-hbtns { display: flex; gap: 2px; align-items: center; }
      #__swapPanel .swp-iconbtn {
        background: none; border: 0; color: #64748b; font-size: 15px;
        line-height: 1; cursor: pointer; padding: 1px 4px; border-radius: 4px;
        transition: all .15s; font-weight: 700;
      }
      #__swapPanel .swp-iconbtn:hover { color: #f87171; background: #1e293b; }
      #__swapPanel .swp-body {
        padding: 6px 8px 8px; flex: 1;
        display: flex; flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }
      #__swapPanel.swp-auth .swp-body {
        flex: 0 0 auto;
        overflow: visible;
      }
      #__swapPanel .swp-tabs {
        display: flex; gap: 2px; margin-bottom: 6px;
        border-bottom: 1px solid #1e293b; padding-bottom: 4px;
        flex-shrink: 0;
      }
      #__swapPanel .swp-tab {
        flex: 1; background: none; border: 0; color: #64748b;
        padding: 4px 5px; cursor: pointer; font-size: 10px; font-weight: 600;
        border-radius: 4px; transition: all .15s;
      }
      #__swapPanel .swp-tab:hover { color: #e2e8f0; background: #1e293b; }
      #__swapPanel .swp-tab.swp-active { color: #22c55e; background: #14532d; }
      #__swapPanel .swp-tabpane { display: none; flex: 1; min-height: 0; flex-direction: column; }
      #__swapPanel .swp-tabpane.swp-active { display: flex; }
      #__swapPanel.swp-auth .swp-tabpane.swp-active { flex: 0 0 auto; }

      #__swapPanel .swp-page { display: none; flex: 1; min-height: 0; flex-direction: column; }
      #__swapPanel .swp-page.swp-current { display: flex; }

      #__swapPanel .swp-toolbar { display: flex; gap: 3px; margin-bottom: 5px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
      #__swapPanel .swp-loadrow { display: flex; gap: 3px; margin-bottom: 5px; flex-shrink: 0; }
      #__swapPanel .swp-loadrow .swp-btn { flex: 1; justify-content: center; padding: 5px 3px; }

      #__swapPanel .swp-caprow {
        display: grid;
        grid-template-columns: 1fr 30px;
        gap: 4px;
        margin-bottom: 6px;
        flex-shrink: 0;
      }
      #__swapPanel .swp-caprow .swp-btn {
        justify-content: center;
        padding: 5px 4px;
        min-width: 0;
      }

      #__swapPanel .swp-btn {
        background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
        border-radius: 5px; padding: 4px 7px; cursor: pointer;
        font-size: 10px; font-weight: 600; transition: all .15s;
        display: inline-flex; align-items: center; gap: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #__swapPanel .swp-btn:hover { background: #273449; border-color: #475569; }
      #__swapPanel .swp-btn:active { transform: scale(.97); }
      #__swapPanel .swp-btn:disabled {
        opacity: .35; cursor: not-allowed; transform: none;
      }
      #__swapPanel .swp-btn:disabled:hover { background: #1e293b; border-color: #334155; }
      #__swapPanel .swp-btn.swp-primary {
        background: linear-gradient(135deg, #166534, #15803d);
        border-color: #22c55e; color: #fff;
      }
      #__swapPanel .swp-btn.swp-primary:hover {
        background: linear-gradient(135deg, #15803d, #16a34a);
        box-shadow: 0 0 8px rgba(34,197,94,.4);
      }
      #__swapPanel .swp-btn.swp-transit {
        background: linear-gradient(135deg, #78350f, #92400e);
        border-color: #fbbf24; color: #fef3c7;
      }
      #__swapPanel .swp-btn.swp-transit:hover {
        background: linear-gradient(135deg, #92400e, #b45309);
        box-shadow: 0 0 8px rgba(251,191,36,.4);
      }
      #__swapPanel .swp-btn.swp-stone {
        background: linear-gradient(135deg, #166534, #15803d);
        border-color: #22c55e; color: #fff;
      }
      #__swapPanel .swp-btn.swp-stone:hover {
        background: linear-gradient(135deg, #15803d, #16a34a);
        box-shadow: 0 0 8px rgba(34,197,94,.4);
      }
      #__swapPanel .swp-btn.swp-danger { background: #450a0a; border-color: #991b1b; color: #fca5a5; }
      #__swapPanel .swp-btn.swp-danger:hover { background: #7f1d1d; }
      #__swapPanel .swp-btn.swp-unlock { background: #312e81; border-color: #6366f1; color: #c7d2fe; }
      #__swapPanel .swp-btn.swp-unlock:hover { background: #3730a3; }
      #__swapPanel .swp-btn.swp-back {
        background: #1e293b; border-color: #475569; color: #94a3b8;
        padding: 4px 8px; font-size: 11px;
      }
      #__swapPanel .swp-btn.swp-back:hover { background: #334155; color: #e2e8f0; }
      #__swapPanel .swp-btn.swp-cap {
        background: linear-gradient(135deg, #0ea5e9, #2563eb);
        border-color: #0ea5e9; color: #fff;
      }
      #__swapPanel .swp-btn.swp-cap:hover {
        background: linear-gradient(135deg, #0284c7, #1d4ed8);
        box-shadow: 0 0 8px rgba(14,165,233,.4);
      }
      #__swapPanel .swp-btn.swp-cap-mini {
        padding: 5px 0 !important;
        font-size: 12px !important;
      }
      #__swapPanel .swp-input {
        flex: 1; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 5px;
        padding: 4px 6px; font-size: 10px; outline: none;
        width: 100%;
      }
      #__swapPanel .swp-input:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-input::placeholder { color: #475569; }

      #__swapPanel .swp-list {
        flex: 1; min-height: 0; overflow-y: auto;
        border: 1px solid #1e293b; border-radius: 5px;
        margin-bottom: 5px; background: #0a0f1a;
      }
      #__swapPanel .swp-list::-webkit-scrollbar { width: 4px; }
      #__swapPanel .swp-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      #__swapPanel .swp-row {
        padding: 5px 6px; border-bottom: 1px solid #1e293b;
        cursor: pointer; transition: background .12s;
        display: flex; flex-direction: column; gap: 1px;
      }
      #__swapPanel .swp-row:last-child { border-bottom: 0; }
      #__swapPanel .swp-row:hover { background: #1e293b; }
      #__swapPanel .swp-row.swp-selected {
        background: #14532d; border-left: 3px solid #22c55e; padding-left: 4px;
      }
      #__swapPanel .swp-row-id { color: #e2e8f0; font-weight: 600; font-size: 10px; }
      #__swapPanel .swp-row-sub { color: #64748b; font-size: 9px; }
      #__swapPanel .swp-empty { padding: 10px; color: #475569; text-align: center; font-size: 10px; }

      #__swapPanel .swp-backbar {
        display: flex; gap: 5px; align-items: center; margin-bottom: 6px;
        padding-bottom: 5px; border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      #__swapPanel .swp-backbar .swp-selected-code {
        font-size: 10px; font-weight: 700; color: #22c55e;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        flex: 1;
      }
      #__swapPanel .swp-fields {
        flex: 1; min-height: 0; overflow-y: auto;
        padding-right: 2px;
      }
      #__swapPanel.swp-auth .swp-fields {
        flex: 0 0 auto;
        overflow: visible;
      }
      #__swapPanel .swp-fields::-webkit-scrollbar { width: 4px; }
      #__swapPanel .swp-fields::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      #__swapPanel .swp-field { margin-bottom: 6px; }
      #__swapPanel .swp-field label {
        display: block; color: #94a3b8; font-size: 9px;
        margin-bottom: 2px; font-weight: 600;
      }
      #__swapPanel .swp-field label.swp-locked::after {
        content: ' 🔒'; font-size: 8px;
      }
      #__swapPanel .swp-field input {
        width: 100%; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 5px;
        padding: 5px 7px; font-size: 11px; outline: none;
        transition: border-color .15s, box-shadow .15s, background .15s;
      }
      #__swapPanel .swp-field input:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-field input:disabled {
        background: #0f172a; color: #94a3b8;
        border-color: #1e293b; cursor: not-allowed;
      }
      #__swapPanel .swp-actions {
        display: flex; gap: 4px; margin-top: 4px;
        padding-top: 6px; border-top: 1px solid #1e293b;
        flex-shrink: 0;
      }
      #__swapPanel .swp-actions .swp-btn { flex: 1; justify-content: center; padding: 6px 4px; }
      #__swapPanel .swp-status {
        margin-top: 5px; color: #64748b; font-size: 9px;
        min-height: 12px; word-break: break-word;
        flex-shrink: 0;
      }
      #__swapPanel .swp-status.swp-ok { color: #22c55e; }
      #__swapPanel .swp-status.swp-err { color: #f87171; }
      #__swapPanel .swp-side {
        font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px;
        background: #1e293b; color: #94a3b8; white-space: nowrap;
        margin-left: auto;
      }

      #__swapPanel .swp-toggle-row {
        display: flex; align-items: center; gap: 6px;
        padding: 5px 7px; border-radius: 5px;
        background: rgba(255,255,255,.03);
        cursor: pointer; transition: .15s;
        margin-bottom: 6px; flex-shrink: 0;
      }
      #__swapPanel .swp-toggle-row:hover { background: rgba(255,255,255,.06); }
      #__swapPanel .swp-switch {
        position: relative; width: 26px; height: 14px; flex: none;
        border-radius: 999px; background: #333a4d; transition: .2s;
      }
      #__swapPanel .swp-switch::after {
        content: ""; position: absolute; top: 1.5px; left: 1.5px;
        width: 11px; height: 11px; border-radius: 50%;
        background: #fff; transition: .2s;
        box-shadow: 0 1px 2px rgba(0,0,0,.4);
      }
      #__swpOmit:checked + .swp-switch { background: linear-gradient(90deg,#6366f1,#a855f7); }
      #__swpOmit:checked + .swp-switch::after { left: 13.5px; }
      #__swapPanel .swp-toggle-row span {
        font-size: 10px; color: #c3c9d8; line-height: 1;
      }
      #__swapPanel .swp-log {
        flex: 1; min-height: 24px; max-height: 90px;
        overflow-y: auto; background: rgba(0,0,0,.45);
        border: 1px solid #1e293b; border-radius: 5px;
        padding: 4px 6px; margin-top: 5px;
        font: 9.5px/1.35 ui-monospace, Menlo, Consolas, monospace;
        color: #86efac; white-space: pre-wrap; word-break: break-word;
      }
      #__swapPanel .swp-log::-webkit-scrollbar { width: 4px; }
      #__swapPanel .swp-log::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      #__swapPanel .swp-log:empty { display: none; }

      #__swapPanel .swp-api-list {
        flex: 1; min-height: 0; overflow-y: auto;
        border: 1px solid #1e293b; border-radius: 5px; background: #0a0f1a;
      }
      #__swapPanel .swp-api-list::-webkit-scrollbar { width: 4px; }
      #__swapPanel .swp-api-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      #__swapPanel .swp-api-row {
        padding: 4px 6px; border-bottom: 1px solid #1e293b;
        display: flex; flex-direction: column; gap: 1px; font-size: 9px;
      }
      #__swapPanel .swp-api-row:last-child { border-bottom: 0; }
      #__swapPanel .swp-api-row.swp-slow { background: rgba(251,191,36,.06); }
      #__swapPanel .swp-api-row.swp-very-slow { background: rgba(248,113,113,.08); }
      #__swapPanel .swp-api-row.swp-err { background: rgba(248,113,113,.15); }
      #__swapPanel .swp-api-row[data-known="stone"]   { border-left: 2px solid #22c55e; }
      #__swapPanel .swp-api-row[data-known="transit"] { border-left: 2px solid #fbbf24; }
      #__swapPanel .swp-api-head { display: flex; justify-content: space-between; gap: 5px; align-items: center; }
      #__swapPanel .swp-api-method {
        color: #94a3b8; font-weight: 700; font-size: 8px;
        padding: 1px 3px; background: #1e293b; border-radius: 2px;
      }
      #__swapPanel .swp-api-url {
        color: #e2e8f0; font-family: 'Consolas', monospace; font-size: 9px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        flex: 1; min-width: 0;
      }
      #__swapPanel .swp-api-ms { font-weight: 700; font-size: 9px; white-space: nowrap; }
      #__swapPanel .swp-api-ms.swp-ok { color: #22c55e; }
      #__swapPanel .swp-api-ms.swp-warn { color: #fbbf24; }
      #__swapPanel .swp-api-ms.swp-err { color: #f87171; }
      #__swapPanel .swp-api-meta { color: #64748b; font-size: 8px; }

      #__swpHint {
        position: fixed; right: 12px; bottom: 12px; z-index: 999998;
        width: 12px; height: 12px; border-radius: 50%;
        background: radial-gradient(circle, #22c55e 40%, #14532d 100%);
        box-shadow: 0 0 8px rgba(34,197,94,.6), 0 0 0 2px rgba(34,197,94,.2);
        cursor: pointer; transition: transform .15s, box-shadow .2s;
        animation: swpHintPulse 2.4s infinite;
      }
      #__swpHint:hover {
        transform: scale(1.4);
        box-shadow: 0 0 14px rgba(34,197,94,.9), 0 0 0 3px rgba(34,197,94,.4);
      }
      @keyframes swpHintPulse {
        0%, 100% { opacity: .6; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ═══════════════════════════════════════════════════════
     8. PANEL MARKUP
     ═══════════════════════════════════════════════════════ */
  const panel = document.createElement('div');
  panel.id = '__swapPanel';
  panel.classList.add('swp-hidden');
  panel.innerHTML = `
    <div class="swp-header">
      <div class="swp-title" id="__swpTitle">Swap Panel</div>
      <div class="swp-hbtns">
        <button class="swp-iconbtn" id="__swpClose" title="Hide">×</button>
      </div>
    </div>
    <div class="swp-body">

      <!-- AUTH UI -->
      <div id="__swpAuthWrap" style="display:none;flex-direction:column;flex:1;min-height:0">
        <div class="swp-tabpane swp-active" data-authpane="login">
          <div class="swp-fields">
            <div class="swp-field">
              <label>Email or username</label>
              <input id="__swpLEmail" placeholder="arun89 — @gmail.com auto-added"
                     autocomplete="username" autocapitalize="none" spellcheck="false" />
            </div>
            <div class="swp-field">
              <label>Password</label>
              <input id="__swpLPass" type="password" placeholder="••••••••"
                     autocomplete="current-password" />
            </div>
          </div>
          <div class="swp-actions">
            <button class="swp-btn swp-primary" id="__swpLGo">Sign in</button>
          </div>
          <div class="swp-status" id="__swpLMsg"></div>
        </div>
      </div>

      <!-- MAIN UI -->
      <div id="__swpMainWrap" style="display:none;flex-direction:column;flex:1;min-height:0">
        <div class="swp-tabs">
          <button class="swp-tab swp-active" data-tab="swap">Swap</button>
          <button class="swp-tab" data-tab="mimas">MIMAS</button>
          <button class="swp-tab" data-tab="api">API <span id="__swpApiCount" style="color:#22c55e">0</span></button>
        </div>

        <!-- PAGE 1 & 2 -->
        <div class="swp-tabpane swp-active" data-pane="swap">
          <div class="swp-page swp-current" id="__swpPageList">
            <div class="swp-loadrow">
              <button class="swp-btn swp-stone"   id="__swpLoadStone"   title="Load Stone Pass list">🪨 Stone</button>
              <button class="swp-btn swp-transit" id="__swpLoadTransit" title="Load Transit Pass list">🚚 Transit</button>
              <button class="swp-btn swp-unlock"  id="__swpUnlock"      title="Enter password to unlock" style="display:none">🔓</button>
            </div>
            <div class="swp-toolbar">
              <input class="swp-input" id="__swpSearch" placeholder="Filter pass / vehicle / mineral / driver" />
              <span class="swp-side" id="__swpSideBadge">❔</span>
            </div>
            <div class="swp-list" id="__swpList">
              <div class="swp-empty">Pick 🪨 Stone or 🚚 Transit above to load rows</div>
            </div>
            <div class="swp-status" id="__swpStatusList"></div>
          </div>

          <div class="swp-page" id="__swpPageEdit">
            <div class="swp-backbar">
              <button class="swp-btn swp-back" id="__swpBack">← Back</button>
              <span class="swp-selected-code" id="__swpSel">—</span>
            </div>
            <div class="swp-fields">
              <div class="swp-field">
                <label id="__swpSpLbl">Security Paper Number</label>
                <input id="__swpSp" placeholder="e.g. TSPS06008536" />
              </div>
              <div class="swp-field">
                <label id="__swpVehLbl">Vehicle number</label>
                <input id="__swpVeh" placeholder="e.g. TN00AA0001" />
              </div>
              <div class="swp-field">
                <label id="__swpMinLbl">Mineral name</label>
                <input id="__swpMin" placeholder="e.g. Gravel" />
              </div>
              <div class="swp-field">
                <label id="__swpMidLbl">Mineral id</label>
                <input id="__swpMid" placeholder="e.g. 3133" type="number" />
              </div>
            </div>
            <div class="swp-actions">
              <button class="swp-btn swp-primary" id="__swpApply">✓ Apply</button>
              <button class="swp-btn swp-danger" id="__swpClear">✕ Clear</button>
            </div>
            <div class="swp-status" id="__swpStatus"></div>
          </div>
        </div>

        <!-- PAGE 3 — MIMAS -->
        <div class="swp-tabpane" data-pane="mimas">
          <div class="swp-fields">
            <div class="swp-field">
              <label>Username</label>
              <input id="__swpMUser" placeholder="your MIMAS ID" autocomplete="off" autocapitalize="none" spellcheck="false" />
            </div>
            <div class="swp-field">
              <label>Password</label>
              <input id="__swpMPass" type="password" placeholder="••••••••" autocomplete="off" autocapitalize="none" spellcheck="false" />
            </div>
            <label class="swp-toggle-row">
              <input id="__swpOmit" type="checkbox" checked hidden>
              <div class="swp-switch"></div>
              <span>No-auth logout (omit cookies)</span>
            </label>
            <div class="swp-caprow">
              <button class="swp-btn swp-cap" id="__swpCaptcha">Fill CAPTCHA</button>
              <button class="swp-btn swp-danger swp-cap-mini" id="__swpCaptchaRefresh" title="Reload CAPTCHA">↻</button>
            </div>
          </div>
          <div class="swp-actions">
            <button class="swp-btn swp-primary" id="__swpMimasRun">Logout → Login</button>
            <button class="swp-btn swp-danger" id="__swpSignout">Sign out</button>
          </div>
          <pre class="swp-log" id="__swpMLog"></pre>
        </div>

        <!-- PAGE 4 — API -->
        <div class="swp-tabpane" data-pane="api">
          <div class="swp-toolbar" style="flex-shrink:0">
            <button class="swp-btn" id="__swpApiClear">🗑 Clear</button>
            <button class="swp-btn" id="__swpApiToggleSlow">⏱ Only slow</button>
          </div>
          <div class="swp-api-list" id="__swpApiList">
            <div class="swp-empty">No API calls captured yet</div>
          </div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(panel);
  const $ = id => panel.querySelector('#' + id);

  const hint = document.createElement('div');
  hint.id = '__swpHint';
  hint.title = 'Ctrl + Shift + Click anywhere to toggle Swap Panel';
  document.body.appendChild(hint);

  /* ═══════════════════════════════════════════════════════
     9. AUTH ↔ MAIN WIRING (with auto-height toggle)
     ═══════════════════════════════════════════════════════ */
  let isAuthed = false;

  const loginMsg = (t, ok) => {
    const m = $('__swpLMsg');
    if (!m) return;
    m.textContent = t || '';
    m.className = 'swp-status' + (ok ? ' swp-ok' : ' swp-err');
  };

  const resetLoginForm = () => {
    const btn = $('__swpLGo');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
    const passEl = $('__swpLPass');
    if (passEl) passEl.value = '';
    loginMsg('');
  };

  const showAuthUI = () => {
    $('__swpAuthWrap').style.display = 'flex';
    $('__swpMainWrap').style.display = 'none';
    $('__swpTitle').textContent = 'BYPASS MENU LOGIN';
    panel.classList.add('swp-auth');        // ← shrink panel to fit login form
    resetLoginForm();
  };

  const showMainUI = () => {
    $('__swpAuthWrap').style.display = 'none';
    $('__swpMainWrap').style.display = 'flex';
    $('__swpTitle').textContent = 'Swap Panel';
    panel.classList.remove('swp-auth');     // ← restore fixed 380px height
  };

  async function doFirebaseLogin() {
    const emailEl = $('__swpLEmail');
    const passEl  = $('__swpLPass');
    if (!emailEl || !passEl) return;
    let email = emailEl.value.trim();
    const pass = passEl.value;
    if (email && !email.includes('@')) email += '@gmail.com';
    if (!email || !pass) { loginMsg('Email and password required'); return; }
    const btn = $('__swpLGo');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    loginMsg('');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      loginMsg('Login success', true);
    } catch (e) {
      const map = {
        'auth/invalid-email': 'Invalid email',
        'auth/user-not-found': 'User not found',
        'auth/wrong-password': 'Wrong password',
        'auth/invalid-credential': 'Wrong email or password',
        'auth/too-many-requests': 'Too many attempts, try later',
        'auth/operation-not-allowed': 'Email/Password sign-in is disabled in Firebase',
        'auth/unauthorized-domain': 'This domain is not authorized in Firebase'
      };
      loginMsg(map[e.code] || e.message);
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  $('__swpLGo').onclick = doFirebaseLogin;
  $('__swpLPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doFirebaseLogin();
  });

  /* ═══════════════════════════════════════════════════════
     10. SHOW / HIDE + UNIFIED TOGGLE
     ═══════════════════════════════════════════════════════ */
  const hidePanel   = () => panel.classList.add('swp-hidden');
  const togglePanel = () => panel.classList.toggle('swp-hidden');

  $('__swpClose').onclick = (e) => { e.stopPropagation(); hidePanel(); };

  document.addEventListener('click', (e) => {
    if (!e.ctrlKey || !e.shiftKey) return;
    if (panel.contains(e.target) && !panel.classList.contains('swp-hidden')) return;
    e.preventDefault();
    e.stopPropagation();
    togglePanel();
  }, true);

  hint.addEventListener('click', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      togglePanel();
    }
  });

  /* ═══════════════════════════════════════════════════════
     11. DRAG
     ═══════════════════════════════════════════════════════ */
  (function makeDraggable() {
    let isDragging = false, startX, startY, startLeft, startTop;

    const beginDrag = (e) => {
      if (e.target.closest('button, input, .swp-list, .swp-row, .swp-api-list, .swp-field input')) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      panel.style.left = startLeft + 'px'; panel.style.top = startTop + 'px';
      panel.style.transition = 'none';
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    };

    panel.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      beginDrag(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = (startLeft + e.clientX - startX) + 'px';
      panel.style.top  = (startTop  + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = '';
      document.body.style.cursor = '';
    });
  })();

  /* ═══════════════════════════════════════════════════════
     12. MAIN TABS
     ═══════════════════════════════════════════════════════ */
  panel.querySelectorAll('.swp-tab[data-tab]').forEach(tab => {
    tab.onclick = () => {
      panel.querySelectorAll('.swp-tab[data-tab]').forEach(t => t.classList.remove('swp-active'));
      panel.querySelectorAll('.swp-tabpane[data-pane]').forEach(p => p.classList.remove('swp-active'));
      tab.classList.add('swp-active');
      const pane = panel.querySelector(`.swp-tabpane[data-pane="${tab.dataset.tab}"]`);
      if (pane) pane.classList.add('swp-active');
    };
  });

  /* ═══════════════════════════════════════════════════════
     13. PAGE SWAP
     ═══════════════════════════════════════════════════════ */
  const showPage = (page) => {
    $('__swpPageList').classList.toggle('swp-current', page === 'list');
    $('__swpPageEdit').classList.toggle('swp-current', page === 'edit');
  };
  $('__swpBack').onclick = () => showPage('list');

  /* ═══════════════════════════════════════════════════════
     14. API LOG RENDER
     ═══════════════════════════════════════════════════════ */
  let apiOnlySlow = false;
  function renderApiLog() {
    const listEl = $('__swpApiList');
    if (!listEl) return;
    const count = $('__swpApiCount');
    if (count) count.textContent = API_LOG.length;
    const shown = apiOnlySlow ? API_LOG.filter(e => e.ms >= SLOW_MS) : API_LOG;
    if (!shown.length) {
      listEl.innerHTML = '<div class="swp-empty">No API calls captured yet</div>';
      return;
    }
    listEl.innerHTML = shown.map(e => {
      let cls = '', msCls = 'swp-ok';
      if (e.ms >= 1000)         { cls = 'swp-very-slow'; msCls = 'swp-err'; }
      else if (e.ms >= SLOW_MS) { cls = 'swp-slow';      msCls = 'swp-warn'; }
      if (!e.ok)                { cls = 'swp-err';       msCls = 'swp-err'; }
      let known = '';
      if (/\/api\/list\/dispatchslips/.test(e.url)) known = 'stone';
      if (/\/api\/list\/transitpass/.test(e.url))   known = 'transit';
      const shortUrl = e.url.replace(/^https?:\/\/[^/]+/, '');
      return `<div class="swp-api-row ${cls}" data-known="${known}" title="${e.url}">
        <div class="swp-api-head">
          <span class="swp-api-method">${e.method}</span>
          <span class="swp-api-url">${shortUrl}</span>
          <span class="swp-api-ms ${msCls}">${e.ms}ms</span>
        </div>
        <div class="swp-api-meta">status ${e.status}</div>
      </div>`;
    }).join('');
  }
  $('__swpApiClear').onclick = () => { API_LOG.length = 0; renderApiLog(); };
  $('__swpApiToggleSlow').onclick = (e) => {
    apiOnlySlow = !apiOnlySlow;
    e.target.textContent = apiOnlySlow ? '⏱ Show all' : '⏱ Only slow';
    renderApiLog();
  };

  /* ═══════════════════════════════════════════════════════
     15. SWAP LIST LOGIC
     ═══════════════════════════════════════════════════════ */
  let listRows = [];
  let currentSide = null;
  let lockedSide = null;

  const getRowId       = r => r.id;
  const getRowPassCode = r => r.pass_code || r.transit_no || r.dispatch_id || r.sp_no || String(r.id);
  const getRowMineral  = r => r.mineral_name || '—';
  const getRowVehicle  = r => r.vehicle_number || '—';

  const setStatusList = (msg, kind = '') => {
    const el = $('__swpStatusList');
    if (!el) return;
    el.textContent = msg;
    el.className = 'swp-status' + (kind ? ' swp-' + kind : '');
  };
  const setStatus = (msg, kind = '') => {
    const el = $('__swpStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'swp-status' + (kind ? ' swp-' + kind : '');
  };

  const renderSideBadge = (side) => {
    const el = $('__swpSideBadge');
    if (!el) return;
    if (side === 'stone')        { el.textContent = '🪨 Stone';   el.style.color = '#22c55e'; el.style.background = '#14532d'; }
    else if (side === 'transit') { el.textContent = '🚚 Transit'; el.style.color = '#fbbf24'; el.style.background = '#451a03'; }
    else                         { el.textContent = '❔';         el.style.color = '#94a3b8'; el.style.background = '#1e293b'; }
  };

  const updateButtonLocks = () => {
    const stoneBtn   = $('__swpLoadStone');
    const transitBtn = $('__swpLoadTransit');
    const unlockBtn  = $('__swpUnlock');
    if (!stoneBtn || !transitBtn || !unlockBtn) return;

    if (lockedSide === 'stone') {
      stoneBtn.disabled = false;
      transitBtn.disabled = true;
      transitBtn.title = '🔒 Locked — Stone is active. Unlock with password.';
      unlockBtn.style.display = 'inline-flex';
    } else if (lockedSide === 'transit') {
      stoneBtn.disabled = true;
      transitBtn.disabled = false;
      stoneBtn.title = '🔒 Locked — Transit is active. Unlock with password.';
      unlockBtn.style.display = 'inline-flex';
    } else {
      stoneBtn.disabled = false;
      transitBtn.disabled = false;
      stoneBtn.title = 'Load Stone Pass list';
      transitBtn.title = 'Load Transit Pass list';
      unlockBtn.style.display = 'none';
    }
  };

  const renderList = (filter = '') => {
    const f = filter.toLowerCase();
    const shown = listRows.filter(r => !f ||
      String(getRowPassCode(r)).toLowerCase().includes(f) ||
      String(r.vehicle_number || '').toLowerCase().includes(f) ||
      String(r.mineral_name || '').toLowerCase().includes(f) ||
      String(r.sp_no || '').toLowerCase().includes(f) ||
      String(r.driver_name || '').toLowerCase().includes(f)
    );
    const listEl = $('__swpList');
    if (!listEl) return;
    if (!shown.length) {
      listEl.innerHTML = '<div class="swp-empty">no rows match</div>';
      return;
    }
    listEl.innerHTML = shown.map((r, i) => {
      const sel = getRowId(r) === SWAPS.targetId ? ' swp-selected' : '';
      return `<div class="swp-row${sel}" data-idx="${i}">
        <div class="swp-row-id">${getRowPassCode(r)}</div>
        <div class="swp-row-sub">${getRowMineral(r)} · ${getRowVehicle(r)}${r.quantity ? ' · ' + r.quantity + ' ' + (r.mineral_unit || '') : ''}${r.driver_name ? ' · ' + r.driver_name : ''}</div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('[data-idx]').forEach(el => {
      el.onclick = () => selectRow(shown[+el.dataset.idx]);
    });
  };

  const selectRow = (r) => {
    if (!r) return;
    SWAPS.targetId = getRowId(r);
    SWAPS.targetPassCode = r.pass_code || null;

    $('__swpSel').textContent = getRowPassCode(r);

    const isTransit = currentSide === 'transit';
    const spInput  = $('__swpSp');
    const vehInput = $('__swpVeh');
    const minInput = $('__swpMin');
    const midInput = $('__swpMid');
    const minLbl   = $('__swpMinLbl');
    const midLbl   = $('__swpMidLbl');

    spInput.value = r.sp_no || '';
    spInput.disabled = false;

    vehInput.value = r.vehicle_number || '';
    vehInput.disabled = false;

    if (isTransit) {
      minInput.value = TRANSIT_MINERAL_NAME;
      minInput.disabled = true;
      minInput.title = '🔒 Locked — transit mineral is always Rough Stone';
      minLbl.classList.add('swp-locked');

      midInput.value = String(TRANSIT_MINERAL_ID);
      midInput.disabled = true;
      midInput.title = '🔒 Locked — transit mineral id is always 3132';
      midLbl.classList.add('swp-locked');
    } else {
      minInput.value = r.mineral_name || '';
      minInput.disabled = false;
      minInput.title = '';
      minLbl.classList.remove('swp-locked');

      midInput.value = r.mineral_id || '';
      midInput.disabled = false;
      midInput.title = '';
      midLbl.classList.remove('swp-locked');
    }

    setStatus('', '');
    showPage('edit');
  };

  $('__swpSearch').oninput = e => renderList(e.target.value);

  const loadSide = async (side) => {
    if (lockedSide && lockedSide !== side) {
      setStatusList(`🔒 ${lockedSide} is locked in. Unlock with password to switch.`, 'err');
      return;
    }

    currentSide = side;
    renderSideBadge(side);
    setStatusList(`loading ${side}…`, '');
    const t0 = performance.now();

    const liveComp = getFreshComp() || comp;
    const ctorName = liveComp?.constructor?.name || '';
    const liveRegion = liveComp?.regionService || region;

    let rows = [];
    let via = '';
    let errReason = '';

    try {
      if (side === 'transit') {
        if (/Transit/i.test(ctorName) && liveComp.dataSource?.data?.length) {
          rows = liveComp.dataSource.data;
          via = `in-memory (${ctorName})`;
        } else {
          via = 'GET /api/list/transitpass';
          const res = await window.__origFetch(
            '/0.2/api/list/transitpass',
            { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' }
          );
          if (!res.ok) {
            errReason = `HTTP ${res.status} ${res.statusText}`;
            throw new Error(errReason);
          }
          const json = await res.json();
          rows = json?.Data || json?.data || [];
          if (!Array.isArray(rows)) {
            errReason = 'response did not contain Data[] array';
            rows = [];
          }
        }
      } else {
        if (/Dispatch/i.test(ctorName) && liveComp.dataSource?.data?.length) {
          rows = liveComp.dataSource.data;
          via = `in-memory (${ctorName})`;
        } else {
          via = 'region.getCreateDispatchList()';
          if (typeof liveRegion?.getCreateDispatchList === 'function') {
            const r = await liveRegion.getCreateDispatchList().toPromise();
            rows = r?.Data || r?.data || [];
          } else {
            via = 'GET /api/list/dispatchslips';
            const res = await window.__origFetch(
              '/0.2/api/list/dispatchslips',
              { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' }
            );
            if (!res.ok) {
              errReason = `HTTP ${res.status} ${res.statusText}`;
              throw new Error(errReason);
            }
            const json = await res.json();
            rows = json?.Data || json?.data || [];
          }
        }
      }
    } catch (e) {
      const msg = errReason || e?.message || String(e);
      setStatusList(`❌ ${side} load failed: ${msg}`, 'err');
      return;
    }

    listRows = rows;
    const ms = Math.round(performance.now() - t0);
    renderList($('__swpSearch').value);

    if (rows.length) {
      lockedSide = side;
      updateButtonLocks();
      setStatusList(`${side} — ${listRows.length} rows in ${ms}ms via ${via} — 🔒 LOCKED`, 'ok');
    } else {
      setStatusList(`${side} — 0 rows in ${ms}ms via ${via}`, 'err');
    }
  };

  $('__swpLoadTransit').onclick = () => loadSide('transit');
  $('__swpLoadStone').onclick   = () => loadSide('stone');

  $('__swpUnlock').onclick = () => {
    const pwd = prompt('Enter unlock password:');
    if (pwd === null) return;
    if (pwd === UNLOCK_PASSWORD) {
      lockedSide = null;
      updateButtonLocks();
      setStatusList('🔓 Unlocked — you can switch sides now', 'ok');
    } else {
      setStatusList('❌ Wrong password', 'err');
    }
  };

  const autoDetectSide = () => {
    const liveComp = getFreshComp();
    if (!liveComp) return null;
    const ctorName = liveComp?.constructor?.name || '';

    if (/Transit/i.test(ctorName)) return 'transit';
    if (/Dispatch/i.test(ctorName)) return 'stone';

    const headers = [...document.querySelectorAll('mat-header-cell')]
      .map(h => h.textContent.trim()).join('|');
    if (/Transit Number/i.test(headers)) return 'transit';
    if (/Dispatch/i.test(headers)) return 'stone';

    return null;
  };

  const applyAutoLock = () => {
    const detected = autoDetectSide();
    if (!detected) return;

    if (lockedSide === null) {
      lockedSide = detected;
      currentSide = detected;
      renderSideBadge(detected);
      updateButtonLocks();
      setStatusList(
        `🔍 Auto-detected ${detected} page — ${detected === 'stone' ? 'Transit' : 'Stone'} button locked. Click 🔓 to switch.`,
        'ok'
      );
    } else if (lockedSide !== detected) {
      lockedSide = detected;
      currentSide = detected;
      renderSideBadge(detected);
      updateButtonLocks();
      setStatusList(
        `🔍 Page changed to ${detected} — auto-locked. Click 🔓 to unlock.`,
        'ok'
      );
    }
  };

  updateButtonLocks();

  let tries = 0;
  const detectNow = () => {
    if (autoDetectSide()) {
      applyAutoLock();
    } else if (tries++ < 10) {
      setTimeout(detectNow, 300);
    }
  };
  detectNow();

  let lastDetectedCtor = comp?.constructor?.name || '';
  const pageWatch = setInterval(() => {
    if (!document.getElementById('__swapPanel')) {
      clearInterval(pageWatch);
      return;
    }
    const liveComp = getFreshComp();
    const ctorNow = liveComp?.constructor?.name || '';
    if (ctorNow && ctorNow !== lastDetectedCtor) {
      lastDetectedCtor = ctorNow;
      applyAutoLock();
    }
  }, 1500);

  $('__swpApply').onclick = () => {
    const r = listRows.find(x => getRowId(x) === SWAPS.targetId);
    if (!r) { setStatus('select a row first', 'err'); return; }

    const isTransit = currentSide === 'transit';
    const sp  = $('__swpSp').value.trim();
    const veh = $('__swpVeh').value.trim();
    const min = isTransit ? TRANSIT_MINERAL_NAME : $('__swpMin').value.trim();
    const midRaw = isTransit ? String(TRANSIT_MINERAL_ID) : $('__swpMid').value.trim();
    const mid = midRaw ? parseInt(midRaw, 10) : NaN;

    const changes = [];

    if (sp && sp !== r.sp_no) {
      SWAPS.SP_NO[r.sp_no] = sp;
      changes.push(`sp_no ${r.sp_no} → ${sp}`);
      r.sp_no = sp;
    }
    if (veh && veh !== r.vehicle_number) {
      SWAPS.VEHICLE[r.vehicle_number] = veh;
      changes.push(`vehicle ${r.vehicle_number} → ${veh}`);
      r.vehicle_number = veh;
    }
    if (!isTransit) {
      if (min && min !== r.mineral_name) {
        SWAPS.MINERAL[r.mineral_name] = min;
        changes.push(`mineral ${r.mineral_name} → ${min}`);
        r.mineral_name = min;
      }
      if (!isNaN(mid) && mid !== r.mineral_id) {
        SWAPS.MINERAL_ID[r.mineral_id] = mid;
        changes.push(`mineral_id ${r.mineral_id} → ${mid}`);
        r.mineral_id = mid;
      }
    } else {
      r.mineral_name  = TRANSIT_MINERAL_NAME;
      if ('mineral_name2' in r) r.mineral_name2 = TRANSIT_MINERAL_NAME;
      r.mineral_id    = TRANSIT_MINERAL_ID;
    }

    setStatus(
      changes.length
        ? `✓ ${getRowPassCode(r)}: ${changes.join(' · ')}${isTransit ? ' · 🔒 Rough Stone' : ''}`
        : `✓ ${getRowPassCode(r)}: no changes`,
      'ok'
    );
  };

  $('__swpClear').onclick = () => {
    SWAPS.targetId = null;
    SWAPS.targetPassCode = null;
    setStatus('target cleared', '');
    showPage('list');
  };

  /* ═══════════════════════════════════════════════════════
     16. PAGE 3 — MIMAS LOGOUT → LOGIN
     ═══════════════════════════════════════════════════════ */
  const mlog = (...a) => {
    const out = $('__swpMLog');
    if (!out) return;
    out.textContent += a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n';
    out.scrollTop = 1e9;
  };

  function getCaptchaVal() {
    const el = document.querySelector('input[formcontrolname="CaptchaDiv"]');
    return el ? (el.value || '').trim() : null;
  }

  function fillCaptcha() {
    const shownEl = document.querySelector('input[formcontrolname="CaptchaDiv"]');
    const box = document.getElementById('txtCaptcha');
    if (!shownEl || !box) {
      mlog('CAPTCHA: fields not found');
      return false;
    }
    const shown = (shownEl.value || '').trim();
    if (!shown) {
      box.focus();
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      mlog('CAPTCHA: image-based — type manually (field focused)');
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(box, shown);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
    box.classList.remove('ng-invalid', 'ng-pristine', 'ng-untouched');
    box.classList.add('ng-valid', 'ng-dirty', 'ng-touched');
    mlog('CAPTCHA filled:', shown);
    return true;
  }

  $('__swpCaptcha').onclick = () => fillCaptcha();

  $('__swpCaptchaRefresh').onclick = () => {
    const before = getCaptchaVal();
    const span = document.getElementById('reloadSpan');
    if (!span) { mlog('CAPTCHA refresh: #reloadSpan not found'); return; }
    const img = span.querySelector('img');
    const fire = el => {
      if (!el) return;
      ['mousedown', 'mouseup', 'click'].forEach(t =>
        el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    };
    try { img && img.click(); } catch (e) {}
    try { span.click(); } catch (e) {}
    fire(img); fire(span);
    setTimeout(() => {
      const after = getCaptchaVal();
      if (after && after !== before) mlog('CAPTCHA refreshed:', after);
      else mlog('CAPTCHA refresh clicked (value unchanged — site may rotate via API)');
    }, 600);
  };

  async function doLogout(U, omit) {
    const r = await fetch('https://mimas.tn.gov.in/0.2/api/logout', {
      method: 'POST',
      credentials: omit ? 'omit' : 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: U })
    });
    mlog('LOGOUT', r.status, await r.text());
    return r.status;
  }

  async function doLogin(U, P) {
    const el = document.querySelector('app-login input, form input');
    if (!el) { mlog('Login page இல்லை — https://mimas.tn.gov.in/ செல்லுங்கள்'); return; }
    if (!window.ng || !ng.getOwningComponent) { mlog('Angular dev mode இல்லை (ng undefined)'); return; }
    const c = ng.getOwningComponent(el);
    if (!c || !c.authService) { mlog('authService கிடைக்கவில்லை'); return; }
    return new Promise(res => {
      c.authService.login(U, c.encryptData(U, P)).subscribe({
        next: x => {
          mlog('LOGIN', x.isSuccess ? 'OK' : 'FAIL', (JSON.stringify(x.value) || '').slice(0, 120));
          res(x);
        },
        error: e => { mlog('LOGIN ERROR', e && e.message || e); res(null); }
      });
    });
  }

  $('__swpMimasRun').onclick = async () => {
    const U = $('__swpMUser').value.trim();
    const P = $('__swpMPass').value;
    if (!U) { mlog('Username தேவை'); return; }
    if (!P) { mlog('Password தேவை'); return; }
    const runBtn = $('__swpMimasRun');
    runBtn.disabled = true;
    runBtn.textContent = 'Working…';
    try {
      fillCaptcha();
      await doLogout(U, $('__swpOmit').checked);
      await new Promise(r => setTimeout(r, 800));
      await doLogin(U, P);
    } catch (e) {
      mlog('ERR', e.message);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Logout → Login';
    }
  };

  $('__swpSignout').onclick = async () => {
    try { await auth.signOut(); } catch (e) { mlog('SIGNOUT ERR', e.message); }
  };

  $('__swpMPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('__swpMimasRun').click();
  });

  mlog('Ready — drag header to move.');

  /* ═══════════════════════════════════════════════════════
     17. KEYBOARD
     ═══════════════════════════════════════════════════════ */
  panel.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id !== '__swpSearch' && e.target.id !== '__swpMPass') {
      e.preventDefault();
      $('__swpApply').click();
    }
    if (e.key === 'Escape') $('__swpClear').click();
  });

  /* ═══════════════════════════════════════════════════════
     18. AUTH STATE (resets sign-in button on sign-out)
     ═══════════════════════════════════════════════════════ */
  auth.onAuthStateChanged(user => {
    isAuthed = !!user;
    if (user) {
      showMainUI();
    } else {
      const btn = $('__swpLGo');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
      const passEl = $('__swpLPass');
      if (passEl) passEl.value = '';
      loginMsg('');
      showAuthUI();
      panel.classList.add('swp-hidden');
    }
  });

  if (auth.currentUser) {
    isAuthed = true;
    showMainUI();
  } else {
    showAuthUI();
  }
})();
