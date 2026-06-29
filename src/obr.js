// ============================================================
//  Owlbear Rodeo integration.
//
//  Strategy:
//  - Each player's character lives in their PLAYER metadata
//    under the key `com.knave-sheet/character`.
//  - When the player edits their sheet, we write to OBR metadata
//    (debounced). OBR broadcasts it to everyone in the room.
//  - The GM can switch which player they're viewing via the tab
//    bar; when "viewing" someone else, the sheet renders read-only.
//
//  Falls back gracefully: if window.OBR is missing (e.g. running
//  outside Owlbear), every function is a no-op and the sheet
//  works purely against localStorage.
// ============================================================
import { getState, replaceState, subscribe } from './state.js';

const META_KEY = 'com.knave-sheet/character';
const DEBOUNCE_MS = 400;

export const obrAvailable = () => typeof window !== 'undefined' && !!window.OBR;

let currentPlayerId = null;
let viewingPlayerId = null;
let playerRole = 'PLAYER'; // 'GM' or 'PLAYER'
let onPlayerListChange = () => {};
let onViewChange = () => {};
let allPlayersCache = []; // [{ id, name, role, character }]

let writeTimer = null;

export async function initOBR(callbacks = {}) {
  onPlayerListChange = callbacks.onPlayerListChange || (() => {});
  onViewChange       = callbacks.onViewChange       || (() => {});

  if (!obrAvailable()) {
    console.info('[knave-sheet] OBR SDK not detected — running standalone.');
    return { available: false };
  }

  await new Promise(resolve => {
    if (window.OBR.isReady) resolve();
    else window.OBR.onReady(resolve);
  });

  currentPlayerId = window.OBR.player.id;
  viewingPlayerId = currentPlayerId;
  playerRole      = await window.OBR.player.getRole();

  // Push our local state to OBR on every change (debounced).
  subscribe(() => scheduleWrite());

  // If we already have remote state, prefer it (multi-device support).
  const initialMeta = await window.OBR.player.getMetadata();
  if (initialMeta && initialMeta[META_KEY]) {
    replaceState(initialMeta[META_KEY]);
  } else {
    // First run on this room: push current local state up.
    scheduleWrite(true);
  }

  // When *our* metadata changes elsewhere, mirror it locally.
  window.OBR.player.onChange(player => {
    if (viewingPlayerId !== currentPlayerId) return; // viewing someone else
    const remote = player.metadata?.[META_KEY];
    if (remote && JSON.stringify(remote) !== JSON.stringify(getState())) {
      replaceState(remote);
    }
  });

  // Watch the party (other players) so the GM can pick whose sheet to view.
  window.OBR.party.onChange(refreshPartyCache);
  await refreshPartyCache();

  return {
    available: true,
    currentPlayerId,
    role: playerRole
  };
}

async function refreshPartyCache() {
  if (!obrAvailable()) return;
  const party = await window.OBR.party.getPlayers();
  const me    = { id: currentPlayerId,
                  name: window.OBR.player.name || 'Me',
                  role: playerRole,
                  metadata: await window.OBR.player.getMetadata() };
  const all = [me, ...party].map(p => ({
    id: p.id,
    name: p.name || '(player)',
    role: p.role || 'PLAYER',
    character: p.metadata?.[META_KEY] || null
  }));
  // dedupe by id
  const seen = new Set();
  allPlayersCache = all.filter(p => !seen.has(p.id) && seen.add(p.id));
  onPlayerListChange(allPlayersCache);
}

export function getParty() { return allPlayersCache; }
export function getRole()  { return playerRole; }
export function getCurrentPlayerId() { return currentPlayerId; }
export function getViewingPlayerId() { return viewingPlayerId; }
export function isViewingOwn() { return viewingPlayerId === currentPlayerId; }

// GM picks whose sheet to view. Loads their character into the
// editor in READ-ONLY mode (we just don't allow setState to write
// back to OBR; the UI also disables inputs — see ui.js).
export async function viewPlayer(id) {
  if (!obrAvailable()) return;
  viewingPlayerId = id;
  if (id === currentPlayerId) {
    // back to own sheet: reload our own metadata
    const meta = await window.OBR.player.getMetadata();
    if (meta?.[META_KEY]) replaceState(meta[META_KEY]);
  } else {
    const target = allPlayersCache.find(p => p.id === id);
    if (target?.character) replaceState(target.character);
  }
  onViewChange(viewingPlayerId);
}

function scheduleWrite(immediate = false) {
  if (!obrAvailable()) return;
  if (viewingPlayerId !== currentPlayerId) return; // never write GM's view back
  clearTimeout(writeTimer);
  const doWrite = async () => {
    try {
      await window.OBR.player.setMetadata({ [META_KEY]: getState() });
    } catch (e) {
      console.warn('OBR write failed', e);
    }
  };
  if (immediate) doWrite();
  else writeTimer = setTimeout(doWrite, DEBOUNCE_MS);
}
