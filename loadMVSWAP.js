(() => {
  /* ── 1. COMPONENT / SERVICE ─────────────────────────── */
  let comp = window.__tableComp;
  if (!comp || !comp.regionService) {
    const t = document.querySelector('mat-table');
    if (!t) return console.warn('open dispatch slip list first');
    comp = ng.getOwningComponent(t);
    window.__tableComp = comp;
  }
  const region = comp.regionService;
  const ds     = region.dataService;

  /* ── 2. MUTABLE SWAP MAPS (panel edits these) ───────── */
  const SWAPS = {
    VEHICLE:    { 'TN60BV5920': 'TN00AA0001', 'TN00AA0001': 'TN60BV5920' },
    MINERAL:    { 'Rough Stone': 'Gravel', 'Gravel': 'Rough Stone' },
    MINERAL_ID: { 3132: 3133, 3133: 3132 },
    targetId:   null   // ← set when a row is picked
  };
  window.__SWAPS = SWAPS;

  const applySwap = (r, label) => {
    let hit = false;
    if (r.mineral_name   in SWAPS.MINERAL)    { r.mineral_name   = SWAPS.MINERAL[r.mineral_name];    hit = true; }
    if (r.mineral_name2  in SWAPS.MINERAL)    { r.mineral_name2  = SWAPS.MINERAL[r.mineral_name2];   hit = true; }
    if (r.mineral_id     in SWAPS.MINERAL_ID) { r.mineral_id     = SWAPS.MINERAL_ID[r.mineral_id];   hit = true; }
    if (r.vehicle_number in SWAPS.VEHICLE)    { r.vehicle_number = SWAPS.VEHICLE[r.vehicle_number]; hit = true; }
    if (typeof r.jsondata === 'string' && r.jsondata) {
      try {
        const j = JSON.parse(r.jsondata);
        let jHit = false;
        (j?.form_value?.quantity_details || []).forEach(q => {
          if (q.mineral_name in SWAPS.MINERAL)    { q.mineral_name = SWAPS.MINERAL[q.mineral_name]; jHit = true; }
          if (q.mineral_id   in SWAPS.MINERAL_ID) { q.mineral_id   = SWAPS.MINERAL_ID[q.mineral_id]; jHit = true; }
        });
        if (jHit) { r.jsondata = JSON.stringify(j); hit = true; }
      } catch {}
    }
    if (hit && label) console.log(`  swapped[${label}]`, { mineral: r.mineral_name, vehicle: r.vehicle_number });
    return hit;
  };

  /* ── 3. POST WRAPPER (only the selected id) ─────────── */
  if (!ds.__origPost) ds.__origPost = ds.post.bind(ds);
  const origPost = ds.__origPost;

  ds.post = function (url, body, ...rest) {
    const obs = origPost(url, body, ...rest);
    if (!/\/api\/edit\/dispatch/.test(url)) return obs;
    if (SWAPS.targetId && body?.dispatch_id !== SWAPS.targetId) return obs;  // only chosen row

    return new (obs.constructor)(subscriber => obs.subscribe({
      next: res => {
        const row = res?.Data?.[0];
        if (row && applySwap(row, 'pdf')) {
          console.log('%c📥 PDF row rewritten', 'color:#22c55e', {
            mineral_id: row.mineral_id, mineral: row.mineral_name, vehicle: row.vehicle_number
          });
        }
        subscriber.next(res);
      },
      error: e => subscriber.error(e),
      complete: () => subscriber.complete()
    }));
  };

  /* ── 4. MINI PANEL (UPGRADED UI) ────────────────────── */
  const old = document.getElementById('__swapPanel');
  if (old) old.remove();

  // Inject custom CSS once
  if (!document.getElementById('__swapStyles')) {
    const style = document.createElement('style');
    style.id = '__swapStyles';
    style.textContent = `
      #__swapPanel {
        position: fixed; right: 16px; bottom: 16px; z-index: 999999;
        width: 360px; max-height: 78vh; overflow: hidden;
        background: linear-gradient(145deg, #0b1120, #0f172a);
        color: #e2e8f0; font: 13px/1.5 'Segoe UI', system-ui, sans-serif;
        border: 1px solid #1e293b; border-radius: 14px;
        box-shadow: 0 20px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(34,197,94,.15);
        display: flex; flex-direction: column;
        transition: box-shadow .2s;
        user-select: none;
      }
      #__swapPanel:hover { box-shadow: 0 20px 50px rgba(0,0,0,.7), 0 0 0 1px rgba(34,197,94,.3); }
      #__swapPanel .swp-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 14px 8px; border-bottom: 1px solid #1e293b;
        cursor: grab;
      }
      #__swapPanel .swp-header:active { cursor: grabbing; }
      #__swapPanel .swp-title {
        font-weight: 700; font-size: 14px; letter-spacing: .3px;
        background: linear-gradient(90deg, #22c55e, #4ade80);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        display: flex; align-items: center; gap: 6px;
      }
      #__swapPanel .swp-title::before {
        content: ''; width: 8px; height: 8px; border-radius: 50%;
        background: #22c55e; box-shadow: 0 0 8px #22c55e;
        animation: swpPulse 2s infinite;
      }
      @keyframes swpPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: .5; transform: scale(.85); }
      }
      #__swapPanel .swp-close {
        background: none; border: 0; color: #64748b; font-size: 20px;
        line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px;
        transition: all .15s;
      }
      #__swapPanel .swp-close:hover { color: #f87171; background: #1e293b; }
      #__swapPanel .swp-body { padding: 10px 14px 14px; overflow-y: auto; flex: 1; }
      #__swapPanel .swp-body::-webkit-scrollbar { width: 6px; }
      #__swapPanel .swp-body::-webkit-scrollbar-track { background: transparent; }
      #__swapPanel .swp-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      #__swapPanel .swp-body::-webkit-scrollbar-thumb:hover { background: #475569; }

      #__swapPanel .swp-toolbar { display: flex; gap: 8px; margin-bottom: 10px; }
      #__swapPanel .swp-btn {
        background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
        border-radius: 8px; padding: 6px 12px; cursor: pointer;
        font-size: 12px; font-weight: 600; transition: all .15s;
        display: inline-flex; align-items: center; gap: 5px;
        white-space: nowrap;
      }
      #__swapPanel .swp-btn:hover { background: #273449; border-color: #475569; }
      #__swapPanel .swp-btn:active { transform: scale(.97); }
      #__swapPanel .swp-btn.swp-primary {
        background: linear-gradient(135deg, #166534, #15803d);
        border-color: #22c55e; color: #fff;
      }
      #__swapPanel .swp-btn.swp-primary:hover {
        background: linear-gradient(135deg, #15803d, #16a34a);
        box-shadow: 0 0 12px rgba(34,197,94,.4);
      }
      #__swapPanel .swp-btn.swp-danger {
        background: #450a0a; border-color: #991b1b; color: #fca5a5;
      }
      #__swapPanel .swp-btn.swp-danger:hover { background: #7f1d1d; }
      #__swapPanel .swp-input {
        flex: 1; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 8px;
        padding: 6px 10px; font-size: 12px; outline: none;
        transition: border-color .15s, box-shadow .15s;
      }
      #__swapPanel .swp-input:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-input::placeholder { color: #475569; }

      #__swapPanel .swp-list {
        max-height: 200px; overflow-y: auto;
        border: 1px solid #1e293b; border-radius: 8px;
        margin-bottom: 10px; background: #0a0f1a;
      }
      #__swapPanel .swp-list::-webkit-scrollbar { width: 5px; }
      #__swapPanel .swp-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      #__swapPanel .swp-row {
        padding: 8px 10px; border-bottom: 1px solid #1e293b;
        cursor: pointer; transition: background .12s;
        display: flex; flex-direction: column; gap: 2px;
      }
      #__swapPanel .swp-row:last-child { border-bottom: 0; }
      #__swapPanel .swp-row:hover { background: #1e293b; }
      #__swapPanel .swp-row.swp-selected {
        background: #14532d; border-left: 3px solid #22c55e;
        padding-left: 7px;
      }
      #__swapPanel .swp-row-id { color: #e2e8f0; font-weight: 600; font-size: 12px; }
      #__swapPanel .swp-row-sub { color: #64748b; font-size: 11px; }
      #__swapPanel .swp-empty {
        padding: 16px; color: #475569; text-align: center; font-size: 12px;
      }

      #__swapPanel .swp-edit { display: none; }
      #__swapPanel .swp-edit.swp-active { display: block; }
      #__swapPanel .swp-sel-label {
        margin-bottom: 8px; color: #94a3b8; font-size: 11px;
        display: flex; align-items: center; gap: 6px;
      }
      #__swapPanel .swp-sel-label span {
        color: #22c55e; font-weight: 700; font-size: 12px;
        background: #14532d; padding: 2px 8px; border-radius: 4px;
      }
      #__swapPanel .swp-field { margin-bottom: 8px; }
      #__swapPanel .swp-field label {
        display: block; color: #94a3b8; font-size: 11px;
        margin-bottom: 3px; font-weight: 600; letter-spacing: .2px;
      }
      #__swapPanel .swp-field input {
        width: 100%; background: #1e293b; color: #e2e8f0;
        border: 1px solid #334155; border-radius: 8px;
        padding: 7px 10px; font-size: 12px; outline: none;
        transition: border-color .15s, box-shadow .15s;
      }
      #__swapPanel .swp-field input:focus {
        border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2);
      }
      #__swapPanel .swp-status {
        margin-top: 8px; color: #64748b; font-size: 11px;
        min-height: 16px; word-break: break-word;
      }
      #__swapPanel .swp-status.swp-ok { color: #22c55e; }
      #__swapPanel .swp-status.swp-err { color: #f87171; }
      #__swapPanel .swp-actions { display: flex; gap: 8px; }
      #__swapPanel .swp-actions .swp-btn { flex: 1; justify-content: center; }
    `;
    document.head.appendChild(style);
  }

  const panel = document.createElement('div');
  panel.id = '__swapPanel';
  panel.innerHTML = `
    <div class="swp-header">
      <div class="swp-title">Dispatch Swap Panel</div>
      <button class="swp-close" id="__swpClose">×</button>
    </div>
    <div class="swp-body">
      <div class="swp-toolbar">
        <button class="swp-btn" id="__swpLoad">⟳ Load list</button>
        <input class="swp-input" id="__swpSearch" placeholder="Filter id / vehicle / mineral" />
      </div>
      <div class="swp-list" id="__swpList">
        <div class="swp-empty">Click "Load list" to fetch rows</div>
      </div>
      <div class="swp-edit" id="__swpEdit">
        <div class="swp-sel-label">Selected: <span id="__swpSel"></span></div>
        <div class="swp-field">
          <label>Vehicle number</label>
          <input id="__swpVeh" placeholder="e.g. TN00AA0001" />
        </div>
        <div class="swp-field">
          <label>Mineral name</label>
          <input id="__swpMin" placeholder="e.g. Gravel" />
        </div>
        <div class="swp-field">
          <label>Mineral id</label>
          <input id="__swpMid" placeholder="e.g. 3133" type="number" />
        </div>
        <div class="swp-actions">
          <button class="swp-btn swp-primary" id="__swpApply">✓ Apply to selected</button>
          <button class="swp-btn swp-danger" id="__swpClear">✕ Clear target</button>
        </div>
        <div class="swp-status" id="__swpStatus"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const $ = id => panel.querySelector('#' + id);

  /* ── Drag support ────────────────────────────────────── */
  (function makeDraggable() {
    const header = panel.querySelector('.swp-header');
    let isDragging = false, startX, startY, startLeft, startTop;
    header.addEventListener('mousedown', e => {
      if (e.target.classList.contains('swp-close')) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      panel.style.left = startLeft + 'px'; panel.style.top = startTop + 'px';
      panel.style.transition = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      panel.style.left = (startLeft + dx) + 'px';
      panel.style.top = (startTop + dy) + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = '';
    });
  })();

  $('__swpClose').onclick = () => panel.remove();

  let listRows = [];

  const renderList = (filter = '') => {
    const f = filter.toLowerCase();
    const shown = listRows.filter(r =>
      !f ||
      String(r.dispatch_id || '').toLowerCase().includes(f) ||
      String(r.vehicle_number || '').toLowerCase().includes(f) ||
      String(r.mineral_name || '').toLowerCase().includes(f)
    );
    const listEl = $('__swpList');
    if (!shown.length) {
      listEl.innerHTML = '<div class="swp-empty">no rows match</div>';
      return;
    }
    listEl.innerHTML = shown.map(r => {
      const sel = r.id === SWAPS.targetId ? ' swp-selected' : '';
      return `<div class="swp-row${sel}" data-id="${r.id}">
        <div class="swp-row-id">${r.dispatch_id}</div>
        <div class="swp-row-sub">${r.mineral_name} · ${r.vehicle_number}</div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('[data-id]').forEach(el => {
      el.onclick = () => selectRow(+el.dataset.id);
    });
  };

  const selectRow = (id) => {
    const r = listRows.find(x => x.id === id);
    if (!r) return;
    SWAPS.targetId = id;
    $('__swpEdit').classList.add('swp-active');
    $('__swpSel').textContent = `${r.dispatch_id} (id ${r.id})`;
    $('__swpVeh').value = r.vehicle_number || '';
    $('__swpMin').value = r.mineral_name || '';
    $('__swpMid').value = r.mineral_id || '';
    setStatus('', '');
    renderList($('__swpSearch').value); // refresh highlight
  };

  const setStatus = (msg, kind = '') => {
    const el = $('__swpStatus');
    el.textContent = msg;
    el.className = 'swp-status' + (kind ? ' swp-' + kind : '');
  };

  $('__swpSearch').oninput = e => renderList(e.target.value);

  $('__swpLoad').onclick = async () => {
    setStatus('loading…', '');
    try {
      const res = await region.getCreateDispatchList().toPromise();
      listRows = res?.Data || res?.data || [];
      renderList($('__swpSearch').value);
      setStatus(`loaded ${listRows.length} rows`, 'ok');
    } catch (e) {
      setStatus('load failed: ' + e.message, 'err');
    }
  };

  $('__swpApply').onclick = () => {
    const id = SWAPS.targetId;
    const r  = listRows.find(x => x.id === id);
    if (!r) { setStatus('select a row first', 'err'); return; }
    const veh = $('__swpVeh').value.trim();
    const min = $('__swpMin').value.trim();
    const mid = parseInt($('__swpMid').value, 10);

    if (veh && veh !== r.vehicle_number) {
      SWAPS.VEHICLE[r.vehicle_number] = veh;   // from → to
    }
    if (min && min !== r.mineral_name) {
      SWAPS.MINERAL[r.mineral_name] = min;
    }
    if (!isNaN(mid) && mid !== r.mineral_id) {
      SWAPS.MINERAL_ID[r.mineral_id] = mid;
    }
    setStatus(
      `target ${r.dispatch_id}: vehicle ${veh || '(same)'}, mineral ${min || '(same)'}, id ${mid || '(same)'}`,
      'ok'
    );
    console.log('%c panel updated maps', 'color:#22c55e', SWAPS);
  };

  $('__swpClear').onclick = () => {
    SWAPS.targetId = null;
    $('__swpEdit').classList.remove('swp-active');
    setStatus('target cleared', '');
    renderList($('__swpSearch').value);
  };

  /* ── Keyboard shortcuts ──────────────────────────────── */
  panel.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id !== '__swpSearch') {
      e.preventDefault();
      $('__swpApply').click();
    }
    if (e.key === 'Escape') {
      $('__swpClear').click();
    }
  });

  console.log('%c✅ Swap panel ready (bottom-right) — drag header to move', 'color:#22c55e;font-weight:bold');
})();
