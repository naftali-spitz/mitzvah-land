# ארץ המצוות | MITZVAH LAND — Game Design

## Product
A local, bilingual, hot-seat property-trading game for 2–6 family/friend players. It uses the familiar 40-space classic structure but has original Jewish/Israeli branding, content, visual identity, currency, cards, and UI.

## Currency
**זוזים / Zuzim**, represented visually by the original **Badge Z** SVG (`CurrencyIcon.tsx`). Starting cash: 1,500 Zuzim. Passing Start: 200 Zuzim.

## Board order
0 Start; 1 Bnei Brak; 2 Good Deeds; 3 Mea Shearim; 4 Shabbat Shopping; 5 Ben Gurion Airport; 6 Tiberias; 7 Mazal Tov; 8 Meron; 9 Tzfat; 10 Traffic/Visiting; 11 Ashdod; 12 Mekorot; 13 Netanya; 14 Beit Shemesh; 15 Jerusalem Central Station; 16 Sea of Galilee; 17 Good Deeds; 18 Akko; 19 Caesarea; 20 Free Parking; 21 Hebron; 22 Mazal Tov; 23 Cave of the Patriarchs; 24 Rachel's Tomb; 25 Tel Aviv Railway; 26 Masada; 27 Ein Gedi; 28 Electric Company; 29 Dead Sea; 30 Go To Traffic; 31 Jerusalem Old City; 32 Mount of Olives; 33 Good Deeds; 34 City of David; 35 Jerusalem Railway; 36 Mazal Tov; 37 Western Wall; 38 Wedding Season; 39 Jerusalem.

## Core rules
- 2–6 players, 1,500 starting Zuzim.
- Doubles grant another roll; three consecutive doubles send the player to Traffic.
- Traffic can be left by doubles, 50 Zuzim, or a get-out card; after three failed turns the fine is mandatory.
- Unowned property can be bought or auctioned.
- Full color groups double unimproved rent.
- Buildings require a complete group and must be built/sold evenly. Building level 5 is a guest house/hotel equivalent.
- Mortgaging requires no buildings in that color group; unmortgage cost is 110% of mortgage value.
- Stations scale 25/50/100/200. Utilities use 4× dice for one, 10× for both.
- Debt pauses progress and permits asset liquidation before payment or bankruptcy.
- Bankruptcy to a player transfers assets; bankruptcy to bank releases them.
- Last solvent player wins.

## Decks
24 Mazal Tov cards and 24 Good Deeds cards. Effects include payments, collections, player-to-player transfers, movement, traffic, get-out cards and repairs.

## UX
Desktop-first board with a 11×11 CSS board grid, animated Framer Motion tokens/dice, player panel, action console, property management, trading, auctions, cards, game log, rules and winner screen. Hebrew, English, and bilingual display modes are supported.
