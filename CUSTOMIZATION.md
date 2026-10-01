# Customizing Mitzvah Land

The game content is intentionally data-driven.

## Change properties / board spaces
Edit `src/data/board.ts`. Every location has Hebrew/English names, type, prices, rents and building cost.

## Change cards
Edit `src/data/cards.ts`. Both decks contain localized text and a structured effect. Reuse existing effect types unless you also extend card handling in `gameStore.ts`.

## Change the currency
The name “Zuzim” is UI/content text. The custom Badge-Z mark is `src/components/CurrencyIcon.tsx`. Because it uses `currentColor`, it works automatically in HUD, board prices, modals and winner stats.

## Change player tokens
Edit the `tokens` array near the top of `src/components/SetupScreen.tsx`. Tokens are currently compact Unicode symbols so the project has no external asset dependency. Replace them with SVG components if desired.

## Change theme colors
Edit variables at the top of `src/styles.css`, then the property group colors in `src/data/board.ts` if required.

## Personal photos / custom imagery
Add files under `public/custom/`. The current visual design intentionally uses CSS/SVG so it runs offline with no image downloads. You can extend the Space model with an image path and render it in `PropertyDecision.tsx`/`Board.tsx`.

## Change terminology or translations
Most board/card content is localized in the data files. Core interface labels are colocated in components through the `ui(he,en,lang)` helper. For a much larger localization project, move those strings into dedicated locale files.

## Rules
Rule calculations live in `src/engine/rules.ts`; turn orchestration and actions live in `src/store/gameStore.ts`. Keep presentation code out of these files when possible.
