// ============================================================
//  Character state: single source of truth.
//  - `state` is the live in-memory object
//  - `loadState` / `saveState` use localStorage for persistence
//  - `subscribe` lets the UI re-render on change
//  - When Owlbear is available, OBR metadata becomes authoritative
//    (see obr.js); localStorage is just the local fallback.
// ============================================================

const STORAGE_KEY = 'knave-sheet:v1';
const SCHEMA_VERSION = 1;

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
    coins: 0,
    careers: [],                // array of career ids (numbers)
    armor:  { head: false, torso: false, limbs: false },
    shield: { small: false, large: false },
    shieldHP: 0,                // current shield HP (drops as it absorbs hits)
    weapons: {},                // { weaponId: true }
    basics: {                   // universal starter gear
      rations: true, rope: true, torches: true, quiver: true
    },
    spells: [],                 // ["Blazing Whisper of Ash" ...]
    // Free-form inventory rows the player adds by hand.
    // Each row is { id, name, slots }. Persisted as-is.
    extraItems: [],
    notes: ''
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
  // shallow merge top level, deep merge known nested objects
  const merged = { ...fresh, ...obj };
  merged.abilities = { ...fresh.abilities, ...(obj.abilities || {}) };
  merged.hp        = { ...fresh.hp,        ...(obj.hp        || {}) };
  merged.armor     = { ...fresh.armor,     ...(obj.armor     || {}) };
  merged.shield    = { ...fresh.shield,    ...(obj.shield    || {}) };
  merged.basics    = { ...fresh.basics,    ...(obj.basics    || {}) };
  merged.weapons   = { ...(obj.weapons || {}) };
  merged.careers   = Array.isArray(obj.careers)    ? obj.careers    : [];
  merged.spells    = Array.isArray(obj.spells)     ? obj.spells     : [];
  merged.extraItems= Array.isArray(obj.extraItems) ? obj.extraItems : [];
  merged._schema   = SCHEMA_VERSION;
  return merged;
}
