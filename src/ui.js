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
  ABILITIES, CAREERS, WEAPONS, BODY_ARMORS, SHIELDS, careerById, COIN_TYPES
} from './data.js';
import { getState, setState, subscribe, replaceState, emptyCharacter } from './state.js';
import { slotCapacity, slotsUsed, damageReduction, shieldMaxHP, inventoryRows, getOccupiedGrid } from './compute.js';
import { obrAvailable, getParty, getRole, getCurrentPlayerId, getViewingPlayerId, isViewingOwn, viewPlayer } from './obr.js';

let editMode = false;
let toastTimer = null;
let editingItemId = null; // Track item being edited in modal (null = adding new)

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
            <div class="panel-title">HIT POINTS</div>
            <div class="hp-row" style="margin-top: 6px;">
              <button id="hp-minus" class="mini">−</button>
              <input id="f-hp-cur" type="number" />
              <span class="dim">/</span>
              <input id="f-hp-max" type="number" />
              <button id="hp-plus" class="mini">+</button>
            </div>
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
        </div>

        <!-- CENTER COLUMN (CENTERPIECE) -->
        <div class="col center">
          <div class="panel slots-panel" style="flex: 1; display: flex; flex-direction: column;">
            <div class="dr-header">
              <div class="dr-title">INVENTORY & ARMOR</div>
              <div class="dr-meter">
                <div class="slot-tally" id="slots-readout">Slots: <b class="count-display">0</b> / 10</div>
                <div class="dr-total">DR: <span class="dr-value" id="dr-value-display">0</span><span class="dr-max">/3</span></div>
              </div>
            </div>
            <div id="slots-list" class="slots-list" style="flex: 1; overflow-y: auto;"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="col right">
          <div class="panel">
            <div class="panel-title">COINS</div>
            <div class="coins-grid">
              ${COIN_TYPES.map(c => `
                <div class="coin-cell">
                  <label style="color: ${c.color}">${c.label.split(' ')[0].toUpperCase()}</label>
                  <input id="f-coins-${c.key}" type="number" min="0" class="coin-input" />
                </div>
              `).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">PORTRAIT</div>
            <div id="portrait-box" class="portrait-box">
              <img id="portrait-img" alt="" hidden />
              <div id="portrait-empty" class="portrait-empty">Click EDIT to set portrait</div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">MOTIVATION</div>
            <input id="f-motivation" type="text" class="full" style="margin-top: 4px;" />
          </div>

          <div class="panel" id="spells-panel">
            <div class="panel-title">SPELLBOOKS</div>
            <div id="spells-list" class="spells-list"></div>
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

        <div class="panel" style="grid-column: 1 / -1;">
          <div class="panel-title">INVENTORY ITEMS</div>
          <div id="inventory-edit-list" class="inventory-edit-list"></div>
          <button id="add-item-btn" class="ghost" style="margin-top: 8px;">+ Add Item</button>
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

      <!-- ITEM MODAL -->
      <div id="item-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <span id="modal-title" class="modal-title">Add Item</span>
            <button id="modal-close-btn" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="m-item-name">NAME</label>
              <input id="m-item-name" type="text" placeholder="e.g. Torch, Sword, Rope, etc." />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="m-item-kind">KIND</label>
                <select id="m-item-kind">
                  <option value="general">Gear / General</option>
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                  <option value="shield">Shield</option>
                  <option value="spellbook">Spellbook</option>
                </select>
              </div>
              <div class="form-group">
                <label for="m-item-slots">SLOTS</label>
                <input id="m-item-slots" type="number" min="0" value="1" />
              </div>
            </div>

            <!-- Dynamic kind-specific fields -->
            <div id="m-weapon-fields" class="form-group" hidden>
              <label for="m-weapon-dmg">DAMAGE</label>
              <input id="m-weapon-dmg" type="text" placeholder="e.g. d6, d8" value="d6" />
            </div>

            <div id="m-armor-fields" class="form-row" hidden>
              <div class="form-group">
                <label for="m-armor-dr">DAMAGE REDUCTION (DR)</label>
                <input id="m-armor-dr" type="number" min="0" value="1" />
              </div>
              <div class="form-group">
                <label for="m-armor-category">ARMOR CATEGORY</label>
                <select id="m-armor-category">
                  <option value="head">Head</option>
                  <option value="torso" selected>Torso</option>
                  <option value="limbs">Limbs</option>
                </select>
              </div>
            </div>

            <div id="m-shield-fields" class="form-group" hidden>
              <label for="m-shield-max-hp">SHIELD MAX HP</label>
              <input id="m-shield-max-hp" type="number" min="1" value="3" />
            </div>

            <!-- Quantity fields -->
            <div class="checkbox-group">
              <input id="m-has-quantity" type="checkbox" />
              <label for="m-has-quantity">Track Quantity (e.g. Rope, Quiver)</label>
            </div>

            <div id="m-quantity-fields" class="form-row" hidden>
              <div class="form-group">
                <label for="m-item-max-qty">MAX QUANTITY</label>
                <input id="m-item-max-qty" type="number" min="1" value="20" />
              </div>
              <div class="form-group">
                <label for="m-item-unit">UNIT</label>
                <input id="m-item-unit" type="text" placeholder="e.g. ft, arrows, uses" value="uses" />
              </div>
            </div>

            <!-- Amount to Add (Copies) -->
            <div id="m-amount-to-add-container" class="form-group">
              <label for="m-amount-to-add">AMOUNT TO ADD (COPIES)</label>
              <input id="m-amount-to-add" type="number" min="1" value="1" />
            </div>
          </div>
          <div class="modal-footer">
            <button id="modal-cancel-btn" class="btn-cancel">Cancel</button>
            <button id="modal-save-btn" class="btn-save">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // initial wiring
  wireStaticHandlers();
  render();
  subscribe(render);
}

// ----- render -----
export function render() {
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

  const maxShield = shieldMaxHP(s);
  const shieldHpSpan = $('.shield-hp');
  if (maxShield === 0) {
    shieldHpSpan.innerHTML = `<span class="dim">No Shield</span>`;
  } else {
    shieldHpSpan.innerHTML = `
      <button id="shield-minus" class="mini" ${ro?'disabled':''}>−</button>
      <span id="shield-hp-cur">${s.shieldHP}</span>
      <span class="dim">/ <span id="shield-hp-max">${maxShield}</span></span>
      <button id="shield-plus" class="mini" ${ro?'disabled':''}>+</button>
    `;
    $('#shield-minus').onclick = () => setState(st => { st.shieldHP = Math.max(0, st.shieldHP - 1); return st; });
    $('#shield-plus').onclick  = () => setState(st => { st.shieldHP = Math.min(shieldMaxHP(st), st.shieldHP + 1); return st; });
  }

  // hp + coins + portrait + motivation + gender + notes
  $('#f-hp-cur').value = s.hp.current;
  $('#f-hp-max').value = s.hp.max;
  
  COIN_TYPES.forEach(c => {
    const el = $(`#f-coins-${c.key}`);
    if (el) el.value = (s.coins && s.coins[c.key]) || 0;
  });

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

  // toolbar / read-only badge & slots add item button visibility
  $('#readonly-flag').hidden = !ro;
  const addItemBtnSlots = $('#add-item-btn-slots');
  if (addItemBtnSlots) addItemBtnSlots.hidden = ro;
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
  const cap = slotCapacity(s);
  const used = slotsUsed(s);
  const grid = getOccupiedGrid(s);
  const ro = obrAvailable() && !isViewingOwn();

  // Compute total armor DR (sum of item.dr * item.slots for all armor items, rounded down)
  let totalDr = 0;
  if (Array.isArray(s.items)) {
    s.items.forEach(x => {
      if (x.kind === 'armor') {
        const itemSlots = Number(x.slots) || 1;
        const drVal = Number(x.dr) !== undefined && !isNaN(Number(x.dr)) ? Number(x.dr) : 0.5;
        totalDr += drVal * itemSlots;
      }
    });
  }
  const dr = Math.floor(totalDr);

  // Update header tally displays
  const readoutEl = $('#slots-readout');
  if (readoutEl) {
    readoutEl.innerHTML = `Slots: <b class="count-display">${used}</b> / ${cap}`;
    readoutEl.classList.toggle('over', used > cap);
  }

  const drDisplayEl = $('#dr-value-display');
  if (drDisplayEl) {
    drDisplayEl.textContent = dr;
    if (dr >= 3) {
      drDisplayEl.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
    } else {
      drDisplayEl.style.textShadow = 'none';
    }
  }

  const drReadout = $('#dr-readout');
  if (drReadout) {
    drReadout.textContent = dr;
  }

  // Render a specific slot cell helper
  function renderSlotHtml(zone, index) {
    const entry = grid.find(g => g.zone === zone && g.index === index);
    if (!entry) return '';

    const labelAttr = `data-zone="${zone}" data-index="${index}"`;

    if (!entry.item) {
      // Empty slot
      return `
        <div class="slot slot-empty" ${labelAttr} data-state="empty">
          <div class="slot-empty-label">${!ro ? '+ Add Item' : 'Empty'}</div>
        </div>
      `;
    }

    const isArmor = entry.item.kind === 'armor';

    // Custom item slot
    if (!entry.parentSlot) {
      // Secondary/overflow slot of a multi-slot item
      const stateVal = isArmor ? 'armor' : 'item-overflow';
      return `
        <div class="slot ${isArmor ? 'slot-armor-overflow' : 'slot-item-overflow'}" ${labelAttr} data-state="${stateVal}">
          <span class="dim">${escapeHtml(entry.item.name)} (cont.)</span>
        </div>
      `;
    }

    // Primary item slot
    let qtyStr = '';
    let qtyButtons = '';
    let slotActions = '';
    
    if (entry.item.maxQuantity !== undefined && entry.item.maxQuantity !== null) {
      qtyStr = `${entry.item.quantity}/${entry.item.maxQuantity}${entry.item.unit ? ' ' + entry.item.unit : ''}`;
      if (!ro) {
        qtyButtons = `
          <span class="qty-adjust" data-id="${entry.item.id}">
            <button class="mini qty-minus" title="Reduce quantity">−</button>
            <button class="mini qty-plus" title="Increase quantity">+</button>
          </span>
        `;
      }
    }
    
    if (!ro) {
      slotActions = `
        <span class="slot-actions" data-id="${entry.item.id}">
          <button class="mini slot-edit-btn" title="Edit">✎</button>
          <button class="mini slot-dup-btn" title="Duplicate">❐</button>
          <button class="mini danger slot-del-btn" title="Delete">&times;</button>
        </span>
      `;
    }

    // Construct slot details
    let details = '';
    if (entry.item.kind === 'weapon' && entry.item.dmg) {
      details += ` (${entry.item.dmg})`;
    } else if (entry.item.kind === 'shield' && entry.item.shieldMaxHP) {
      details += ` (Shield HP ${entry.item.shieldMaxHP})`;
    } else if (isArmor) {
      const itemSlots = Number(entry.item.slots) || 1;
      const drVal = Number(entry.item.dr) !== undefined && !isNaN(Number(entry.item.dr)) ? Number(entry.item.dr) : 0.5;
      details += ` (DR +${drVal * itemSlots})`;
    }

    const stateVal = isArmor ? 'armor' : 'item';

    return `
      <div class="slot slot-item" ${labelAttr} data-state="${stateVal}" draggable="${!ro ? 'true' : 'false'}" data-id="${entry.item.id}">
        <span class="slot-item-name-grid" title="${escapeAttr(entry.item.name + details)}">${escapeHtml(entry.item.name)}${escapeHtml(details)}</span>
        ${qtyStr ? `<div class="slot-qty-badge">${qtyStr}</div>` : ''}
        ${!ro ? `
          <div class="slot-overlay-controls">
            ${qtyButtons}
            ${slotActions}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Render extra slots
  const extraCount = Math.max(0, cap - 10);
  let extraHtml = '';
  if (extraCount > 0) {
    let cellsHtml = '';
    for (let i = 0; i < extraCount; i++) {
      cellsHtml += renderSlotHtml('extra', i);
    }
    extraHtml = `
      <div class="extra-zones" id="extra-slots-container">
        <div class="zone-label" style="margin-top: 16px; border-top: 1px dotted var(--rule-dk); padding-top: 10px;">Pockets / Pack</div>
        <div class="extra-grid">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  // Assemble full HTML
  const html = `
    <div class="abstract-armor-system" id="armor-tracker" style="background: none; border: none; padding: 0; max-width: 100%;">
      <div class="anatomy-grid">
        <!-- Head -->
        <div class="zone head-zone">
          <div class="zone-label">Head</div>
          ${renderSlotHtml('head', 0)}
        </div>
        
        <!-- Right Arm -->
        <div class="zone arm-l-zone">
          <div class="zone-label">R. Arm</div>
          ${renderSlotHtml('r-arm', 0)}
        </div>
        
        <!-- Torso -->
        <div class="zone torso-zone">
          <div class="zone-label">Torso</div>
          ${renderSlotHtml('torso', 0)}
          ${renderSlotHtml('torso', 1)}
          ${renderSlotHtml('torso', 2)}
          ${renderSlotHtml('torso', 3)}
          ${renderSlotHtml('torso', 4)}
        </div>
        
        <!-- Left Arm -->
        <div class="zone arm-r-zone">
          <div class="zone-label">L. Arm</div>
          ${renderSlotHtml('l-arm', 0)}
        </div>
        
        <!-- Right Leg -->
        <div class="zone leg-l-zone">
          <div class="zone-label">R. Leg</div>
          ${renderSlotHtml('r-leg', 0)}
        </div>
        
        <!-- Left Leg -->
        <div class="zone leg-r-zone">
          <div class="zone-label">L. Leg</div>
          ${renderSlotHtml('l-leg', 0)}
        </div>
      </div>
      
      ${extraHtml}
    </div>
  `;

  const root = $('#slots-list');
  root.innerHTML = html;

  if (!ro) {
    // Quantity minus
    root.querySelectorAll('.qty-minus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.closest('.qty-adjust').dataset.id;
        setState(st => {
          const item = st.items.find(x => x.id === itemId);
          if (item) {
            item.quantity = Math.max(0, item.quantity - 1);
          }
          return st;
        });
      };
    });
    
    // Quantity plus
    root.querySelectorAll('.qty-plus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.closest('.qty-adjust').dataset.id;
        setState(st => {
          const item = st.items.find(x => x.id === itemId);
          if (item && item.maxQuantity) {
            item.quantity = Math.min(item.maxQuantity, item.quantity + 1);
          }
          return st;
        });
      };
    });

    // Edit Item
    root.querySelectorAll('.slot-edit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.closest('.slot-actions').dataset.id;
        openItemModal(itemId);
      };
    });

    // Duplicate Item
    root.querySelectorAll('.slot-dup-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.closest('.slot-actions').dataset.id;
        setState(st => {
          const item = st.items.find(x => x.id === itemId);
          if (item) {
            const copy = {
              ...structuredClone(item),
              id: crypto.randomUUID(),
              zone: null, // Clear zone to let mapping auto-assign it
              zoneIndex: null
            };
            st.items.push(copy);
          }
          return st;
        });
      };
    });

    // Delete Item
    root.querySelectorAll('.slot-del-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.closest('.slot-actions').dataset.id;
        if (confirm('Delete this item?')) {
          setState(st => {
            st.items = st.items.filter(x => x.id !== itemId);
            return st;
          });
        }
      };
    });

    // Add Item click listener on empty slots
    root.querySelectorAll('.slot-empty').forEach(slot => {
      slot.onclick = (e) => {
        const zone = slot.dataset.zone;
        const index = Number(slot.dataset.index);
        openItemModal(null, zone, index);
      };
    });

    // Drag & Drop reordering
    root.querySelectorAll('.slot[draggable="true"]').forEach(row => {
      row.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', row.dataset.id);
        row.classList.add('dragging');
      };
      row.ondragend = () => {
        row.classList.remove('dragging');
        root.querySelectorAll('.slot').forEach(r => r.classList.remove('drag-over'));
      };
    });

    root.querySelectorAll('.slot').forEach(row => {
      row.ondragover = (e) => {
        e.preventDefault();
        row.classList.add('drag-over');
      };
      row.ondragleave = () => {
        row.classList.remove('drag-over');
      };
      row.ondrop = (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetZone = row.dataset.zone;
        const targetIndex = Number(row.dataset.index);
        
        if (!draggedId || targetZone === undefined) return;

        setState(st => {
          const draggedItem = st.items.find(x => x.id === draggedId);
          if (!draggedItem) return st;

          // Find if there is an item already in target slot
          const targetItem = st.items.find(x => x.zone === targetZone && x.zoneIndex === targetIndex);

          if (targetItem) {
            // Swap their zones and indexes
            const tempZone = draggedItem.zone;
            const tempIndex = draggedItem.zoneIndex;

            draggedItem.zone = targetItem.zone;
            draggedItem.zoneIndex = targetItem.zoneIndex;

            targetItem.zone = tempZone;
            targetItem.zoneIndex = tempIndex;
          } else {
            // Target slot is empty, just move dragged item there
            draggedItem.zone = targetZone;
            draggedItem.zoneIndex = targetIndex;
          }
          return st;
        });
      };
    });
  }
}

function renderSpellsPlay(s) {
  const panel = $('#spells-panel');
  const spells = s.items.filter(item => item.kind === 'spellbook');
  panel.hidden = spells.length === 0;
  $('#spells-list').innerHTML = spells.length
    ? spells.map(item => `<div class="spell-row">📖 ${escapeHtml(item.name)}</div>`).join('')
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

  // Unified items list
  const root = $('#inventory-edit-list');
  if (root) {
    if (!s.items || s.items.length === 0) {
      root.innerHTML = '<div class="dim" style="text-align: center; padding: 12px;">No items in inventory. Click "+ Add Item" below.</div>';
    } else {
      root.innerHTML = s.items.map(item => {
        let badgeClass = `badge-${item.kind || 'general'}`;
        let label = item.kind === 'spellbook' ? 'Spell' : (item.kind || 'general');
        return `
          <div class="item-edit-row">
            <div class="item-info">
              <span class="item-name">${escapeHtml(item.name || '(unnamed)')}</span>
              <span class="item-badge ${badgeClass}">${escapeHtml(label)}</span>
              <span class="item-slots-badge">${item.slots || 1} sl</span>
            </div>
            <div class="item-actions">
              <button class="mini edit-item-btn" data-id="${item.id}" title="Edit item">✎</button>
              <button class="mini danger delete-item-btn" data-id="${item.id}" title="Delete item">×</button>
            </div>
          </div>
        `;
      }).join('');

      root.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.onclick = () => {
          openItemModal(btn.dataset.id);
        };
      });
      root.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.onclick = () => {
          if (confirm('Delete this item?')) {
            setState(st => {
              st.items = st.items.filter(x => x.id !== btn.dataset.id);
              return st;
            });
          }
        };
      });
    }
  }
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

let targetSlotZone = null;
let targetSlotIndex = null;

function openItemModal(itemId = null, zone = null, zoneIndex = null) {
  editingItemId = itemId;
  targetSlotZone = zone;
  targetSlotIndex = zoneIndex;
  const modal = $('#item-modal');
  const titleEl = $('#modal-title');
  
  const nameInput = $('#m-item-name');
  const kindSelect = $('#m-item-kind');
  const slotsInput = $('#m-item-slots');
  const weaponDmgInput = $('#m-weapon-dmg');
  const armorDrInput = $('#m-armor-dr');
  const armorCategorySelect = $('#m-armor-category');
  const shieldMaxHPInput = $('#m-shield-max-hp');
  const hasQtyCheckbox = $('#m-has-quantity');
  const maxQtyInput = $('#m-item-max-qty');
  const unitInput = $('#m-item-unit');
  const amountToAddInput = $('#m-amount-to-add');
  const amountToAddContainer = $('#m-amount-to-add-container');

  if (itemId) {
    titleEl.textContent = 'Edit Item';
    if (amountToAddContainer) amountToAddContainer.hidden = true;
    const item = getState().items.find(x => x.id === itemId);
    if (item) {
      nameInput.value = item.name || '';
      kindSelect.value = item.kind || 'general';
      slotsInput.value = item.slots ?? 1;
      weaponDmgInput.value = item.dmg || 'd6';
      armorDrInput.value = item.dr ?? 0.5;
      if (armorCategorySelect) armorCategorySelect.value = item.category || 'torso';
      shieldMaxHPInput.value = item.shieldMaxHP ?? 3;
      
      const hasQty = item.maxQuantity !== undefined && item.maxQuantity !== null;
      hasQtyCheckbox.checked = hasQty;
      maxQtyInput.value = item.maxQuantity ?? 20;
      unitInput.value = item.unit || 'uses';
    }
  } else {
    titleEl.textContent = 'Add Item';
    if (amountToAddContainer) {
      amountToAddContainer.hidden = false;
      amountToAddInput.value = 1;
    }
    nameInput.value = '';
    kindSelect.value = 'general';
    slotsInput.value = 1;
    weaponDmgInput.value = 'd6';
    armorDrInput.value = 0.5;
    if (armorCategorySelect) armorCategorySelect.value = 'torso';
    shieldMaxHPInput.value = 3;
    hasQtyCheckbox.checked = false;
    maxQtyInput.value = 20;
    unitInput.value = 'uses';
  }

  updateModalFields();
  modal.classList.add('active');
}

function updateModalFields() {
  const kind = $('#m-item-kind').value;
  const hasQty = $('#m-has-quantity').checked;
  
  $('#m-weapon-fields').hidden = kind !== 'weapon';
  $('#m-armor-fields').hidden = kind !== 'armor';
  $('#m-shield-fields').hidden = kind !== 'shield';
  $('#m-quantity-fields').hidden = !hasQty;
}

function handleKindChange() {
  const kind = $('#m-item-kind').value;
  const slotsInput = $('#m-item-slots');
  const armorDrInput = $('#m-armor-dr');
  if (!editingItemId) {
    if (kind === 'armor') {
      slotsInput.value = 2;
      if (armorDrInput) armorDrInput.value = 0.5;
    } else {
      slotsInput.value = 1;
    }
  }
  updateModalFields();
}

function wireModalHandlers() {
  const modal = $('#item-modal');
  const closeBtn = $('#modal-close-btn');
  const cancelBtn = $('#modal-cancel-btn');
  const saveBtn = $('#modal-save-btn');
  const kindSelect = $('#m-item-kind');
  const hasQtyCheckbox = $('#m-has-quantity');

  const closeModal = () => {
    modal.classList.remove('active');
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  kindSelect.onchange = handleKindChange;
  hasQtyCheckbox.onchange = updateModalFields;

  saveBtn.onclick = () => {
    const name = $('#m-item-name').value.trim();
    const kind = kindSelect.value;
    const slots = Number($('#m-item-slots').value) || 0;
    
    if (!name) {
      alert('Please enter an item name.');
      return;
    }

    const updatedItem = {
      id: editingItemId || crypto.randomUUID(),
      name,
      kind,
      slots
    };

    // If pre-placing from grid click
    if (!editingItemId && targetSlotZone !== null) {
      updatedItem.zone = targetSlotZone;
      updatedItem.zoneIndex = targetSlotIndex;
    }

    // Strict sanitization: Only save attributes relevant to kind
    if (kind === 'weapon') {
      updatedItem.dmg = $('#m-weapon-dmg').value.trim() || 'd6';
    } else if (kind === 'armor') {
      const parsedDr = Number($('#m-armor-dr').value);
      updatedItem.dr = !isNaN(parsedDr) ? parsedDr : 0.5;
      updatedItem.category = $('#m-armor-category').value;
      if (editingItemId) {
        const oldItem = getState().items.find(x => x.id === editingItemId);
        updatedItem.equipped = oldItem ? !!oldItem.equipped : true;
      } else {
        updatedItem.equipped = true;
      }
    } else if (kind === 'shield') {
      updatedItem.shieldMaxHP = Number($('#m-shield-max-hp').value) || 1;
    }

    if ($('#m-has-quantity').checked) {
      const maxQty = Number($('#m-item-max-qty').value) || 1;
      const unit = $('#m-item-unit').value.trim();
      updatedItem.maxQuantity = maxQty;
      updatedItem.unit = unit;
      
      if (editingItemId) {
        const oldItem = getState().items.find(x => x.id === editingItemId);
        updatedItem.quantity = oldItem && oldItem.quantity !== undefined
          ? Math.min(oldItem.quantity, maxQty)
          : maxQty;
      } else {
        updatedItem.quantity = maxQty;
      }
    }

    const amountToAdd = !editingItemId ? (Number($('#m-amount-to-add').value) || 1) : 1;

    setState(st => {
      if (editingItemId) {
        if (updatedItem.kind === 'armor' && updatedItem.equipped) {
          st.items.forEach(x => {
            if (x.kind === 'armor' && x.category === updatedItem.category && x.id !== editingItemId) {
              x.equipped = false;
            }
          });
        }
        st.items = st.items.map(x => x.id === editingItemId ? updatedItem : x);
      } else {
        for (let a = 0; a < amountToAdd; a++) {
          const itemCopy = {
            ...updatedItem,
            id: crypto.randomUUID()
          };
          if (itemCopy.kind === 'armor' && itemCopy.equipped) {
            st.items.forEach(x => {
              if (x.kind === 'armor' && x.category === itemCopy.category) {
                x.equipped = false;
              }
            });
          }
          st.items.push(itemCopy);
        }
        if (kind === 'shield') {
          st.shieldHP = shieldMaxHP(st);
        }
      }
      return st;
    });

    closeModal();
  };
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
  bindNum ('#f-hp-cur',     (v, st) => st.hp.current = v);
  bindNum ('#f-hp-max',     (v, st) => st.hp.max = v);

  // Coins fields
  COIN_TYPES.forEach(c => {
    bindNum(`#f-coins-${c.key}`, (v, st) => {
      if (!st.coins) st.coins = {};
      st.coins[c.key] = v;
    });
  });

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

  // Add Item buttons (Edit Panel and Slots list)
  const addItemBtn = $('#add-item-btn');
  if (addItemBtn) addItemBtn.onclick = () => openItemModal();

  const addItemBtnSlots = $('#add-item-btn-slots');
  if (addItemBtnSlots) addItemBtnSlots.onclick = () => openItemModal();

  // Wire Modal handlers
  wireModalHandlers();
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
