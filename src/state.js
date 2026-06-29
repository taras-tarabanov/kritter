// ============================================================
//  Character state: single source of truth.
//  - `state` is the live in-memory object
//  - `loadState` / `saveState` use localStorage for persistence
//  - `subscribe` lets the UI re-render on change
//  - When Owlbear is available, OBR metadata becomes authoritative
//    (see obr.js); localStorage is just the local fallback.
// ============================================================

import { weaponById } from './data.js';

const STORAGE_KEY = 'knave-sheet:v2';
const SCHEMA_VERSION = 2;


// ----- factory -----
export function emptyCharacter() {
  return {
    _schema: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: 'Nameless Knave',
    gender: '',
    motivation: '',
    level: 1,
    xp: 0,
    morale: 0,                  // -3 .. +3
    abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    hp:  { current: 4, max: 4 },
    coins: { gp: 0, sp: 0, cp: 0 },
    careers: [],                // array of career ids (numbers)
    items: [],                  // unified array of items
    notes: '',
    portrait: '',
    shieldHP: 0                 // current shield HP
  };
}

let listeners = new Set();
let _state = loadState();

export function getState() { return _state; }

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(structuredClone(_state)) : updater;
  _state = next;
  saveState();
  listeners.forEach(fn => { try { fn(_state); } catch(e) { console.error(e); } });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ----- persistence -----
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) { console.warn('saveState failed', e); }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCharacter();
    const obj = JSON.parse(raw);
    return migrate(obj);
  } catch (e) {
    console.warn('loadState failed, starting fresh', e);
    return emptyCharacter();
  }
}

// Apply imported / OBR-synced state, replacing local.
// We migrate so older exports still load cleanly.
export function replaceState(obj) {
  _state = migrate(obj);
  saveState();
  listeners.forEach(fn => fn(_state));
}

// Forward-compatible: fill in any keys missing from older saves.
function migrate(obj) {
  const fresh = emptyCharacter();
  if (!obj) return fresh;

  // If already migrated or schema 2, shallow merge & merge sub-objects
  if (obj._schema === 2) {
    const merged = { ...fresh, ...obj };
    merged.abilities = { ...fresh.abilities, ...(obj.abilities || {}) };
    merged.hp        = { ...fresh.hp,        ...(obj.hp        || {}) };
    merged.coins     = { ...fresh.coins,     ...(obj.coins     || {}) };
    merged.items     = Array.isArray(obj.items) ? obj.items : [];
    merged.careers   = Array.isArray(obj.careers) ? obj.careers : [];
    return merged;
  }

  // Schema v1 -> v2 Migration
  const merged = { ...fresh, ...obj };
  merged.abilities = { ...fresh.abilities, ...(obj.abilities || {}) };
  merged.hp        = { ...fresh.hp,        ...(obj.hp        || {}) };
  merged.careers   = Array.isArray(obj.careers) ? obj.careers : [];
  
  // 1. Coins migration
  if (typeof obj.coins === 'number') {
    merged.coins = { gp: 0, sp: 0, cp: obj.coins };
  } else if (obj.coins) {
    merged.coins = { gp: 0, sp: 0, cp: 0, ...obj.coins };
  } else {
    merged.coins = { gp: 0, sp: 0, cp: 0 };
  }

  // 2. Inventory migration
  const items = [];

  // Basics
  if (obj.basics) {
    if (obj.basics.rations) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Rations',
        slots: 2,
        kind: 'general'
      });
    }
    if (obj.basics.rope) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Rope',
        slots: 1,
        kind: 'general',
        quantity: 50,
        maxQuantity: 50,
        unit: 'ft'
      });
    }
    if (obj.basics.torches) {
      // 2 Torches in separate slots
      items.push({
        id: crypto.randomUUID(),
        name: 'Torch',
        slots: 1,
        kind: 'general'
      });
      items.push({
        id: crypto.randomUUID(),
        name: 'Torch',
        slots: 1,
        kind: 'general'
      });
    }
    if (obj.basics.quiver) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Quiver',
        slots: 1,
        kind: 'general',
        quantity: 20,
        maxQuantity: 20,
        unit: 'arrows'
      });
    }
  }

  // Armor
  if (obj.armor) {
    if (obj.armor.head) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Head Armor',
        slots: 2,
        kind: 'armor',
        dr: 1
      });
    }
    if (obj.armor.torso) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Torso Armor',
        slots: 2,
        kind: 'armor',
        dr: 1
      });
    }
    if (obj.armor.limbs) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Limbs Armor',
        slots: 2,
        kind: 'armor',
        dr: 1
      });
    }
  }

  // Shield
  if (obj.shield) {
    if (obj.shield.small) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Small Shield',
        slots: 1,
        kind: 'shield',
        shieldMaxHP: 1
      });
    }
    if (obj.shield.large) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Large Shield',
        slots: 2,
        kind: 'shield',
        shieldMaxHP: 3
      });
    }
  }

  // Weapons
  if (obj.weapons) {
    for (const wId of Object.keys(obj.weapons)) {
      if (obj.weapons[wId]) {
        const w = weaponById(wId);
        if (w) {
          items.push({
            id: crypto.randomUUID(),
            name: w.name,
            slots: w.slots || 1,
            kind: 'weapon',
            dmg: w.dmg || 'd6'
          });
        }
      }
    }
  }

  // Spells
  if (Array.isArray(obj.spells)) {
    for (const sName of obj.spells) {
      items.push({
        id: crypto.randomUUID(),
        name: sName,
        slots: 1,
        kind: 'spellbook'
      });
    }
  }

  // Extra items
  if (Array.isArray(obj.extraItems)) {
    for (const ex of obj.extraItems) {
      items.push({
        id: ex.id || crypto.randomUUID(),
        name: ex.name || '',
        slots: Number(ex.slots) || 1,
        kind: 'general'
      });
    }
  }

  merged.items = items;
  merged._schema = SCHEMA_VERSION;
  return merged;
}
