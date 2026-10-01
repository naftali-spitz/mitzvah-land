# ארץ המצוות | Mitzvah Land

A polished local browser property-trading game for Jewish/Orthodox families and friends, themed around real Israeli places, mitzvot and familiar family-life humor. No account, server or database is required.

## Run
```bash
npm install
npm run dev
```
Open the local URL Vite prints in the terminal.

## Production build
```bash
npm run build
npm run preview
```

## Tests
```bash
npm test
```

## Stack
React + TypeScript + Vite + Zustand + Framer Motion + CSS/SVG. Game state is saved in localStorage under `mitzvah-land-save`.

## Included gameplay
- 40-space classic board structure
- 22 properties, 4 transport hubs, 2 utilities
- purchasing and auctions
- rent / complete group rent / houses / guest-house level
- mortgages and unmortgaging
- hot-seat player trades
- Traffic (jail), doubles and three-doubles rule
- 24 Mazal Tov + 24 Good Deeds cards
- debt resolution and bankruptcy
- last-player-standing winner screen
- Hebrew, English and bilingual modes
- local autosave
- game activity log and in-game rule guide

## Architecture
- `src/data/` — board and card content
- `src/engine/` — pure rule calculations
- `src/store/` — game state machine / actions
- `src/components/` — board, setup, dialogs and game UI

See `CUSTOMIZATION.md` for editing properties, cards, currency, tokens and theme.

## Notes
The project deliberately has no remote image/font/sound dependency, so it can run fully offline after dependencies are installed. Sound effects are lightweight WebAudio cues. Visual landmarks are original CSS/SVG scenery rather than copied Monopoly artwork.
