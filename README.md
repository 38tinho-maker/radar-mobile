# Radar Mobile

Check your **Hyperliquid** positions on your phone, with the same TP/SL bar as **Radar Gráfico** (Chrome extension).

**Read-only:** the page only queries Hyperliquid's public API for the address you enter. It never asks for a private key and never sends orders.

➡️ **Open:** https://38tinho-maker.github.io/radar-mobile/

*The app interface is in Portuguese (Brazil).*

## What it shows

- **Account summary:** account value, open PNL and margin used. The margin bar is green up to 70%, orange up to 90% and red above that.
- **Position cards:**
  - Current result (PNL and ROE).
  - TP/SL bar with partial take-profits and the value of each one (filled TPs are marked).
  - How far the price has moved since entry, with the high and low taken from Hyperliquid candles.
- **Sorting** by PNL, market, size, liquidation, margin or funding.
- **Details (tap a card):** outcome if the SL or all TPs are hit, average R/R, and a reminder to move the SL to entry after a TP fills.
- **Tabs:** open orders and trade history (7, 30 or 90 days).
- **Linked pattern (optional):** import the `radar-backup-ultimo.json` file from Radar Gráfico under **Ajustes** (Settings).

## Privacy

- Nothing comes prefilled. Your wallet address is stored **only on your phone** (localStorage).
- This repository contains only the page's code, with no personal data.
- From the backup file, the page keeps only the linked patterns (name, timeframe and source).

## Install on your phone

- **Android (Chrome):** open the link → **⋮** menu → **Add to Home screen**.
- **iPhone (Safari):** open the link → **Share** → **Add to Home Screen**.

Then open it from the icon, enter your address (0x…) and tap **Ver posições** (View positions).

---

Not investment advice. Data comes from Hyperliquid's public API and may be delayed by a few seconds.
