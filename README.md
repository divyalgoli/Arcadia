# Arcadia

A modern, dark-first browser game portal (inspired by Poki / CrazyGames, original branding)
built to host independent HTML/CSS/JS games under one homepage.

## Structure

```
GameHub/
├── index.html              → Homepage / game library
├── css/
│   ├── style.css           → Layout, theme tokens, components
│   └── animations.css      → Keyframes, page-transition, toast
├── js/
│   ├── games-data.js       → Game metadata (title, desc, category, thumbnail…)
│   ├── storage.js          → localStorage helpers (favorites, recently played, theme)
│   └── main.js             → Rendering, search, filters, theme toggle, transitions
├── assets/
│   ├── icons/logo.svg
│   └── thumbnails/*.svg    → Card artwork for each game
└── games/
    ├── ping-pong/
    ├── balloon-blast/
    ├── memory-card/
    ├── paint-tag-arena/
    ├── tic-tac-toe-candyland/
    ├── fruit-slash/
    ├── superman-swing/
    └── tank-wars/
```

Each folder inside `games/` is **completely untouched and independent** — original
HTML/CSS/JS/asset files, same filenames, same relative paths. The only change made
inside a game folder is a small snippet appended before `</body>` in its `index.html`
that adds a floating **Home** + **Fullscreen** button (top-left corner) and records
the play in "Recently Played." Nothing else in any game was modified.

## Adding a new game

1. Drop the game's folder into `games/<your-game-slug>/` (its own `index.html` must
   be the entry point).
2. Add one object to the `GAMES` array in `js/games-data.js` (title, description,
   categories, thumbnail path, accent color).
3. Optionally add an SVG/PNG thumbnail to `assets/thumbnails/`.
4. That's it — the homepage grid, search, and category filters pick it up automatically.

## Local preview

No build step. From the `GameHub/` folder run any static server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying

**Netlify:** drag-and-drop the `GameHub` folder (or connect the repo) — no build
command needed, publish directory is the project root.

**GitHub Pages:** push `GameHub`'s contents to the repo root (or `/docs`) and enable
Pages on that branch/folder.

## Login & the global leaderboard

Arcadia has a real login system and a cross-game leaderboard (each
player's single best score, tagged with the game it came from) backed
by a free Firebase project. See **FIREBASE_SETUP.md** for the one-time
setup — until that's done, the site still works fine, just with login
and the leaderboard panel showing a "not set up yet" placeholder.

## Notes

- `games/balloon-blast/js/audio.js` references sound files under `assets/audio/` that
  were not included in the original game ZIP — this was already the case before
  integration, and the game's own code already fails silently (with a console warning)
  if those files are missing. Drop matching `.mp3` files in that folder if you want
  sound.
- All thumbnails are original hand-built SVGs (no external images), so they're crisp
  at any size and add almost nothing to page weight.
