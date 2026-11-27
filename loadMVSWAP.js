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
     2. SWAP MAPS + DETAIL CACHE + APPLY
     ═══════════════════════════════════════════════════════ */
  const SWAPS = {
    VEHICLE:        { 'TN60BV5920': 'TN00AA0001', 'TN00AA0001': 'TN60BV5920' },
    VEHICLE_TYPE:   {},
    QUANTITY:       {},
    MINERAL:        { 'Rough Stone': 'Gravel', 'Gravel': 'Rough Stone' },
    MINERAL_ID:     { 3132: 3133, 3133: 3132 },
    TRANSIT_MINERAL: {},
    SP_NO:          {},
    DRIVER:         {},
    LICENCE:        {},
    PHONE:          {},
    DESTINATION:    {},
    CONSIGNEE:      {},
    CONSIGNEE_ADDR: {},
    START_DT:       {},
    END_DT:         {},
    TRAVEL_HRS:     {},
    TRAVEL_DIST:    {},
    targetId:       null,
    targetPassCode: null
  };
  window.__SWAPS = SWAPS;

  const DETAIL_CACHE = {};
  window.__DETAIL_CACHE = DETAIL_CACHE;

  const TRANSIT_MINERALS = [
    { name: 'M-Sand' },
    { name: 'P-Sand' },
    { name: 'Dust' },
    { name: 'Jelly' },
    { name: 'Rough Stone' }
  ];
  window.__TRANSIT_MINERALS = TRANSIT_MINERALS;
  const TRANSIT_DEFAULT = TRANSIT_MINERALS.find(m => m.name === 'Rough Stone');

  const UNLOCK_PASSWORD = '89';

  /* ── Auto-PDF toggle (persisted) ── */
  const AUTOPDF_KEY = '__swpAutoPdf';
  let autoPdfEnabled = (localStorage.getItem(AUTOPDF_KEY) ?? '1') === '1';

  const setVarietyTo = (obj, label) => {
    if (!obj || !('mineral_variety' in obj)) return false;
    try {
      obj.mineral_variety = JSON.stringify([label]);
      return true;
    } catch {
      obj.mineral_variety = JSON.stringify([label]);
      return true;
    }
  };

  const applySwap = (r, label) => {
    if (!r || typeof r !== 'object') return false;
    let hit = false;

    const isTransitRow = !!r.pass_code || !!r.transit_id;

    if (isTransitRow) {
      const picked = SWAPS.TRANSIT_MINERAL?.[r.mineral_name] || SWAPS.TRANSIT_MINERAL?.[r.mineral_name2];
      if (picked && setVarietyTo(r, picked.name)) hit = true;
    } else {
      if (r.mineral_name  in SWAPS.MINERAL) { r.mineral_name  = SWAPS.MINERAL[r.mineral_name];  hit = true; }
      if (r.mineral_name2 in SWAPS.MINERAL) { r.mineral_name2 = SWAPS.MINERAL[r.mineral_name2]; hit = true; }
      const mid = Number(r.mineral_id);
      if (!isNaN(mid) && mid in SWAPS.MINERAL_ID) { r.mineral_id = SWAPS.MINERAL_ID[mid]; hit = true; }
    }

    if (r.vehicle_number in SWAPS.VEHICLE) { r.vehicle_number = SWAPS.VEHICLE[r.vehicle_number]; hit = true; }

    if (r.vehicle && r.vehicle in SWAPS.VEHICLE_TYPE) { r.vehicle = SWAPS.VEHICLE_TYPE[r.vehicle]; hit = true; }
    if (Array.isArray(r.vehicles)) {
      r.vehicles.forEach(v => {
        if (!v) return;
        if (v.vehicle in SWAPS.VEHICLE_TYPE) { v.vehicle = SWAPS.VEHICLE_TYPE[v.vehicle]; hit = true; }
        if (v.quantity_per_trip in SWAPS.QUANTITY) {
          v.quantity_per_trip = SWAPS.QUANTITY[v.quantity_per_trip]; hit = true;
        }
      });
    }

    if (r.quantity in SWAPS.QUANTITY) { r.quantity = SWAPS.QUANTITY[r.quantity]; hit = true; }

    if (r.sp_no in SWAPS.SP_NO) { r.sp_no = SWAPS.SP_NO[r.sp_no]; hit = true; }

    /* driver_name — BOTH SIDES */
    if (r.driver_name && r.driver_name in SWAPS.DRIVER) {
      r.driver_name = SWAPS.DRIVER[r.driver_name];
      hit = true;
    }

    /* licence / phone / destination — STONE ONLY */
    if (!isTransitRow) {
      if (r.driver_license && r.driver_license in SWAPS.LICENCE)     { r.driver_license = SWAPS.LICENCE[r.driver_license];  hit = true; }
      if (r.driver_number  && r.driver_number  in SWAPS.PHONE)       { r.driver_number  = SWAPS.PHONE[r.driver_number];     hit = true; }
      if (r.location       && r.location       in SWAPS.DESTINATION) { r.location       = SWAPS.DESTINATION[r.location];     hit = true; }
    }

    if (r.consignee_name    && r.consignee_name    in SWAPS.CONSIGNEE)      { r.consignee_name    = SWAPS.CONSIGNEE[r.consignee_name];          hit = true; }
    if (r.consignee_address && r.consignee_address in SWAPS.CONSIGNEE_ADDR) { r.consignee_address = SWAPS.CONSIGNEE_ADDR[r.consignee_address]; hit = true; }

    if (r.travel_distance && r.travel_distance in SWAPS.TRAVEL_DIST) { r.travel_distance = SWAPS.TRAVEL_DIST[r.travel_distance]; hit = true; }
    if (r.travel_hours    && r.travel_hours    in SWAPS.TRAVEL_HRS)  { r.travel_hours    = SWAPS.TRAVEL_HRS[r.travel_hours];    hit = true; }
    if (r.start_datetime  && r.start_datetime  in SWAPS.START_DT)    { r.start_datetime  = SWAPS.START_DT[r.start_datetime];    hit = true; }
    if (r.end_datetime    && r.end_datetime    in SWAPS.END_DT)      { r.end_datetime    = SWAPS.END_DT[r.end_datetime];        hit = true; }

    if (!isTransitRow && typeof r.jsondata === 'string' && r.jsondata) {
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
     3. POST WRAPPER
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
      if (SWAPS.targetId && bodyId && bodyId !== SWAPS.targetId) return obs;

      const label = isDispatchEdit ? 'dispatch-pdf' : 'transit-pdf';

      return new (obs.constructor)(subscriber => obs.subscribe({
        next: res => {
          const row = res?.Data?.[0];
          if (row) {
            const ck = row.dispatch_id || row.pass_code || row.id;
            if (ck && !DETAIL_CACHE[ck]) {
              DETAIL_CACHE[ck] = JSON.parse(JSON.stringify(row));
            }
            if (row.id != null && !DETAIL_CACHE[row.id]) DETAIL_CACHE[row.id] = DETAIL_CACHE[ck];
            applySwap(row, label);
          }
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
        if (okRow) {
          const ck = rowArg.dispatch_id || rowArg.pass_code || rowArg.id;
          if (ck && !DETAIL_CACHE[ck]) DETAIL_CACHE[ck] = JSON.parse(JSON.stringify(rowArg));
          if (rowArg.id != null && !DETAIL_CACHE[rowArg.id]) DETAIL_CACHE[rowArg.id] = DETAIL_CACHE[ck];
          applySwap(rowArg, 'transit-pdf-row');
        }
      }
      return pdfSvc.__origTransitPDF(...args);
    };
  }

  /* ═══════════════════════════════════════════════════════
     5b. XHR HOOKS
     ═══════════════════════════════════════════════════════ */
  if (!window.__editXhrHooked) {
    window.__editXhrHooked = true;
    const _xhrOpen = XMLHttpRequest.prototype.open;
    const _xhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__editUrl = String(url);
      return _xhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const url = this.__editUrl || '';
      const isEdit   = /\/api\/edit\/(dispatch|transitpass)/.test(url);
      const isMinute = /\/api\/get\/minutes/.test(url);

      if (!isEdit && !isMinute) return _xhrSend.apply(this, arguments);

      if (isEdit) {
        this.addEventListener('loadend', () => {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const res = JSON.parse(this.responseText);
            const row = res?.Data?.[0];
            if (!row) return;
            const ck = row.dispatch_id || row.pass_code || row.id;
            if (ck && !DETAIL_CACHE[ck]) {
              DETAIL_CACHE[ck] = JSON.parse(JSON.stringify(row));
              if (row.id != null && !DETAIL_CACHE[row.id]) DETAIL_CACHE[row.id] = DETAIL_CACHE[ck];
              console.log('[XHR-CACHE] cached edit row:', ck, '→ driver:', row.driver_name);
            }
          } catch (e) {
            console.warn('[XHR-CACHE] parse failed:', e.message);
          }
        }, { once: true });
      }

      if (isMinute) {
        let sentBody = null;
        try { sentBody = typeof body === 'string' ? JSON.parse(body) : body; } catch { sentBody = body; }
        this.__minuteReq = sentBody;

        this.addEventListener('loadend', () => {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const res = JSON.parse(this.responseText);
            window.__MINUTE_RESPONSES = window.__MINUTE_RESPONSES || [];
            window.__MINUTE_RESPONSES.push({
              at: Date.now(),
              kilo_meter: Number(this.__minuteReq?.kilo_meter) || null,
              application_id: this.__minuteReq?.application_id ?? null,
              res
            });
            if (window.__MINUTE_RESPONSES.length > 20) window.__MINUTE_RESPONSES.shift();
            window.__LAST_MINUTES_RESP = { res, at: Date.now() };
            console.log('[MINUTES] captured km=', this.__minuteReq?.kilo_meter, '→', res?.Data);
          } catch {}
        }, { once: true });
      }

      return _xhrSend.apply(this, arguments);
    };

    console.log('✅ XHR hooks installed (edit-row + /api/get/minutes ring buffer)');
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
      if (method === 'HEAD' && /\/dist\/?\?/.test(url)) {
        return window.__origFetch.apply(this, arguments);
      }
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
        if (meta.method === 'HEAD' && /\/dist\/?\?/.test(meta.url)) {
          return origSend.apply(this, arguments);
        }
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
        width: 300px; height: 410px;
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
      #__swapPanel.swp-auth { height: auto; min-height: 0; }
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
      #__swapPanel .swp-hbtns { display: flex; gap: 4px; align-items: center; }
      #__swapPanel .swp-iconbtn {
        background: none; border: 0; color: #64748b; font-size: 15px;
        line-height: 1; cursor: pointer; padding: 1px 4px; border-radius: 4px;
        transition: all .15s; font-weight: 700;
      }
      #__swapPanel .swp-iconbtn:hover { color: #f87171; background: #1e293b; }

      /* Auto-PDF toggle pill */
      #__swapPanel .swp-autopdf-pill {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 6px 2px 5px; border-radius: 999px;
        background: #1e293b; border: 1px solid #334155;
        cursor: pointer; font-size: 8.5px; font-weight: 700;
        color: #64748b; transition: all .15s; user-select: none;
      }
      #__swapPanel .swp-autopdf-pill:hover { background: #273449; }
      #__swapPanel .swp-autopdf-pill .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #475569; transition: all .15s;
      }
      #__swapPanel .swp-autopdf-pill.on { color: #bbf7d0; border-color: #22c55e; }
      #__swapPanel .swp-autopdf-pill.on .dot {
        background: #22c55e; box-shadow: 0 0 6px #22c55e;
      }

      #__swapPanel .swp-body {
        padding: 6px 8px 8px; flex: 1;
        display: flex; flex-direction: column;
        overflow: hidden; min-height: 0;
      }
      #__swapPanel.swp-auth .swp-body { flex: 0 0 auto; overflow: visible; }
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
        display: grid; grid-template-columns: 1fr 30px;
        gap: 4px; margin-bottom: 6px; flex-shrink: 0;
      }
      #__swapPanel .swp-caprow .swp-btn { justify-content: center; padding: 5px 4px; min-width: 0; }

      #__swapPanel .swp-btn {
        background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
        border-radius: 5px; padding: 4px 7px; cursor: pointer;
        font-size: 10px; font-weight: 600; transition: all .15s;
        display: inline-flex; align-items: center; gap: 3px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #__swapPanel .swp-btn:hover { background: #273449; border-color: #475569; }
      #__swapPanel .swp-btn:active { transform: scale(.97); }
      #__swapPanel .swp-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }
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
      #__swapPanel .swp-btn.swp-cap-mini { padding: 5px 0 !important; font-size: 12px !important; }
      #__swapPanel .swp-input {
        flex: 1; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 5px;
        padding: 4px 6px; font-size: 10px; outline: none; width: 100%;
      }
      #__swapPanel .swp-input:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-input::placeholder { color: #475569; }
      #__swapPanel select.swp-input { cursor: pointer; }

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
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
      }
      #__swapPanel .swp-fields {
        flex: 1; min-height: 0; overflow-y: auto; padding-right: 2px;
      }
      #__swapPanel.swp-auth .swp-fields { flex: 0 0 auto; overflow: visible; }
      #__swapPanel .swp-fields::-webkit-scrollbar { width: 4px; }
      #__swapPanel .swp-fields::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      #__swapPanel .swp-field { margin-bottom: 6px; }
      #__swapPanel .swp-field label {
        display: block; color: #94a3b8; font-size: 9px;
        margin-bottom: 2px; font-weight: 600;
      }
      #__swapPanel .swp-field label.swp-locked::after { content: ' 🔒'; font-size: 8px; }
      #__swapPanel .swp-field label.swp-auto::after { content: ' ⚡'; font-size: 8px; color: #fbbf24; }
      #__swapPanel .swp-field input, #__swapPanel .swp-field select {
        width: 100%; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 5px;
        padding: 5px 7px; font-size: 11px; outline: none;
        transition: border-color .15s, box-shadow .15s, background .15s;
      }
      #__swapPanel .swp-field input:focus, #__swapPanel .swp-field select:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-field input:disabled, #__swapPanel .swp-field select:disabled {
        background: #0f172a; color: #94a3b8;
        border-color: #1e293b; cursor: not-allowed;
      }
      #__swapPanel .swp-field input.swp-autofilled {
        border-color: #fbbf24; background: #1c1608;
      }
      #__swapPanel .swp-field .swp-hint {
        font-size: 8px; color: #64748b; margin-top: 2px;
        font-style: italic;
      }
      #__swapPanel .swp-actions {
        display: flex; gap: 4px; margin-top: 4px;
        padding-top: 6px; border-top: 1px solid #1e293b; flex-shrink: 0;
      }
      #__swapPanel .swp-actions .swp-btn { flex: 1; justify-content: center; padding: 6px 4px; }
      #__swapPanel .swp-status {
        margin-top: 5px; color: #64748b; font-size: 9px;
        min-height: 12px; word-break: break-word; flex-shrink: 0;
      }
      #__swapPanel .swp-status.swp-ok { color: #22c55e; }
      #__swapPanel .swp-status.swp-err { color: #f87171; }
      #__swapPanel .swp-status.swp-warn { color: #fbbf24; }
      #__swapPanel .swp-side {
        font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px;
        background: #1e293b; color: #94a3b8; white-space: nowrap; margin-left: auto;
      }

      #__swapPanel .swp-toggle-row {
        display: flex; align-items: center; gap: 6px;
        padding: 5px 7px; border-radius: 5px;
        background: rgba(255,255,255,.03);
        cursor: pointer; transition: .15s; margin-bottom: 6px; flex-shrink: 0;
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
      #__swapPanel .swp-toggle-row span { font-size: 10px; color: #c3c9d8; line-height: 1; }
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
        <button class="swp-autopdf-pill" id="__swpAutoPdf" title="Toggle auto-PDF 2s after Apply">
          <span class="dot"></span><span>PDF</span>
        </button>
        <button class="swp-iconbtn" id="__swpClose" title="Hide">×</button>
      </div>
    </div>
    <div class="swp-body">

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

      <div id="__swpMainWrap" style="display:none;flex-direction:column;flex:1;min-height:0">
        <div class="swp-tabs">
          <button class="swp-tab swp-active" data-tab="swap">Swap</button>
          <button class="swp-tab" data-tab="mimas">MIMAS</button>
          <button class="swp-tab" data-tab="api">API <span id="__swpApiCount" style="color:#22c55e">0</span></button>
        </div>

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
                <label id="__swpVTypeLbl">Vehicle type</label>
                <input id="__swpVType" placeholder="e.g. Taurus 25" />
              </div>
              <div class="swp-field">
                <label id="__swpQtyLbl">Quantity per trip</label>
                <input id="__swpQty" placeholder="e.g. 15" />
              </div>

              <div class="swp-field" id="__swpTransitMinWrap" style="display:none">
                <label>Mineral variety (transit)</label>
                <select id="__swpTransitMin" class="swp-input">
                  <option value="M-Sand">M-Sand</option>
                  <option value="P-Sand">P-Sand</option>
                  <option value="Dust">Dust</option>
                  <option value="Jelly">Jelly</option>
                  <option value="Rough Stone" selected>Rough Stone</option>
                </select>
                <div class="swp-hint">Only mineral_variety is written. mineral_id / name / name2 / unit untouched.</div>
              </div>

              <div class="swp-field" id="__swpMinWrap">
                <label id="__swpMinLbl">Mineral name</label>
                <input id="__swpMin" placeholder="e.g. Gravel" />
              </div>
              <div class="swp-field" id="__swpMidWrap">
                <label id="__swpMidLbl">Mineral id</label>
                <input id="__swpMid" placeholder="e.g. 3133" type="number" />
              </div>

              <div class="swp-field">
                <label id="__swpDrvLbl">Driver name</label>
                <input id="__swpDrv" placeholder="e.g. Murugan" />
              </div>
              <div class="swp-field">
                <label id="__swpLicLbl">Licence number</label>
                <input id="__swpLic" placeholder="e.g. TN0120180001234" />
              </div>
              <div class="swp-field">
                <label id="__swpPhnLbl">Phone number</label>
                <input id="__swpPhn" placeholder="e.g. 9876543210" type="tel" />
              </div>
              <div class="swp-field">
                <label id="__swpDestLbl">Destination address</label>
                <input id="__swpDest" placeholder="e.g. KALLUPATTI" />
              </div>
              <div class="swp-field">
                <label id="__swpConsLbl">Delivered To (name)</label>
                <input id="__swpCons" placeholder="e.g. MKM" />
              </div>
              <div class="swp-field">
                <label id="__swpConsAddrLbl">Delivered To (address)</label>
                <input id="__swpConsAddr" placeholder="e.g. BODI" />
              </div>

              <div class="swp-field">
                <label id="__swpDistLbl" class="swp-auto">Distance (km) — tab out to compute</label>
                <input id="__swpDist" placeholder="e.g. 151" type="number" min="1" />
                <div class="swp-hint">Press Tab / Enter / click away → hours + start/end auto-fill</div>
              </div>
              <div class="swp-field">
                <label id="__swpHrsLbl" class="swp-auto">Travel hours</label>
                <input id="__swpHrs" placeholder="e.g. 5 hrs" />
                <div class="swp-hint">Edit to re-derive end time</div>
              </div>
              <div class="swp-field">
                <label id="__swpStartLbl" class="swp-auto">Start date-time</label>
                <input id="__swpStart" placeholder="YYYY-MM-DD HH:mm:ss" />
                <div class="swp-hint">Auto-set to (current time − 1 min) on each distance call</div>
              </div>
              <div class="swp-field">
                <label id="__swpEndLbl">End date-time</label>
                <input id="__swpEnd" placeholder="YYYY-MM-DD HH:mm:ss" />
              </div>
            </div>
            <div class="swp-actions">
              <button class="swp-btn swp-primary" id="__swpApply">✓ Apply</button>
              <button class="swp-btn swp-danger" id="__swpClear">✕ Clear</button>
            </div>
            <div class="swp-status" id="__swpStatus"></div>
          </div>
        </div>

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
     8b. AUTO-PDF TOGGLE WIRING
     ═══════════════════════════════════════════════════════ */
  const autoPdfBtn = $('__swpAutoPdf');
  const paintAutoPdf = () => {
    autoPdfBtn.classList.toggle('on', autoPdfEnabled);
    autoPdfBtn.title = autoPdfEnabled
      ? 'Auto-PDF ON — will click PDF 2 s after Apply (click to disable)'
      : 'Auto-PDF OFF — no automatic PDF (click to enable)';
  };
  autoPdfBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    autoPdfEnabled = !autoPdfEnabled;
    localStorage.setItem(AUTOPDF_KEY, autoPdfEnabled ? '1' : '0');
    paintAutoPdf();
  });
  paintAutoPdf();

  /* ═══════════════════════════════════════════════════════
     9. AUTH ↔ MAIN WIRING
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
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
    const passEl = $('__swpLPass');
    if (passEl) passEl.value = '';
    loginMsg('');
  };

  const showAuthUI = () => {
    $('__swpAuthWrap').style.display = 'flex';
    $('__swpMainWrap').style.display = 'none';
    $('__swpTitle').textContent = 'BYPASS MENU LOGIN';
    panel.classList.add('swp-auth');
    resetLoginForm();
  };

  const showMainUI = () => {
    $('__swpAuthWrap').style.display = 'none';
    $('__swpMainWrap').style.display = 'flex';
    $('__swpTitle').textContent = 'Swap Panel';
    panel.classList.remove('swp-auth');
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
      if (e.target.closest('button, input, select, .swp-list, .swp-row, .swp-api-list, .swp-field input, .swp-field select')) return;
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
     14. AUTO TIME HELPERS
     ═══════════════════════════════════════════════════════ */
  const pad2 = n => String(n).padStart(2, '0');

  const parseStore = (s) => {
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  };
  const fmtStore = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  const formatMinutes = (totalMinutes) => {
    const m = Math.max(0, Math.round(totalMinutes));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h && mm) return `${h} hrs ${mm} mins`;
    if (h) return `${h} hrs`;
    return `${mm} mins`;
  };

  const parseHoursToMinutes = (s) => {
    if (!s) return 0;
    let total = 0;
    const hr  = String(s).match(/(\d+(?:\.\d+)?)\s*hrs?/i);
    const min = String(s).match(/(\d+)\s*mins?/i);
    if (hr)  total += parseFloat(hr[1]) * 60;
    if (min) total += parseInt(min[1], 10);
    if (!hr && !min) {
      const n = parseFloat(s);
      if (!isNaN(n)) total = n * 60;
    }
    return Math.round(total);
  };

  let editState = {
    rowRef: null,
    cached: null,
    originalDistance: '',
    originalHours: '',
    originalStart: '',
    originalEnd: '',
    lastComputedMinutes: null,
    liveFormSubs: [],
    liveFormRef: null,
    liveDistCtrl: null,
    liveHrsCtrl: null,
    liveStartCtrl: null,
    liveEndCtrl: null
  };

  let isMirroring = false;
  const mirror = (fn) => {
    if (isMirroring) return;
    isMirroring = true;
    try { fn(); } finally { setTimeout(() => { isMirroring = false; }, 0); }
  };

  const setFieldAuto = (el, on) => {
    if (!el) return;
    el.classList.toggle('swp-autofilled', !!on);
  };

  const START_OFFSET_MS = 60 * 1000;
  const setStartToNow = () => {
    const now = new Date(Date.now() - START_OFFSET_MS);
    const s = fmtStore(now);
    $('__swpStart').value = s;
    setFieldAuto($('__swpStart'), true);
    return s;
  };

  const pushStartToLiveForm = () => {
    if (!editState.liveStartCtrl || isMirroring) return;
    try {
      isMirroring = true;
      editState.liveStartCtrl.setValue($('__swpStart').value);
      editState.liveStartCtrl.markAsDirty?.();
      editState.liveStartCtrl.markAsTouched?.();
      setTimeout(() => { isMirroring = false; }, 0);
    } catch { isMirroring = false; }
  };

  const recalcEndFromStartAndMinutes = () => {
    const startStr = $('__swpStart').value.trim();
    const mins = editState.lastComputedMinutes;
    if (mins == null || !startStr) return;
    const start = parseStore(startStr);
    if (!start) return;
    const end = new Date(start.getTime() + mins * 60000);
    $('__swpEnd').value = fmtStore(end);
    setFieldAuto($('__swpEnd'), true);
  };

  const getLiveForm = () => {
    if (typeof ng === 'undefined' || !ng.getOwningComponent) return null;
    const candidates = [
      'form input[formcontrolname]',
      'mat-dialog-container input[formcontrolname]',
      'mat-card input[formcontrolname]',
      'input[formcontrolname="kilo_meter"]',
      'input[formcontrolname="travel_distance"]'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (!el) continue;
      try {
        const c = ng.getOwningComponent(el);
        let node = c;
        for (let i = 0; i < 6 && node; i++) {
          for (const key of ['form', 'dispatchForm', 'editForm', 'formGroup', 'dispatchFormGroup', 'passForm']) {
            const fg = node[key];
            if (fg && typeof fg.get === 'function' && fg.controls) return fg;
          }
          node = Object.getPrototypeOf(node);
        }
      } catch {}
    }
    return null;
  };

  const teardownLiveForm = () => {
    editState.liveFormSubs.forEach(s => { try { s.unsubscribe(); } catch {} });
    editState.liveFormSubs = [];
    editState.liveFormRef = null;
    editState.liveDistCtrl = null;
    editState.liveHrsCtrl = null;
    editState.liveStartCtrl = null;
    editState.liveEndCtrl = null;
  };

  const bindLiveForm = () => {
    teardownLiveForm();
    const form = getLiveForm();
    if (!form) return false;

    const distCtrl  = form.get('travel_distance')  || form.get('kilo_meter') || form.get('distance');
    const hrsCtrl   = form.get('travel_hours')     || form.get('hours');
    const startCtrl = form.get('start_datetime')   || form.get('start_date');
    const endCtrl   = form.get('end_datetime')     || form.get('end_date');

    if (!distCtrl && !hrsCtrl && !endCtrl) return false;

    editState.liveFormRef   = form;
    editState.liveDistCtrl  = distCtrl;
    editState.liveHrsCtrl   = hrsCtrl;
    editState.liveStartCtrl = startCtrl;
    editState.liveEndCtrl   = endCtrl;

    const subs = editState.liveFormSubs;

    if (distCtrl) {
      subs.push(distCtrl.valueChanges.subscribe(v => {
        if (v == null) return;
        const sv = String(v);
        if (isMirroring) return;
        mirror(() => {
          if (sv !== $('__swpDist').value) $('__swpDist').value = sv;
          setFieldAuto($('__swpDist'), true);
        });
      }));
    }

    if (hrsCtrl) {
      subs.push(hrsCtrl.valueChanges.subscribe(v => {
        if (isMirroring || v == null || v === '') return;
        mirror(() => {
          const sv = String(v);
          $('__swpHrs').value = sv;
          setFieldAuto($('__swpHrs'), true);
          const mins = parseHoursToMinutes(sv);
          if (mins) {
            editState.lastComputedMinutes = mins;
            if ($('__swpStart').value.trim()) recalcEndFromStartAndMinutes();
          }
        });
      }));
    }

    if (startCtrl) {
      subs.push(startCtrl.valueChanges.subscribe(v => {
        if (isMirroring || v == null || v === '') return;
        mirror(() => {
          $('__swpStart').value = String(v);
          setFieldAuto($('__swpStart'), true);
          recalcEndFromStartAndMinutes();
        });
      }));
    }

    if (endCtrl) {
      subs.push(endCtrl.valueChanges.subscribe(v => {
        if (isMirroring || v == null || v === '') return;
        mirror(() => {
          $('__swpEnd').value = String(v);
          setFieldAuto($('__swpEnd'), true);
        });
      }));
    }

    return true;
  };

  const waitForMinutesResponse = (distanceKm, sinceMs, timeoutMs = 4000) => new Promise(resolve => {
    const target = Number(distanceKm);
    const start = Date.now();
    const seenCount = (window.__MINUTE_RESPONSES || []).length;
    const tick = () => {
      const arr = window.__MINUTE_RESPONSES || [];
      for (let i = seenCount; i < arr.length; i++) {
        const rec = arr[i];
        if (!rec || rec.at < sinceMs) continue;
        if (rec.kilo_meter == null) continue;
        if (Math.abs(Number(rec.kilo_meter) - target) > 0.001) continue;
        const res = rec.res;
        if (res && res.isSuccess && res.Data) {
          const isGT = editState.cached?.mineral_type == 1;
          const hourVal = isGT ? res.Data.gt_hour : res.Data.hour;
          const raw = parseFloat(hourVal);
          if (!isNaN(raw) && raw > 0) return resolve(Math.round(raw * 60));
        }
      }
      if (Date.now() - start >= timeoutMs) return resolve(null);
      setTimeout(tick, 80);
    };
    tick();
  });

  const computeMinutesForDistance = (distance, applicationId) => {
    return new Promise(resolve => {
      const d = parseFloat(distance);
      if (!d || d <= 0) return resolve(null);

      let fallbackRate = 30;
      const od = parseFloat(editState.originalDistance);
      const om = parseHoursToMinutes(editState.originalHours);
      if (od > 0 && om > 0) fallbackRate = od / (om / 60);
      const fallback = () => resolve(Math.max(1, Math.round((d / fallbackRate) * 60)));

      try {
        if (!region || typeof region.gethrbydistance !== 'function') return fallback();
        const params = { kilo_meter: d, application_id: applicationId };
        const obs = region.gethrbydistance(params);
        const sub = obs.subscribe({
          next: res => {
            try { sub && sub.unsubscribe && sub.unsubscribe(); } catch {}
            if (res && res.isSuccess && res.Data) {
              const isGT = editState.cached?.mineral_type == 1;
              const hourVal = isGT ? res.Data.gt_hour : res.Data.hour;
              const raw = parseFloat(hourVal);
              if (!isNaN(raw) && raw > 0) return resolve(Math.round(raw * 60));
            }
            fallback();
          },
          error: () => { try { sub && sub.unsubscribe && sub.unsubscribe(); } catch {} fallback(); }
        });
      } catch (e) {
        fallback();
      }
    });
  };

  const scheduleDistanceRecalc = async () => {
    const raw = $('__swpDist').value.trim();
    const d = parseFloat(raw);
    if (!d || d <= 0) { editState.lastComputedMinutes = null; return; }

    if (editState.liveDistCtrl) {
      const t0 = Date.now();

      isMirroring = true;
      try {
        editState.liveDistCtrl.setValue(d, { emitEvent: true });
        editState.liveDistCtrl.markAsDirty?.();
        editState.liveDistCtrl.markAsTouched?.();
      } catch (e) {
        isMirroring = false;
        console.warn('[swap] setValue failed:', e.message);
        return;
      }

      setStatus('waiting for /api/get/minutes…', '');
      const mins = await waitForMinutesResponse(d, t0, 4000);

      setTimeout(() => { isMirroring = false; }, 0);

      if (mins != null) {
        editState.lastComputedMinutes = mins;
        mirror(() => {
          $('__swpHrs').value = formatMinutes(mins);
          setFieldAuto($('__swpHrs'), true);
        });

        setStartToNow();
        pushStartToLiveForm();
        recalcEndFromStartAndMinutes();

        setStatus('hours from site /api/get/minutes ✓ (start = now − 1 min)', 'ok');
      } else {
        const fb = await computeMinutesForDistance(
          d,
          editState.cached?.application_id ?? editState.rowRef?.application_id
        );
        if (fb != null) {
          editState.lastComputedMinutes = fb;
          mirror(() => {
            $('__swpHrs').value = formatMinutes(fb);
            setFieldAuto($('__swpHrs'), true);
          });

          setStartToNow();
          pushStartToLiveForm();
          recalcEndFromStartAndMinutes();

          setStatus('site timed out — used fallback ✓ (start = now − 1 min)', 'warn');
        } else {
          setStatus('no hours returned — enter hours manually', 'err');
        }
      }
      return;
    }

    const appId = editState.cached?.application_id ?? editState.rowRef?.application_id;
    const mins  = await computeMinutesForDistance(d, appId);
    if (mins == null) return;
    editState.lastComputedMinutes = mins;
    $('__swpHrs').value = formatMinutes(mins);
    setFieldAuto($('__swpHrs'), true);

    setStartToNow();
    pushStartToLiveForm();
    recalcEndFromStartAndMinutes();
  };

  const onHoursTyped = () => {
    const mins = parseHoursToMinutes($('__swpHrs').value);
    if (!mins) { editState.lastComputedMinutes = null; return; }
    editState.lastComputedMinutes = mins;
    setFieldAuto($('__swpHrs'), true);
    recalcEndFromStartAndMinutes();
    if (editState.liveHrsCtrl && !isMirroring) {
      try {
        isMirroring = true;
        editState.liveHrsCtrl.setValue($('__swpHrs').value);
        setTimeout(() => { isMirroring = false; }, 0);
      } catch { isMirroring = false; }
    }
  };

  const onStartTyped = () => {
    setFieldAuto($('__swpStart'), false);
    setFieldAuto($('__swpEnd'), false);
    recalcEndFromStartAndMinutes();
    if (editState.liveStartCtrl && !isMirroring) {
      try {
        isMirroring = true;
        editState.liveStartCtrl.setValue($('__swpStart').value);
        setTimeout(() => { isMirroring = false; }, 0);
      } catch { isMirroring = false; }
    }
  };

  /* ═══════════════════════════════════════════════════════
     15. API LOG RENDER
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
     16. SWAP LIST LOGIC
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

  const lockField = (id, lblId, locked, lockedTitle = '', normalTitle = '') => {
    const el = $(id);
    const lbl = $(lblId);
    if (!el) return;
    el.disabled = !!locked;
    el.title = locked ? lockedTitle : normalTitle;
    if (lbl) lbl.classList.toggle('swp-locked', !!locked);
  };

  const TRANSIT_LOCKED_FIELDS = [
    ['__swpLic',   '__swpLicLbl'],
    ['__swpPhn',   '__swpPhnLbl'],
    ['__swpDest',  '__swpDestLbl'],
    ['__swpVType', '__swpVTypeLbl'],
  ];
  const applyTransitLocks = (on) => {
    TRANSIT_LOCKED_FIELDS.forEach(([id, lblId]) => {
      lockField(id, lblId, on, '🔒 Locked — not editable on Transit side', '');
    });
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
    SWAPS.targetPassCode = r.pass_code || r.dispatch_id || null;

    $('__swpSel').textContent = getRowPassCode(r);

    const isTransit = currentSide === 'transit';

    const cacheKey = r.dispatch_id || r.pass_code || r.id;
    const cached = DETAIL_CACHE[cacheKey] || DETAIL_CACHE[r.id];
    const src = cached || r;

    teardownLiveForm();
    editState.rowRef = r;
    editState.cached = cached || null;
    editState.originalDistance = String(src.travel_distance ?? '');
    editState.originalHours    = String(src.travel_hours ?? '');
    editState.originalStart    = String(src.start_datetime ?? '');
    editState.originalEnd      = String(src.end_datetime ?? '');
    editState.lastComputedMinutes = parseHoursToMinutes(src.travel_hours) || null;

    const vlist = Array.isArray(src.vehicles) ? src.vehicles : [];
    const v0 = vlist[0] || {};

    $('__swpSp').value       = src.sp_no || '';
    $('__swpVeh').value      = src.vehicle_number || '';
    $('__swpVType').value    = v0.vehicle ?? src.vehicle ?? '';
    $('__swpQty').value      = v0.quantity_per_trip ?? src.quantity ?? '';
    $('__swpDrv').value      = src.driver_name || '';
    $('__swpLic').value      = src.driver_license || '';
    $('__swpPhn').value      = src.driver_number || '';
    $('__swpDest').value     = src.location || '';
    $('__swpCons').value     = src.consignee_name || '';
    $('__swpConsAddr').value = src.consignee_address || '';

    $('__swpDist').value  = editState.originalDistance;
    $('__swpHrs').value   = editState.originalHours;
    $('__swpStart').value = editState.originalStart;
    $('__swpEnd').value   = editState.originalEnd;

    [ '__swpDist','__swpHrs','__swpStart','__swpEnd' ].forEach(id => setFieldAuto($(id), false));

    $('__swpTransitMinWrap').style.display = isTransit ? '' : 'none';
    $('__swpMinWrap').style.display  = isTransit ? 'none' : '';
    $('__swpMidWrap').style.display  = isTransit ? 'none' : '';

    if (isTransit) {
      let curVariety = null;
      try {
        const v = typeof src.mineral_variety === 'string' ? JSON.parse(src.mineral_variety) : src.mineral_variety;
        if (Array.isArray(v)) curVariety = v[0];
      } catch {}
      const sel = $('__swpTransitMin');
      sel.value = TRANSIT_MINERALS.some(m => m.name === curVariety) ? curVariety : 'Rough Stone';
      sel.disabled = false;
      applyTransitLocks(true);
      lockField('__swpDrv', '__swpDrvLbl', false, '', '');
    } else {
      $('__swpMin').value = src.mineral_name || '';
      $('__swpMin').disabled = false;
      $('__swpMin').title = '';
      $('__swpMinLbl').classList.remove('swp-locked');

      $('__swpMid').value = src.mineral_id || '';
      $('__swpMid').disabled = false;
      $('__swpMid').title = '';
      $('__swpMidLbl').classList.remove('swp-locked');

      applyTransitLocks(false);
    }

    showPage('edit');

    if (!cached && ds && hasMethod(ds, 'post')) {
      setStatus('loading detail…', '');
      const numericId = (typeof r.id === 'number') ? r.id : Number(r.id);
      if (!numericId || isNaN(numericId)) {
        setStatus('no numeric id on row — cannot fetch detail', 'err');
      } else {
        const editUrl = isTransit ? '/api/edit/transitpass' : '/api/edit/dispatch';
        const detailBody = isTransit
          ? { pass_id: numericId }
          : { dispatch_id: numericId };
        try {
          ds.post(editUrl, detailBody).subscribe({
            next: res => {
              const d = res?.Data?.[0];
              if (!d) { setStatus('detail response empty', 'err'); return; }
              const ck = d.dispatch_id || d.pass_code || d.id;
              if (ck && !DETAIL_CACHE[ck]) DETAIL_CACHE[ck] = JSON.parse(JSON.stringify(d));
              if (d.id != null && !DETAIL_CACHE[d.id]) DETAIL_CACHE[d.id] = DETAIL_CACHE[ck];

              editState.cached = d;
              editState.originalDistance = String(d.travel_distance ?? '');
              editState.originalHours    = String(d.travel_hours ?? '');
              editState.originalStart    = String(d.start_datetime ?? '');
              editState.originalEnd      = String(d.end_datetime ?? '');
              editState.lastComputedMinutes = parseHoursToMinutes(d.travel_hours) || null;

              const dv = Array.isArray(d.vehicles) ? (d.vehicles[0] || {}) : {};

              $('__swpSp').value       = d.sp_no          || $('__swpSp').value;
              $('__swpVeh').value      = d.vehicle_number || $('__swpVeh').value;
              $('__swpVType').value    = dv.vehicle ?? d.vehicle ?? $('__swpVType').value;
              $('__swpQty').value      = dv.quantity_per_trip ?? d.quantity ?? $('__swpQty').value;
              $('__swpDrv').value      = d.driver_name    || '';
              $('__swpLic').value      = d.driver_license || '';
              $('__swpPhn').value      = d.driver_number  || '';
              $('__swpDest').value     = d.location          || '';
              $('__swpCons').value     = d.consignee_name    || '';
              $('__swpConsAddr').value = d.consignee_address || '';
              $('__swpDist').value  = editState.originalDistance;
              $('__swpHrs').value   = editState.originalHours;
              $('__swpStart').value = editState.originalStart;
              $('__swpEnd').value   = editState.originalEnd;

              if (!isTransit) {
                if (d.mineral_name) $('__swpMin').value = d.mineral_name;
                if (d.mineral_id)   $('__swpMid').value = d.mineral_id;
              } else {
                let curVariety = null;
                try {
                  const v = typeof d.mineral_variety === 'string' ? JSON.parse(d.mineral_variety) : d.mineral_variety;
                  if (Array.isArray(v)) curVariety = v[0];
                } catch {}
                const sel = $('__swpTransitMin');
                sel.value = TRANSIT_MINERALS.some(m => m.name === curVariety) ? curVariety : 'Rough Stone';
                applyTransitLocks(true);
                lockField('__swpDrv', '__swpDrvLbl', false, '', '');
              }

              const bound = bindLiveForm();
              setStatus(
                bound
                  ? 'details loaded ✓ — live form bound (distance fires on blur)'
                  : 'details loaded ✓ — edit then Apply',
                'ok'
              );
            },
            error: e => {
              const msg = e?.message || e?.statusText || 'HTTP error';
              setStatus(`detail fetch failed (${msg}) — click row on site once`, 'err');
            }
          });
        } catch (e) {
          setStatus('detail fetch error: ' + (e?.message || e), 'err');
        }
      }
    } else if (cached) {
      const bound = bindLiveForm();
      setStatus(
        bound
          ? 'details from cache ✓ — live form bound'
          : 'details from cache ✓',
        'ok'
      );
    } else {
      setStatus('no detail — click row on site once, then re-select', '');
    }
  };

  /* ── Auto-PDF helper ── */
  const clickRowPdfButton = (rowId) => {
    const row = listRows.find(x => getRowId(x) === rowId);
    if (!row) { console.warn('[auto-pdf] row not in listRows', rowId); return false; }
    const passCode = getRowPassCode(row);

    /* 1) match by pass-code text (robust against sort / virtual-scroll) */
    let rowEl = [...document.querySelectorAll('mat-row')]
      .find(el => el.textContent.includes(passCode));

    /* 2) fall back to index */
    if (!rowEl) {
      const idx = listRows.findIndex(x => getRowId(x) === rowId);
      if (idx >= 0) {
        const rows = document.querySelectorAll('mat-table mat-row');
        rowEl = rows[idx] || null;
      }
    }
    if (!rowEl) { console.warn('[auto-pdf] row DOM not found for', passCode); return false; }

    /* find the PDF button */
    let pdfBtn = [...rowEl.querySelectorAll('mat-cell.mat-column-actions button')]
      .find(b => /fa-file-pdf-o|Download Dispatch/i.test(b.innerHTML + ' ' + (b.getAttribute('mattooltip') || '')));

    if (!pdfBtn) {
      pdfBtn = [...rowEl.querySelectorAll('button')]
        .find(b => /fa-file-pdf-o/i.test(b.innerHTML));
    }
    if (!pdfBtn) { console.warn('[auto-pdf] PDF button not found on row', passCode); return false; }

    rowEl.style.outline = '2px solid #22c55e';
    setTimeout(() => { rowEl.style.outline = ''; }, 1500);

    pdfBtn.click();
    console.log('[auto-pdf] clicked PDF for', passCode);
    return true;
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

  /* ═══════════════════════════════════════════════════════
     17. AUTO-FILL WIRING
     ═══════════════════════════════════════════════════════ */
  const distEl = $('__swpDist');

  let lastDistanceTriggered = null;

  const triggerDistanceOnce = () => {
    const raw = distEl.value.trim();
    const d = parseFloat(raw);
    if (!d || d <= 0) { editState.lastComputedMinutes = null; return; }
    if (lastDistanceTriggered === raw) return;
    lastDistanceTriggered = raw;
    scheduleDistanceRecalc();
  };

  distEl.addEventListener('change', triggerDistanceOnce);

  distEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (document.activeElement === distEl) {
        distEl.blur();
        if (lastDistanceTriggered !== distEl.value.trim()) triggerDistanceOnce();
      }
    }
  });

  distEl.addEventListener('focus', () => { lastDistanceTriggered = null; });

  distEl.addEventListener('input', () => {
    if (distEl.value.trim() !== lastDistanceTriggered) lastDistanceTriggered = null;
  });

  $('__swpHrs').addEventListener('input', onHoursTyped);
  $('__swpStart').addEventListener('input', onStartTyped);

  /* ═══════════════════════════════════════════════════════
     18. APPLY HANDLER
     ═══════════════════════════════════════════════════════ */
  $('__swpApply').onclick = () => {
    const r = listRows.find(x => getRowId(x) === SWAPS.targetId);
    if (!r) { setStatus('select a row first', 'err'); return; }

    const isTransit = currentSide === 'transit';
    const sp    = $('__swpSp').value.trim();
    const veh   = $('__swpVeh').value.trim();
    const vtype = $('__swpVType').value.trim();
    const qty   = $('__swpQty').value.trim();

    const changes = [];
    const warnings = [];

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

    const cacheKey = r.dispatch_id || r.pass_code || r.id;
    const cached = DETAIL_CACHE[cacheKey] || DETAIL_CACHE[r.id];

    const cachedV0 = cached && Array.isArray(cached.vehicles) ? (cached.vehicles[0] || {}) : {};
    const curVType = cachedV0.vehicle ?? cached?.vehicle ?? r.vehicle ?? '';
    const curQty   = cachedV0.quantity_per_trip ?? cached?.quantity ?? r.quantity ?? '';

    if (vtype && vtype !== curVType) {
      if (curVType) {
        SWAPS.VEHICLE_TYPE[curVType] = vtype;
        changes.push(`vehicle_type ${curVType} → ${vtype}`);
      } else warnings.push('vehicle_type: no original');
      if (cached) {
        cached.vehicle = vtype;
        if (Array.isArray(cached.vehicles) && cached.vehicles[0]) cached.vehicles[0].vehicle = vtype;
      }
      r.vehicle = vtype;
      if (Array.isArray(r.vehicles) && r.vehicles[0]) r.vehicles[0].vehicle = vtype;
    }

    if (qty && qty !== curQty) {
      if (curQty) {
        SWAPS.QUANTITY[curQty] = qty;
        changes.push(`quantity ${curQty} → ${qty}`);
      } else warnings.push('quantity: no original');
      if (cached) {
        cached.quantity = qty;
        if (Array.isArray(cached.vehicles) && cached.vehicles[0]) cached.vehicles[0].quantity_per_trip = qty;
      }
      r.quantity = qty;
      if (Array.isArray(r.vehicles) && r.vehicles[0]) r.vehicles[0].quantity_per_trip = qty;
    }

    /* DRIVER NAME — BOTH SIDES */
    {
      const curDrv = cached?.driver_name ?? r.driver_name ?? '';
      const drv = $('__swpDrv').value.trim();
      if (drv && drv !== curDrv) {
        if (curDrv) {
          SWAPS.DRIVER[curDrv] = drv;
          changes.push(`driver ${curDrv} → ${drv}`);
          if (cached) cached.driver_name = drv;
          r.driver_name = drv;
        } else warnings.push('driver: no original — open row on site first, then re-apply');
      }
    }

    /* LICENCE / PHONE / DESTINATION / STONE-MINERAL — STONE ONLY */
    if (!isTransit) {
      const curLic = cached?.driver_license ?? r.driver_license ?? '';
      const curPhn = cached?.driver_number  ?? r.driver_number  ?? '';

      const lic = $('__swpLic').value.trim();
      const phn = $('__swpPhn').value.trim();

      if (lic && lic !== curLic) {
        if (curLic) {
          SWAPS.LICENCE[curLic] = lic;
          changes.push(`licence ${curLic} → ${lic}`);
          if (cached) cached.driver_license = lic;
          r.driver_license = lic;
        } else warnings.push('licence: no original — open row on site first, then re-apply');
      }
      if (phn && phn !== curPhn) {
        if (curPhn) {
          SWAPS.PHONE[curPhn] = phn;
          changes.push(`phone ${curPhn} → ${phn}`);
          if (cached) cached.driver_number = phn;
          r.driver_number = phn;
        } else warnings.push('phone: no original — open row on site first, then re-apply');
      }

      const curDest = cached?.location ?? r.location ?? '';
      const dest = $('__swpDest').value.trim();
      if (dest && dest !== curDest) {
        if (curDest) {
          SWAPS.DESTINATION[curDest] = dest;
          changes.push(`destination ${curDest} → ${dest}`);
          if (cached) cached.location = dest;
          r.location = dest;
        } else warnings.push('destination: no original — open row on site first, then re-apply');
      }

      const min = $('__swpMin').value.trim();
      const midRaw = $('__swpMid').value.trim();
      const mid = midRaw ? parseInt(midRaw, 10) : NaN;

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
      /* TRANSIT: write ONLY mineral_variety. */
      const label = $('__swpTransitMin').value || 'Rough Stone';
      const picked = TRANSIT_MINERALS.find(m => m.name === label) || TRANSIT_DEFAULT;

      let curVariety = null;
      try {
        const v = typeof r.mineral_variety === 'string' ? JSON.parse(r.mineral_variety) : r.mineral_variety;
        if (Array.isArray(v)) curVariety = v[0];
      } catch {}

      if (curVariety !== picked.name) {
        SWAPS.TRANSIT_MINERAL[r.mineral_name] = picked;
        changes.push(`mineral_variety ${curVariety || '(none)'} → ${picked.name}`);
      }

      r.mineral_variety = JSON.stringify([picked.name]);
      if (cached) cached.mineral_variety = JSON.stringify([picked.name]);
    }

    /* consignee — both sides */
    const curCons = cached?.consignee_name ?? r.consignee_name ?? '';
    const cons = $('__swpCons').value.trim();
    if (cons && cons !== curCons) {
      if (curCons) {
        SWAPS.CONSIGNEE[curCons] = cons;
        changes.push(`delivered-to name ${curCons} → ${cons}`);
        if (cached) cached.consignee_name = cons;
        r.consignee_name = cons;
      } else warnings.push('delivered-to name: no original — open row on site first, then re-apply');
    }

    const curConsAddr = cached?.consignee_address ?? r.consignee_address ?? '';
    const consAddr = $('__swpConsAddr').value.trim();
    if (consAddr && consAddr !== curConsAddr) {
      if (curConsAddr) {
        SWAPS.CONSIGNEE_ADDR[curConsAddr] = consAddr;
        changes.push(`delivered-to addr ${curConsAddr} → ${consAddr}`);
        if (cached) cached.consignee_address = consAddr;
        r.consignee_address = consAddr;
      } else warnings.push('delivered-to address: no original — open row on site first, then re-apply');
    }

    /* time / distance */
    const curDist  = String(cached?.travel_distance ?? r.travel_distance ?? '');
    const curHrs   = String(cached?.travel_hours    ?? r.travel_hours    ?? '');
    const curStart = String(cached?.start_datetime  ?? r.start_datetime  ?? '');
    const curEnd   = String(cached?.end_datetime    ?? r.end_datetime    ?? '');

    const newDist  = $('__swpDist').value.trim();
    const newHrs   = $('__swpHrs').value.trim();
    const newStart = $('__swpStart').value.trim();
    const newEnd   = $('__swpEnd').value.trim();

    if (newDist && newDist !== curDist) {
      if (curDist) { SWAPS.TRAVEL_DIST[curDist] = newDist; changes.push(`distance ${curDist} → ${newDist}`); }
      else warnings.push('distance: no original');
      if (cached) cached.travel_distance = newDist;
      r.travel_distance = newDist;
    }
    if (newHrs && newHrs !== curHrs) {
      if (curHrs) { SWAPS.TRAVEL_HRS[curHrs] = newHrs; changes.push(`hours ${curHrs} → ${newHrs}`); }
      else warnings.push('hours: no original');
      if (cached) cached.travel_hours = newHrs;
      r.travel_hours = newHrs;
    }
    if (newStart && newStart !== curStart) {
      if (curStart) { SWAPS.START_DT[curStart] = newStart; changes.push(`start ${curStart} → ${newStart}`); }
      else warnings.push('start: no original');
      if (cached) cached.start_datetime = newStart;
      r.start_datetime = newStart;
    }
    if (newEnd && newEnd !== curEnd) {
      if (curEnd) { SWAPS.END_DT[curEnd] = newEnd; changes.push(`end ${curEnd} → ${newEnd}`); }
      else warnings.push('end: no original');
      if (cached) cached.end_datetime = newEnd;
      r.end_datetime = newEnd;
    }

    const msg = []
      .concat(changes.length ? ['✓ ' + changes.join(' · ')] : [])
      .concat(warnings.length ? ['⚠ ' + warnings.join(' · ')] : [])
      .join(' | ') || 'no changes';

    setStatus(msg, warnings.length ? 'err' : (changes.length ? 'ok' : ''));

    /* ── AUTO-PDF: fire 2 s after Apply if toggle ON and no warnings ── */
    if (autoPdfEnabled && !warnings.length) {
      const rowId = SWAPS.targetId;
      setStatus(msg + ' · PDF in 2 s…', 'ok');
      setTimeout(() => {
        const ok = clickRowPdfButton(rowId);
        if (ok) setStatus(msg + ' · PDF ✓', 'ok');
        else    setStatus(msg + ' · PDF failed — click manually', 'warn');
      }, 2000);
    }
  };

  $('__swpClear').onclick = () => {
    SWAPS.targetId = null;
    SWAPS.targetPassCode = null;
    teardownLiveForm();
    editState.rowRef = null;
    editState.cached = null;
    editState.originalDistance = '';
    editState.originalHours = '';
    editState.originalStart = '';
    editState.originalEnd = '';
    editState.lastComputedMinutes = null;
    setStatus('target cleared', '');
    showPage('list');
  };

  /* ═══════════════════════════════════════════════════════
     19. PAGE 3 — MIMAS LOGOUT → LOGIN
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
    if (!shownEl || !box) { mlog('CAPTCHA: fields not found'); return false; }
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
     20. KEYBOARD
     ═══════════════════════════════════════════════════════ */
  panel.addEventListener('keydown', e => {
    if (
      e.key === 'Enter' &&
      e.target.tagName === 'INPUT' &&
      !['__swpSearch', '__swpMPass', '__swpDist'].includes(e.target.id)
    ) {
      e.preventDefault();
      $('__swpApply').click();
    }
    if (e.key === 'Escape') $('__swpClear').click();
  });

  /* ═══════════════════════════════════════════════════════
     21. AUTH STATE
     ═══════════════════════════════════════════════════════ */
  auth.onAuthStateChanged(user => {
    isAuthed = !!user;
    if (user) {
      showMainUI();
    } else {
      const btn = $('__swpLGo');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
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
