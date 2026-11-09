# Vale Mais: Supermarket Price Helper

*Working name. Designed 2026-11-09. Nothing built yet.*

## 1. Scope

At the supermarket, Eric's wife asks which of two products is the better buy, and whether a
price went up. This app answers on the spot, from a photo of the shelf tag or from typed values:

- **Price per unit** of one product: R$/kg, R$/L, R$/m, R$/un.
- **Compare** two or more products and name the better value, by how much, and why.
- **Remember** every price read, with the product, the store, and the date, so the next visit says
  whether it went up or down, and what it cost at the other stores the family uses.
- **A shopping list**, shared by the family, that estimates the total from the prices already
  recorded.
- **Later:** prices from outside sources and ratings from the internet (sections 9 and 10).

The UI is in Portuguese. This document is in English, like the card tracker's.

## 2. Decisions and Why

**A separate app, built from the card tracker's parts.** *(Eric, 2026-11-09.)* Prices and
Pokémon cards have nothing in common for the person using them, so one app would be two apps in
one menu. What they share is plumbing: the camera screen, the Tesseract.js OCR pool
(`js/scan/ocr.js`), IndexedDB first with Supabase sync, sign-in, and the family group. Copy
those modules rather than share a package, since the two apps will move at their own pace.

**A web app on GitHub Pages, like Eric's other pages.** *(Eric, 2026-11-09.)* A PWA installed on
the home screen, with a service worker so it opens with no signal, which is common inside a
supermarket. Supabase holds the shared data (section 8).

**Tags are read on the phone with OCR.** *(Eric, 2026-11-09.)* Tesseract.js, as in the card
tracker: free, and it works offline. The cost is accuracy: shelf tags are crowded, glossy, and
printed in several layouts. So the confirm screen always shows what was read, every field
editable, and nothing is saved without a look (section 5). A cloud reader (sending the photo to
Claude) was the alternative, more accurate for fractions of a cent per photo; it stays possible
behind the same confirm screen if OCR proves too weak in the field test (section 12).

**The barcode is the product's identity; the tag gives the price.** The EAN on the package is
the same in every store, so it ties one product's prices together across stores and visits. The
barcode on a shelf tag is often the store's internal code, so it is not trusted as an EAN.
Products sold by weight without a barcode (fruit, bulk) get a local id and a name.

**The family shares one price history.** Unlike card copies, a price is a fact about a store,
not about a person: when either of them reads a price, both should see it. So prices, stores,
products, and lists are rows shared by the family group, not one document per person.

**Every price keeps its kind.** Brazilian tags often carry more than one price, and comparing
the wrong one gives the wrong answer (section 4).

**The family's own rating comes before internet stars.** A "we bought it, we did not like it" is
more useful at the shelf than an average from strangers, costs nothing, and has no source to
find (section 10).

## 3. Comparison Units

Each product has a size, and the size decides the unit its price is compared in.

| Size Given As | Normalized To | Shown As |
| --- | --- | --- |
| g, kg | kg | R$/kg |
| ml, L | L | R$/L |
| units (eggs, cans in a pack) | un | R$/un |
| meters (toilet paper, foil, film) | m | R$/m |
| sheets (paper towel, napkins) | 100 sheets | R$/100 folhas |
| washes (laundry soap, when printed) | wash | R$/lavagem |

Rules the math has to follow:

- **Multipacks multiply.** `6 × 200 ml` is 1.2 L. Toilet paper is rolls × meters per roll:
  `12 rolos × 30 m` is 360 m.
- **Drained weight wins when printed.** For canned and jarred food, `peso drenado` is what you
  eat, so it is the size compared, with the net weight kept beside it.
- **Different kinds are flagged, not silently compared.** Single-ply against double-ply toilet
  paper, concentrated against regular softener: the app compares them but says the comparison is
  not like for like.
- **Different units are not compared.** R$/kg against R$/un has no answer unless the person gives
  a conversion (for example, "this pack has about 12 bananas").
- **The tag's own unit price is a check.** When a tag prints R$/kg or R$/L, the app compares it
  with its own result and warns on a mismatch, which usually means a wrong tag on the shelf or a
  misread.

## 4. Kinds of Price on a Tag

| Kind | Example on the Tag | How It Counts |
| --- | --- | --- |
| Regular | `R$ 12,99` | Always |
| Club or app | `Clube R$ 10,99`, `Meu Carrefour R$ 10,99` | Only for a club the family has joined (a setting listing their clubs) |
| Wholesale tier | `A partir de 6 un. R$ 9,99` (atacarejo) | Only when buying at least that many; the comparison asks how many you will buy |
| Multibuy | `Leve 3 Pague 2` | Effective unit price when buying the full set |
| Promotion | `De R$ 14,99 por R$ 12,99` | The "por" price is the price; the "de" price is kept as noted |

A comparison shows the price it used and names its kind, such as "usando preço Clube".

## 5. Reading a Tag

1. **Point at the tag** and take the picture. The screen frames a tag-shaped box.
2. **OCR reads the regions**, each with its own settings, as the card tracker does: the large
   price with a digits-and-comma whitelist, the description line, the size, and any unit price
   or club price.
3. **Parse** with rules for Brazilian tags: `R$`, decimal comma, `KG`, `G`, `ML`, `L`, `UN`,
   `M`, `ROLOS`, `FOLHAS`, `LEVE x PAGUE y`, `A PARTIR DE n`, `CLUBE`.
4. **Scan the package barcode** to identify the product. The first time an EAN is seen, the app
   asks for a name, prefilled from the tag's description line or a product lookup (section 9).
5. **Confirm screen:** product, size, price, kind, store, all editable, with the photo beside them.
   Save, or Save and compare.

Typing is always one tap away, for a tag OCR cannot read and for products with no tag.

**The store** is the nearest one the family has saved, by GPS, with one tap to change it or add
a new one. A store keeps its name, its chain, and its location.

## 6. Comparing

Compare mode holds two or more products, from new photos, from history, or typed. It shows:

- each one's unit price and the price kind it used;
- the winner, and the difference in percent and in reais for the amount you will buy;
- any warning from section 3 (different kinds, a tag mismatch);
- the family's rating, when either product has one.

> Example: Papel A, 12 rolos × 30 m, R$ 21,90 → R$ 0,061/m. Papel B, 16 rolos × 20 m, R$ 22,50 →
> R$ 0,070/m. **A sai 13% mais barato por metro.** Both double-ply.

## 7. History and the Shopping List

**History.** Every saved price is a row: product, store, date, price, kind, who read it, how it
was read (tag, typed, receipt). After a save, the app shows the change since the last price for
that product at that store ("subiu 12% desde 03/10"), and the lowest recent price at any other
store ("no Assaí estava R$ 8,49 há 5 dias").

**The list.** Shared by the family and edited by either person, live. An item is either a
specific product (an EAN) or a generic one ("leite integral 1 L") that the family links to the
products they accept. Each item estimates its price from the first of these that exists:

1. the last price at the store chosen for this trip;
2. the most recent price at any store;
3. the average of recorded prices;
4. an outside average, once section 9 has a source;
5. none, counted as "sem preço".

The list shows the total and how many items have no price. During the trip, scanning a product
on the list ticks it and records its price, so shopping fills the history without extra work.

## 8. Data Model and Storage

Supabase tables, with row-level security by family group, and an IndexedDB copy on each phone
that is written first and synced when online.

- `stores`: id, name, chain, latitude, longitude, CNPJ (filled from a receipt), group.
- `products`: id, EAN or null, name, brand, size amount, size unit, pack count, ply or other
  kind, comparison unit, category, group.
- `prices`: id, product, store, observed at, price, kind, minimum quantity, multibuy terms,
  source, person, optional photo.
- `ratings`: product, person, stars (1 to 5), note.
- `lists` and `list_items`: name, item (product or generic name), quantity, checked, position.

## 9. Outside Price Sources

**There is no public national API for supermarket prices in Brazil.** These are the candidates,
none verified yet (section 12):

1. **The receipt (NFC-e).** Every consumer receipt carries a QR code that opens the state SEFAZ
   page listing every item, its price, and the store's CNPJ. Scanning the receipt on the way out
   records what was actually paid, without typing. The page is the state's, so the phone cannot
   fetch it directly (CORS), and some states put a captcha in front: it likely needs a small
   server function (a Supabase Edge Function). Item codes on a receipt are often the store's, so
   matching them to products needs the EAN where the receipt carries it, and a one-time link
   where it does not.
2. **State price services built on NFC-e data**, which show prices across all stores in a city:
   Menor Preço (Paraná), Preço da Hora (Bahia, Paraíba), Economiza Alagoas. Which one applies
   depends on where the family shops, and whether any offers an API is unknown.
3. **Cosmos (Bluesoft):** product data by EAN, including a name, an image, and an average price.
   It has an API; the free tier's limits and terms are unknown.
4. **Open Food Facts and Open Prices:** free and open, product data and crowd prices by EAN, with
   thin coverage in Brazil.

## 10. Ratings

The family's own stars and note come first (section 2). Internet ratings for supermarket
products have no good source known: marketplace reviews (Mercado Livre has a reviews API) cover
few grocery items. Revisit after the rest works.

## 11. Open Questions

- **Which state and city** the family shops in. It decides whether a state price service exists
  (section 9).
- **Which stores** the family uses, and which clubs or apps they have joined (section 4).
- **Which phones** the app must run on. Chrome on Android reads barcodes with the built-in
  `BarcodeDetector`; Safari on iPhone does not, and needs a library such as ZXing.
- **Same Supabase project as the card tracker, or a new one.** The same project keeps the same
  accounts and family group with new tables; a new one keeps the apps fully apart and needs a
  second sign-in.
- **The app's name.**

## 12. Verify Before Building

- **OCR on real tags.** Eric photographs 20 to 30 tags across two or three stores; measure how
  often price, size, and kind come out right. This decides whether on-device OCR is enough.
- **Barcode reading** on both family phones.
- **Cosmos:** free tier limits, terms, and whether its average price is useful for the family's
  products.
- **Open Food Facts coverage:** look up 20 EANs from the family's pantry.
- **The family's state:** NFC-e page format, captcha, and whether a state price service has an
  API.

## 13. Suggested Build Order

1. **Calculator:** typed products, unit price, compare. Usable at the supermarket the first week.
2. **Tag photo with OCR**, the confirm screen, and barcode identity.
3. **Saved prices:** stores, history, went up or down, sync and sign-in.
4. **Shared shopping list** with the estimate.
5. **Receipt scanning** (NFC-e).
6. **An outside price source**, once section 12 picks one.
7. **Family ratings**, then internet ratings if a source turns up.
