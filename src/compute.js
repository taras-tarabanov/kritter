// ============================================================
//  Derived calculations.
//  Pure functions of state -> numbers. No DOM, no side effects.
// ============================================================
import { careerById, weaponById, armorById, shieldById } from './data.js';

export function slotCapacity(state) {
  // House rule confirmed: 10 + CON
  return 10 + (state.abilities.con || 0);
}

export function slotsUsed(state) {
  let used = 0;

  // Career starting items (1 slot each, by the book)
  for (const id of state.careers) {
    const c = careerById(id);
    if (c) used += c.items.length;
  }

  // Universal basics
  if (state.basics.rations) used += 2;
  if (state.basics.rope)    used += 1;
  if (state.basics.torches) used += 2;
  if (state.basics.quiver)  used += 1;

  // Armor
  for (const part of ['head','torso','limbs']) {
    if (state.armor[part]) used += armorById(part).slots;
  }
  // Shield
  for (const s of ['small','large']) {
    if (state.shield[s]) used += shieldById(s).slots;
  }
  // Weapons
  for (const id of Object.keys(state.weapons)) {
    const w = weaponById(id);
    if (w && state.weapons[id]) used += w.slots;
  }
  // Spellbooks (1 slot each)
  used += state.spells.length;

  // Hand-written extra items
  for (const row of state.extraItems) {
    used += Number(row.slots) || 0;
  }
  return used;
}

export function damageReduction(state) {
  let dr = 0;
  if (state.armor.head)  dr += 1;
  if (state.armor.torso) dr += 1;
  if (state.armor.limbs) dr += 1;
  return dr;
}

// Max shield HP available given selected shields (for "reset shield" button)
export function shieldMaxHP(state) {
  let hp = 0;
  if (state.shield.small) hp = Math.max(hp, 1);
  if (state.shield.large) hp = Math.max(hp, 3);
  return hp;
}

// Builds a flat list of inventory rows for display.
// Each row: { source, name, slots, kind }
export function inventoryRows(state) {
  const rows = [];

  for (const id of state.careers) {
    const c = careerById(id);
    if (c) for (const item of c.items) {
      rows.push({ source: c.name, name: item, slots: 1, kind: 'career' });
    }
  }
  if (state.basics.rations) rows.push({ source: 'Basics', name: '2 Rations',  slots: 2, kind: 'basic' });
  if (state.basics.rope)    rows.push({ source: 'Basics', name: "50' Rope",   slots: 1, kind: 'basic' });
  if (state.basics.torches) rows.push({ source: 'Basics', name: '2 Torches',  slots: 2, kind: 'basic' });
  if (state.basics.quiver)  rows.push({ source: 'Basics', name: 'Quiver (20 arrows)', slots: 1, kind: 'basic' });

  for (const part of ['head','torso','limbs']) {
    if (state.armor[part]) {
      const a = armorById(part);
      rows.push({ source: 'Armor', name: a.name, slots: a.slots, kind: 'armor' });
    }
  }
  for (const s of ['small','large']) {
    if (state.shield[s]) {
      const sh = shieldById(s);
      rows.push({ source: 'Shield', name: sh.name, slots: sh.slots, kind: 'shield' });
    }
  }
  for (const id of Object.keys(state.weapons)) {
    const w = weaponById(id);
    if (w && state.weapons[id]) {
      rows.push({ source: 'Weapon', name: `${w.name} (${w.dmg})`, slots: w.slots, kind: 'weapon' });
    }
  }
  state.spells.forEach((s, i) => {
    rows.push({ source: 'Magic', name: `Spellbook: ${s}`, slots: 1, kind: 'spell' });
  });
  state.extraItems.forEach(row => {
    rows.push({ source: 'Extra', name: row.name || '(unnamed)', slots: Number(row.slots) || 0, kind: 'extra', id: row.id });
  });

  return rows;
}
