// ============================================================
//  Derived calculations.
//  Pure functions of state -> numbers. No DOM, no side effects.
// ============================================================
import { careerById } from './data.js';

export function slotCapacity(state) {
  // House rule confirmed: 10 + CON
  return 10 + (state.abilities.con || 0);
}

export function slotsUsed(state) {
  let used = 0;

  // Career starting items (1 slot each, by the book)
  if (Array.isArray(state.careers)) {
    for (const id of state.careers) {
      const c = careerById(id);
      if (c) used += c.items.length;
    }
  }

  // Unified items
  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      used += Number(item.slots) || 0;
    }
  }
  return used;
}

export function damageReduction(state) {
  let dr = 0;
  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      if (item.kind === 'armor') {
        dr += Number(item.dr) || 0;
      }
    }
  }
  return dr;
}

// Max shield HP available given selected shields (for "reset shield" button / display check)
export function shieldMaxHP(state) {
  let hp = 0;
  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      if (item.kind === 'shield') {
        hp = Math.max(hp, Number(item.shieldMaxHP) || 0);
      }
    }
  }
  return hp;
}

// Builds a flat list of inventory rows for display.
// Each row: { id, source, name, slots, kind, ...details }
export function inventoryRows(state) {
  const rows = [];

  if (Array.isArray(state.careers)) {
    for (const id of state.careers) {
      const c = careerById(id);
      if (c) {
        for (const item of c.items) {
          rows.push({ source: c.name, name: item, slots: 1, kind: 'career' });
        }
      }
    }
  }

  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      rows.push({
        id: item.id,
        source: getSourceLabel(item.kind),
        name: item.name,
        slots: Number(item.slots) || 0,
        kind: item.kind,
        quantity: item.quantity,
        maxQuantity: item.maxQuantity,
        unit: item.unit,
        dmg: item.dmg,
        dr: item.dr,
        shieldMaxHP: item.shieldMaxHP
      });
    }
  }

  return rows;
}

function getSourceLabel(kind) {
  switch (kind) {
    case 'weapon': return 'Weapon';
    case 'armor': return 'Armor';
    case 'shield': return 'Shield';
    case 'spellbook': return 'Magic';
    default: return 'Gear';
  }
}

