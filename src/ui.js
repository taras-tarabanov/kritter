// ============================================================
//  UI: builds the sheet DOM, wires inputs, re-renders on state change.
//
//  Layout (top to bottom):
//   1. Header bar: Name / Career / Player / Level / XP / Morale
//   2. Three-column body:
//        Left:   Abilities, DR, HP, Coins
//        Center: Portrait + (optional) Spellbooks
//        Right:  Item Slots (capacity = 10 + CON)
//   3. Notes
//   4. Toolbar (Edit toggle, Export, Import, GM player picker)
//
//  Two modes:
//   - PLAY  (default): edit values, tick slots, adjust morale/HP
//   - EDIT  (gear icon): change careers, weapons, armor, basics,
//                        edit name/level/xp, add extra inventory rows
// ============================================================
import {
  ABILITIES, CAREERS, WEAPONS, BODY_ARMORS, SHIELDS, careerById
} from './data.js';
import { getState, setState, subscribe, replaceState, emptyCharacter } from './state.js';
import { slotCapacity, slotsUsed, damageReduction, shieldMaxHP, inventoryRows } from './compute.js';
import { obrAvailable, getParty, getRole, getCurrentPlayerId, getViewingPlayerId, isViewingOwn, viewPlayer } from './obr.js';

let editMode = false;
let toastTimer = null;

// ----- mount -----
export function mount(root) {
  root.innerHTML = `
    <div class="sheet">
      <div id="gm-tabs" class="gm-tabs" hidden></div>

      <div class="header">
        <div class="hcell wide">
          <label>NAME</label>
          <input id="f-name" type="text" />
        </div>
        <div class="hcell wide">
          <label>CAREERS</label>
          <div id="f-careers-display" class="readout"></div>
        </div>
        <div class="hcell">
          <label>LEVEL</label>
          <input id="f-level" type="number" min="1" />
        </div>
        <div class="hcell">
          <label>XP</label>
          <input id="f-xp" type="number" min="0" />
        </div>
        <div class="hcell morale-cell">
          <label>MORALE</label>
          <div class="morale-dial">
            <button class="morale-btn" data-d="-1" title="-1">−</button>
            <div id="f-morale" class="morale-value">0</div>
            <button class="morale-btn" data-d="1" title="+1">+</button>
          </div>
        </div>
      </div>

      <div class="body">
        <!-- LEFT COLUMN -->
        <div class="col left">
          <div class="panel">
            <div class="panel-title">ABILITY SCORES</div>
            <div id="abilities" class="abilities"></div>
          </div>

          <div class="panel">
            <div class="panel-title">DEFENSE</div>
            <div class="kv-row">
              <span>Damage Reduction</span>
              <span id="dr-readout" class="big">0</span>
            </div>
            <div class="kv-row">
              <span>Shield HP</span>
              <span class="shield-hp">
                <button id="shield-minus" class="mini">−</button>
                <span id="shield-hp-cur">0</span>
                <span class="dim">/ <span id="shield-hp-max">0</span></span>
                <button id="shield-plus" class="mini">+</button>
              </span>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">HIT POINTS</div>
            <div class="hp-row">
              <button id="hp-minus" class="mini">−</button>
              <input id="f-hp-cur" type="number" />
              <span class="dim">/</span>
              <input id="f-hp-max" type="number" />
              <button id="hp-plus" class="mini">+</button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">COINS</div>
            <input id="f-coins" type="number" class="coins-input" />
          </div>
        </div>

        <!-- CENTER COLUMN -->
        <div class="col center">
          <div class="panel">
            <div class="panel-title">PORTRAIT</div>
            <div id="portrait-box" class="portrait-box">
              <img id="portrait-img" alt="" hidden />
              <div id="portrait-empty" class="portrait-empty">Click EDIT to set portrait</div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">MOTIVATION</div>
            <input id="f-motivation" type="text" class="full" />
          </div>

          <div class="panel" id="spells-panel">
            <div class="panel-title">SPELLBOOKS</div>
            <div id="spells-list" class="spells-list"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="col right">
          <div class="panel slots-panel">
            <div class="panel-title">
              ITEM SLOTS
              <span class="dim" id="slots-readout">0 / 10</span>
            </div>
            <div id="slots-list" class="slots-list"></div>
          </div>
        </div>
      </div>

      <!-- EDIT-MODE PANELS (hidden in play mode) -->
      <div id="edit-panels" class="edit-panels" hidden>
        <div class="panel">
          <div class="panel-title">CAREERS (pick 2)</div>
          <div class="edit-row">
            <select id="career-select-1"></select>
            <select id="career-select-2"></select>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">UNIVERSAL BASICS</div>
          <div id="basics-list" class="checkbox-grid"></div>
        </div>

        <div class="panel">
          <div class="panel-title">ARMOR &amp; SHIELDS</div>
          <div id="armor-list"  class="checkbox-grid"></div>
          <div id="shield-list" class="checkbox-grid"></div>
        </div>

        <div class="panel">
          <div class="panel-title">WEAPONS</div>
          <div id="weapons-list" class="checkbox-grid"></div>
        </div>

        <div class="panel">
          <div class="panel-title">SPELLBOOKS</div>
          <div id="spells-edit"></div>
          <button id="add-spell" class="ghost">+ Add spellbook</button>
        </div>

        <div class="panel">
          <div class="panel-title">EXTRA ITEMS</div>
          <div id="extra-edit"></div>
          <button id="add-extra" class="ghost">+ Add item</button>
        </div>

        <div class="panel">
          <div class="panel-title">PORTRAIT URL</div>
          <input id="f-portrait" type="text" class="full" placeholder="https://… or data:image/…"/>
        </div>

        <div class="panel">
          <div class="panel-title">GENDER</div>
          <input id="f-gender" type="text" class="full" />
        </div>
      </div>

      <div class="panel notes-panel">
        <div class="panel-title">NOTES</div>
        <textarea id="f-notes" rows="6"></textarea>
      </div>

      <div class="toolbar">
        <button id="btn-edit" class="primary">✎ EDIT</button>
        <button id="btn-export">⬇ EXPORT</button>
        <button id="btn-import">⬆ IMPORT</button>
        <button id="btn-new" class="danger">✦ NEW CHARACTER</button>
        <input id="import-file" type="file" accept="application/json" hidden />
        <span class="dim" id="readonly-flag" hidden>READ-ONLY (viewing another player)</span>
      </div>

      <div id="toast" class="toast" hidden></div>
    </div>
  `;

  // initial wiring
  wireStaticHandlers();
  render();
  subscribe(render);
}

// ----- render -----
function render() {
  const s = getState();
  const ro = obrAvailable() && !isViewingOwn();

  // header
  $('#f-name').value      = s.name;
  $('#f-level').value     = s.level;
  $('#f-xp').value        = s.xp;
  $('#f-morale').textContent = formatMorale(s.morale);
  $('#f-morale').className = 'morale-value ' + moraleClass(s.morale);
  $('#f-careers-display').textContent =
      s.careers.map(id => careerById(id)?.name || '?').join(', ') || '(none — click EDIT)';

  // abilities
  renderAbilities(s, ro);

  // defense
  const dr = damageReduction(s);
  $('#dr-readout').textContent = dr;
  $('#shield-hp-cur').textContent = s.shieldHP;
  $('#shield-hp-max').textContent = shieldMaxHP(s);

  // hp + coins + portrait + motivation + gender + notes
  $('#f-hp-cur').value = s.hp.current;
  $('#f-hp-max').value = s.hp.max;
  $('#f-coins').value = s.coins;
  $('#f-motivation').value = s.motivation;
  $('#f-gender').value = s.gender;
  $('#f-notes').value = s.notes;
  $('#f-portrait').value = s.portrait || '';

  const img = $('#portrait-img'), empty = $('#portrait-empty');
  if (s.portrait) { img.src = s.portrait; img.hidden = false; empty.hidden = true; }
  else            { img.hidden = true;   empty.hidden = false; }

  // slots
  renderSlots(s);

  // spells (play mode display)
  renderSpellsPlay(s);

  // edit-only panels
  $('#edit-panels').hidden = !editMode;
  if (editMode) renderEditPanels(s);

  // toolbar / read-only badge
  $('#readonly-flag').hidden = !ro;
  toggleReadonly(ro);

  // GM tabs
  renderGmTabs();
}

function renderAbilities(s, ro) {
  const root = $('#abilities');
  root.innerHTML = ABILITIES.map(a => {
    const v = s.abilities[a.key];
    return `
      <div class="ab" title="${a.desc}">
        <button class="mini" data-ab="${a.key}" data-d="-1" ${ro?'disabled':''}>−</button>
        <div class="ab-mid">
          <div class="ab-label">${a.label}</div>
          <div class="ab-val">${v}</div>
        </div>
        <button class="mini" data-ab="${a.key}" data-d="1" ${ro?'disabled':''}>+</button>
      </div>`;
  }).join('');
  root.querySelectorAll('button[data-ab]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.ab, d = +btn.dataset.d;
      setState(st => {
        st.abilities[key] = Math.max(0, st.abilities[key] + d);
        return st;
      });
    };
  });
}

function renderSlots(s) {
  const cap   = slotCapacity(s);
  const used  = slotsUsed(s);
  const rows  = inventoryRows(s);

  $('#slots-readout').textContent =
    `${used} / ${cap}${used > cap ? '  ⚠ OVER' : ''}`;
  $('#slots-readout').classList.toggle('over', used > cap);

  // Render `cap` numbered slot rows. Fill them with rows in order;
  // overflow rows render below as "over capacity" red bars.
  let html = '';
  let cursor = 0;
  // expand rows so a 2-slot item occupies 2 slot lines
  const flat = [];
  for (const r of rows) {
    for (let i = 0; i < (r.slots || 1); i++) {
      flat.push({ ...r, isCont: i > 0 });
    }
  }

  for (let i = 0; i < Math.max(cap, flat.length); i++) {
    const r = flat[i];
    const over = i >= cap;
    const label = r
      ? `${r.name}${r.isCont ? ' (cont.)' : ''} <span class="dim">— ${r.source}</span>`
      : '<span class="dim">— empty —</span>';
    html += `
      <div class="slot-row ${over?'over':''}">
        <div class="slot-num">${i+1}</div>
        <div class="slot-name">${label}</div>
      </div>`;
  }
  $('#slots-list').innerHTML = html;
}

function renderSpellsPlay(s) {
  const panel = $('#spells-panel');
  panel.hidden = s.spells.length === 0;
  $('#spells-list').innerHTML = s.spells.length
    ? s.spells.map(name => `<div class="spell-row">📖 ${escapeHtml(name)}</div>`).join('')
    : '<div class="dim">No spellbooks.</div>';
}

function renderEditPanels(s) {
  // career selects
  ['career-select-1','career-select-2'].forEach((id, idx) => {
    const sel = $('#'+id);
    const cur = s.careers[idx] ?? '';
    sel.innerHTML = '<option value="">— none —</option>' +
      CAREERS.map(c => `<option value="${c.id}" ${c.id===cur?'selected':''}>${c.name}</option>`).join('');
    sel.onchange = () => {
      setState(st => {
        const arr = [...st.careers];
        const v = sel.value ? +sel.value : null;
        arr[idx] = v;
        st.careers = arr.filter(x => x != null);
        return st;
      });
    };
  });

  // basics
  $('#basics-list').innerHTML = Object.entries({
    rations:'2 Rations (2 sl)', rope:"50' Rope (1 sl)",
    torches:'2 Torches (2 sl)', quiver:'Quiver, 20 arrows (1 sl)'
  }).map(([k,label]) => checkbox(`basic-${k}`, label, s.basics[k])).join('');
  Object.keys(s.basics).forEach(k => {
    const el = document.getElementById(`basic-${k}`);
    if (el) el.onchange = () => setState(st => { st.basics[k] = el.checked; return st; });
  });

  // armor
  $('#armor-list').innerHTML = BODY_ARMORS.map(a =>
    checkbox(`armor-${a.id}`, `${a.name} (${a.slots} sl, +${a.dr} DR)`, s.armor[a.id])
  ).join('');
  BODY_ARMORS.forEach(a => {
    const el = document.getElementById(`armor-${a.id}`);
    if (el) el.onchange = () => setState(st => { st.armor[a.id] = el.checked; return st; });
  });

  // shields
  $('#shield-list').innerHTML = SHIELDS.map(sh =>
    checkbox(`shield-${sh.id}`, `${sh.name} (${sh.slots} sl, ${sh.shieldHP} HP)`, s.shield[sh.id])
  ).join('');
  SHIELDS.forEach(sh => {
    const el = document.getElementById(`shield-${sh.id}`);
    if (el) el.onchange = () => setState(st => {
      st.shield[sh.id] = el.checked;
      // top up shield HP to max if newly equipped
      const max = (sh.id === 'large' && st.shield.large) ? 3
                : (sh.id === 'small' && st.shield.small) ? Math.max(st.shieldHP, 1)
                : st.shieldHP;
      st.shieldHP = Math.min(max, shieldMaxHP({ ...st }));
      return st;
    });
  });

  // weapons
  $('#weapons-list').innerHTML = WEAPONS.map(w =>
    checkbox(`weapon-${w.id}`, `${w.name} (${w.dmg}, ${w.slots} sl)`, !!s.weapons[w.id])
  ).join('');
  WEAPONS.forEach(w => {
    const el = document.getElementById(`weapon-${w.id}`);
    if (el) el.onchange = () => setState(st => {
      if (el.checked) st.weapons[w.id] = true;
      else delete st.weapons[w.id];
      return st;
    });
  });

  // spells (editable)
  $('#spells-edit').innerHTML = s.spells.map((name, i) => `
    <div class="row-edit">
      <input data-spell-idx="${i}" value="${escapeAttr(name)}" />
      <button data-spell-del="${i}" class="mini danger">×</button>
    </div>`).join('');
  $('#spells-edit').querySelectorAll('input[data-spell-idx]').forEach(inp => {
    inp.oninput = () => setState(st => {
      st.spells[+inp.dataset.spellIdx] = inp.value;
      return st;
    });
  });
  $('#spells-edit').querySelectorAll('button[data-spell-del]').forEach(btn => {
    btn.onclick = () => setState(st => {
      st.spells.splice(+btn.dataset.spellDel, 1);
      return st;
    });
  });

  // extra items
  $('#extra-edit').innerHTML = s.extraItems.map(row => `
    <div class="row-edit">
      <input data-extra-name="${row.id}" value="${escapeAttr(row.name)}" placeholder="item name"/>
      <input data-extra-slots="${row.id}" type="number" min="0" value="${row.slots}" class="num"/>
      <button data-extra-del="${row.id}" class="mini danger">×</button>
    </div>`).join('');
  $('#extra-edit').querySelectorAll('input[data-extra-name]').forEach(inp => {
    inp.oninput = () => setState(st => {
      const r = st.extraItems.find(x => x.id === inp.dataset.extraName);
      if (r) r.name = inp.value;
      return st;
    });
  });
  $('#extra-edit').querySelectorAll('input[data-extra-slots]').forEach(inp => {
    inp.oninput = () => setState(st => {
      const r = st.extraItems.find(x => x.id === inp.dataset.extraSlots);
      if (r) r.slots = Number(inp.value) || 0;
      return st;
    });
  });
  $('#extra-edit').querySelectorAll('button[data-extra-del]').forEach(btn => {
    btn.onclick = () => setState(st => {
      st.extraItems = st.extraItems.filter(x => x.id !== btn.dataset.extraDel);
      return st;
    });
  });
}

function renderGmTabs() {
  const tabs = $('#gm-tabs');
  if (!obrAvailable() || getRole() !== 'GM') { tabs.hidden = true; return; }
  const party = getParty();
  if (party.length <= 1) { tabs.hidden = true; return; }
  tabs.hidden = false;
  const viewing = getViewingPlayerId();
  tabs.innerHTML = party.map(p => `
    <button class="gm-tab ${p.id===viewing?'active':''}" data-pid="${p.id}">
      ${escapeHtml(p.name)}${p.id===getCurrentPlayerId()?' (you)':''}
    </button>
  `).join('');
  tabs.querySelectorAll('button[data-pid]').forEach(b => {
    b.onclick = () => viewPlayer(b.dataset.pid);
  });
}

// ----- static handlers (wired once at mount) -----
function wireStaticHandlers() {
  // header inputs
  bindText('#f-name',       (v, st) => st.name = v);
  bindNum ('#f-level',      (v, st) => st.level = v);
  bindNum ('#f-xp',         (v, st) => st.xp = v);
  bindText('#f-motivation', (v, st) => st.motivation = v);
  bindText('#f-gender',     (v, st) => st.gender = v);
  bindText('#f-portrait',   (v, st) => st.portrait = v);
  bindText('#f-notes',      (v, st) => st.notes = v);
  bindNum ('#f-coins',      (v, st) => st.coins = v);
  bindNum ('#f-hp-cur',     (v, st) => st.hp.current = v);
  bindNum ('#f-hp-max',     (v, st) => st.hp.max = v);

  // morale dial
  document.querySelectorAll('.morale-btn').forEach(b => {
    b.onclick = () => setState(st => {
      st.morale = clamp(st.morale + (+b.dataset.d), -3, 3);
      return st;
    });
  });

  // HP +/- shortcuts
  $('#hp-minus').onclick = () => setState(st => { st.hp.current = Math.max(0, st.hp.current - 1); return st; });
  $('#hp-plus').onclick  = () => setState(st => { st.hp.current = Math.min(st.hp.max, st.hp.current + 1); return st; });

  // Shield HP +/-
  $('#shield-minus').onclick = () => setState(st => { st.shieldHP = Math.max(0, st.shieldHP - 1); return st; });
  $('#shield-plus').onclick  = () => setState(st => {
    st.shieldHP = Math.min(shieldMaxHP(st), st.shieldHP + 1);
    return st;
  });

  // Edit toggle
  $('#btn-edit').onclick = () => { editMode = !editMode; render(); };

  // Export / Import / New
  $('#btn-export').onclick = exportJson;
  $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').onchange = importJson;
  $('#btn-new').onclick = () => {
    if (confirm('Replace this character with a blank one? Use EXPORT first if you want a backup.')) {
      replaceState(emptyCharacter());
    }
  };

  // Edit-mode "add" buttons
  $('#add-spell').onclick = () => setState(st => { st.spells.push('New Spellbook'); return st; });
  $('#add-extra').onclick = () => setState(st => {
    st.extraItems.push({ id: crypto.randomUUID(), name: '', slots: 1 });
    return st;
  });
}

function toggleReadonly(ro) {
  document.querySelectorAll('input, textarea, select, button').forEach(el => {
    if (el.id === 'btn-export' || el.classList.contains('gm-tab')) return; // always allowed
    if (ro) el.setAttribute('disabled', 'true');
    else    el.removeAttribute('disabled');
  });
}

// ----- export / import -----
function exportJson() {
  const s = getState();
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const safeName = (s.name || 'knave').replace(/[^a-z0-9_\- ]/gi,'').replace(/\s+/g,'_');
  a.href = URL.createObjectURL(blob);
  a.download = `${safeName}.knave.json`;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Exported');
}

function importJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      replaceState(obj);
      toast('Imported');
    } catch (err) {
      alert('Could not parse JSON: ' + err.message);
    }
  };
  r.readAsText(file);
  e.target.value = '';
}

// ----- tiny helpers -----
const $ = sel => document.querySelector(sel);

function bindText(sel, fn) {
  const el = $(sel);
  el.oninput = () => setState(st => { fn(el.value, st); return st; });
}
function bindNum(sel, fn) {
  const el = $(sel);
  el.oninput = () => setState(st => { fn(Number(el.value) || 0, st); return st; });
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function formatMorale(n) { return n > 0 ? `+${n}` : `${n}`; }
function moraleClass(n)  { return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero'; }
function checkbox(id, label, checked) {
  return `<label class="cb"><input type="checkbox" id="${id}" ${checked?'checked':''}/> ${label}</label>`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1600);
}
