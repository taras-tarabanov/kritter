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
  let activeArmorSlots = 0;
  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      if (item.kind === 'armor') {
        activeArmorSlots++;
      }
    }
  }
  return Math.min(3, Math.floor(activeArmorSlots / 2));
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
        shieldMaxHP: item.shieldMaxHP,
        category: item.category,
        equipped: item.equipped
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

// Maps inventory items to the 10-slot anatomical grid map + extra slots
export function getOccupiedGrid(state) {
  const cap = slotCapacity(state);
  const extraCount = Math.max(0, cap - 10);
  
  const slotDefs = [
    { zone: 'head', index: 0 },
    { zone: 'torso', index: 0 },
    { zone: 'torso', index: 1 },
    { zone: 'torso', index: 2 },
    { zone: 'torso', index: 3 },
    { zone: 'torso', index: 4 },
    { zone: 'r-arm', index: 0 },
    { zone: 'l-arm', index: 0 },
    { zone: 'r-leg', index: 0 },
    { zone: 'l-leg', index: 0 }
  ];
  for (let i = 0; i < extraCount; i++) {
    slotDefs.push({ zone: 'extra', index: i });
  }

  const grid = slotDefs.map(def => ({ ...def, item: null, parentSlot: null }));

  if (Array.isArray(state.items)) {
    // 1. Place items that already have a zone assigned
    for (const item of state.items) {
      if (item.zone) {
        const startIdx = grid.findIndex(g => g.zone === item.zone && g.index === item.zoneIndex);
        if (startIdx !== -1) {
          const itemSlots = Number(item.slots) || 1;
          for (let s = 0; s < itemSlots; s++) {
            const targetIdx = startIdx + s;
            if (targetIdx < grid.length) {
              grid[targetIdx].item = item;
              grid[targetIdx].parentSlot = (s === 0);
            }
          }
        }
      }
    }

    // 2. Place items that do not have a zone yet (migration/fallback)
    for (const item of state.items) {
      if (!item.zone) {
        const itemSlots = Number(item.slots) || 1;
        let foundIdx = -1;
        
        // Try to find consecutive free slots
        for (let i = 0; i <= grid.length - itemSlots; i++) {
          let consecutiveFree = true;
          for (let s = 0; s < itemSlots; s++) {
            if (grid[i + s].item !== null) {
              consecutiveFree = false;
              break;
            }
          }
          if (consecutiveFree) {
            foundIdx = i;
            break;
          }
        }
        
        // Fallback: any free slot
        if (foundIdx === -1) {
          foundIdx = grid.findIndex(g => g.item === null);
        }

        if (foundIdx !== -1) {
          item.zone = grid[foundIdx].zone;
          item.zoneIndex = grid[foundIdx].index;

          for (let s = 0; s < itemSlots; s++) {
            const targetIdx = foundIdx + s;
            if (targetIdx < grid.length) {
              grid[targetIdx].item = item;
              grid[targetIdx].parentSlot = (s === 0);
            }
          }
        }
      }
    }
  }

  return grid;
}

