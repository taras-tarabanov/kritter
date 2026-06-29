# Knave 2e — Character Sheet (Owlbear Rodeo Extension)

A purpose-built, single-file character sheet for **Knave 2e** with the house rules you use:

- Abilities start at 0; point-buy is loose (no enforced cap at runtime — you can tweak for level-ups).
- Item slots = **10 + CON**, with a live numbered slot list.
- **DR** (Damage Reduction) from the armor hack: Head / Torso / Limbs, +1 DR each, 2 slots each.
- **Shields** as separate items with their own HP pool that depletes on hit.
- **Morale dial** in the header, clamped **−3 … +3**.
- Spellbooks as 1-slot items (auto-shown when you have any).
- Free-form extra-items list for loot you pick up in play.
- Career picker pulling all 100 careers from the book.
- Notes block at the bottom.
- Per-character **Export / Import** as JSON.
- **Owlbear sync** via player metadata — your sheet follows you across devices, and the GM can flip through every player's sheet in read-only mode.

## How it's built

No framework, no bundler. Just three files plus data:

```
knave-sheet/
├── index.html          ← entry point
├── src/
│   ├── data.js         ← careers, weapons, armor, shields
│   ├── state.js        ← single source of truth + localStorage
│   ├── compute.js      ← derived values (slots, DR, etc.)
│   ├── obr.js          ← Owlbear Rodeo SDK glue
│   ├── ui.js           ← DOM building + event wiring
│   └── styles.css      ← parchment theme
└── public/
    ├── manifest.json   ← Owlbear extension manifest
    └── icon.svg        ← extension icon
```

## Run it locally

Native ES modules require a real HTTP server (file:// won't work because of CORS). Easiest:

```bash
cd knave-sheet
python3 -m http.server 5173
# then open http://localhost:5173 in your browser
```

Any static server works (`npx serve`, `caddy file-server`, etc.).

When you're not inside Owlbear, the OBR integration silently no-ops and the sheet runs purely off `localStorage`.

## Install it into Owlbear Rodeo

Owlbear extensions are just a hosted webpage + a `manifest.json`. To install your own:

1. **Host the folder.** Easiest free options:
   - **GitHub Pages**: push the repo, enable Pages on the `main` branch root. Your URL will be `https://YOUR-USERNAME.github.io/knave-sheet/`.
   - **Netlify drop**: drag the folder onto <https://app.netlify.com/drop>.
   - **Cloudflare Pages / Vercel**: same idea.
2. **Edit `public/manifest.json`** so:
   - `homepage_url` points to your hosted URL.
   - The manifest itself is reachable at e.g. `https://YOUR-USERNAME.github.io/knave-sheet/public/manifest.json` (or move `manifest.json` and `icon.svg` to the repo root if you prefer — Owlbear doesn't care where it lives, only that the URL is reachable).
3. **In Owlbear Rodeo**: open a room → ⚙ Settings → Extensions → "Add custom extension" → paste the URL of your `manifest.json`.
4. The sheet now appears in the extensions tray for everyone in the room who installs it.

> **Heads up about iframes:** Owlbear loads the extension in a sandboxed iframe. The UMD Owlbear SDK is loaded from `unpkg.com`; if your players' networks block it, the sheet falls back to standalone mode (no sync). To be fully offline-safe, download the SDK file and serve it from your own host.

## Data format / backups

The Export button downloads a `.knave.json` file containing the whole character object. Import accepts the same. Schema is versioned (`_schema`); migrations live in `src/state.js`.

## Credits

Inspired by the structure of [DummySheet by kurara-ara](https://github.com/kurara-ara/dummy-sheet) (no code reused — just the "sheet-as-extension" pattern). Knave 2e is © Ben Milton.
