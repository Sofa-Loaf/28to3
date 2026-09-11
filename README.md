# 28to3.me — public product surface

Public landing page for **28to3.me**, the seller of **Actionscope**, **Afterglow**, **SophPDF Debloat**, and **Soph Explorer Debloat**. Stripe should match the business / seller name **28to3.me** (not Sofa Loaf).

**28to3.me is the public product surface for Sofa-Loaf ships.**

## Products

| Product | What it is | Price | Source |
| --- | --- | --- | --- |
| [Actionscope](https://github.com/Sofa-Loaf/actionscope) | GitHub Actions minute visibility. Private repos with **macOS or a wide Windows matrix** and surprise bills. Linux-only CI and enterprise Billing API shops are out of scope. | Free Action. **$49 Stripe booking fee** for a **Minute Teardown** (one org, one week). $19 App seats later. | Public: `Sofa-Loaf/actionscope` |
| [SophPDF Debloat](sophpdf.html) | Easy, lite PDF editor without the bloat. Everyday editing for office admins / older office workers: open, annotate, fill forms, sign, print. Same **Soph* Debloat** family as Soph Explorer Debloat. Web demo: [apps/sophpdf-demo.html](apps/sophpdf-demo.html). Screenshots: `apps/assets/sophpdf/`. Twitter handoff: `apps/assets/social/twitter-sophpdf-1.png`. | **$4.99 one-time**. Payment Link: https://buy.stripe.com/fZu7sMaIAced6m84mr0co02. Success URL: https://28to3.me/apps/thanks-sophpdf.html | Source [Sofa-Loaf/pdf-editor](https://github.com/Sofa-Loaf/pdf-editor) is **private**. Public Windows installer: [Sofa-Loaf/sophpdf-downloads/releases/latest](https://github.com/Sofa-Loaf/sophpdf-downloads/releases/latest) (tag v0.1.0 when assets land). |
| [Soph Explorer Debloat](soph-explorer.html) | Free, lite, fast Windows file explorer — fast search, PDF preview by default — for office users who hate Explorer bloat. Same **Soph* Debloat** family as SophPDF Debloat. Web demo: [apps/soph-explorer-demo.html](apps/soph-explorer-demo.html). Screenshots: `apps/assets/soph-explorer/`. Twitter handoff: `apps/assets/social/twitter-soph-explorer-1.png`. | **Free forever.** No Stripe. Windows installer on [GitHub Releases](https://github.com/Sofa-Loaf/soph-explorer/releases/latest) (tag [v0.1.0](https://github.com/Sofa-Loaf/soph-explorer/releases/tag/v0.1.0)). | Public: [Sofa-Loaf/soph-explorer](https://github.com/Sofa-Loaf/soph-explorer) |
| [Afterglow](apps/afterglow.html) | GPS trigger. Precise pin. Listen radius **~50ft / 15m**. Residue ranked by plays — never rate the place. Not reviews. Tagline: *Whispers left where you stood.* Near-black brand. Privacy: [apps/afterglow.html#privacy](apps/afterglow.html#privacy). **Android / Play first; iOS later.** Web prototype: [apps/afterglow-demo.html](apps/afterglow-demo.html). Assets: `apps/assets/afterglow/`. | **Free.** No Stripe. | Public: [Sofa-Loaf/afterglow](https://github.com/Sofa-Loaf/afterglow) |
| [Billshot](apps/billshot.html) | Free client-side GitHub Actions usage / billing explainer. Paste a usage report (or drop a screenshot and type the minutes). Explains minute rounding (12s still bills 1 min), Linux 1× / Windows 2× / macOS 10×, and what likely drove the bill. | **Free.** No Stripe. | Public: [Sofa-Loaf/billshot](https://github.com/Sofa-Loaf/billshot). Live path: `apps/billshot.html` |
| [Minute Cheat Sheet](apps/minute-cheat-sheet.html) | One-page PDF (+ print-friendly HTML) of Actions minute quirks: 12s still bills 1 rounded minute; Linux 1× / Windows 2× / macOS 10×; Job Summary columns; pin `@v0.1.3`. | **$0.99 one-time**. Stripe product name: **Minute Cheat Sheet — $0.99**. | This repo: `apps/minute-cheat-sheet.html`, `apps/minute-cheat-sheet.pdf`, `apps/thanks-cheat-sheet.html` |

- Install Actionscope (GitHub org only): `uses: Sofa-Loaf/actionscope@v0.1.3`
- Latest Actionscope release: https://github.com/Sofa-Loaf/actionscope/releases/latest
- Org pilot: **$49 Stripe booking fee** for a **Minute Teardown** — one org, one week, one artifact (“these workflows/jobs/OSes ate the minutes; here’s what to change”). Sample: [teardown-sample.html](teardown-sample.html)

The GitHub org **Sofa-Loaf** appears only in repository URLs and the Action install snippet.

## About / brand origin

**Named after the greatest sports comeback. Coming back from 0.**

28to3.me is named for **28–3** — Super Bowl LI. The name is that score. The shop is a start-over (rebuild after a wipe), not a claim that the website is the greatest comeback. Short copy lives on the homepage `#about` section and [about.html](about.html).

## URLs

| URL | Status |
| --- | --- |
| https://sofa-loaf.github.io/28to3/ | GitHub Pages (this repo) |
| https://28to3.me | Custom domain — **DNS / Cloudflare out of scope** (ops sets records separately) |

## Pages

GitHub Pages is deployed from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) (GitHub Actions). The site is static HTML/CSS plus a small copy-to-clipboard script. No password wall.

| Page | Path |
| --- | --- |
| Home | `index.html` |
| Job Summary demo | `demo.html` |
| Billshot | `apps/billshot.html` |
| Minutes calculator | `apps/minutes-calculator.html` |
| Minute Cheat Sheet | `apps/minute-cheat-sheet.html` |
| Minute Cheat Sheet (print) | `apps/minute-cheat-sheet-print.html` |
| Minute Cheat Sheet PDF | `apps/minute-cheat-sheet.pdf` |
| Minute Cheat Sheet thanks / success URL | `apps/thanks-cheat-sheet.html` |
| Demo canvas | `apps/canvas.html` |
| Jass Boxing | `apps/jass-boxing.html` |
| Sample Minute Teardown | `teardown-sample.html` |
| SophPDF Debloat | `sophpdf.html` |
| SophPDF Debloat web demo | `apps/sophpdf-demo.html` |
| SophPDF Debloat screenshots | `apps/assets/sophpdf/` |
| SophPDF Debloat thanks / success URL | `apps/thanks-sophpdf.html` |
| Soph Explorer Debloat | `soph-explorer.html` |
| Soph Explorer Debloat web demo | `apps/soph-explorer-demo.html` |
| Soph Explorer Debloat screenshots | `apps/assets/soph-explorer/` |
| Soph* Debloat Twitter handoff (1200×675 / 1600×900) | `apps/assets/social/` |
| Afterglow | `apps/afterglow.html` |
| Afterglow web prototype | `apps/afterglow-demo.html` |
| Afterglow brand assets | `apps/assets/afterglow/` |
| About / brand origin | `about.html` |
| Privacy | `privacy.html` |
| Terms | `terms.html` |

Soph* Debloat PNGs are Chrome captures of the web demos (`?shot=editor`, `annotate`, `preview`, `search`, `twitter`). They match the interactive chrome — not stock photos. Regenerate by serving the repo root and screenshoting those query strings at 1440×900 (product) or 1600×900 (Twitter).

If the first workflow run needs Pages enabled in the UI: **Settings → Pages → Source: GitHub Actions**.

## Support

- Support email on the site: `hello@28to3.me`

## Stripe

- Seller / business name on Stripe and this site: **28to3.me**
- Org pilot checkout: https://buy.stripe.com/8x2dRa7woa65dOA6uz0co00
- $49 is a **booking fee** for a Minute Teardown (one-week human artifact), not a software seat or App license
- SophPDF Debloat: **$4.99 one-time**. Payment Link: https://buy.stripe.com/fZu7sMaIAced6m84mr0co02. Success URL: https://28to3.me/apps/thanks-sophpdf.html. Windows installer: https://github.com/Sofa-Loaf/sophpdf-downloads/releases/latest
- Soph Explorer Debloat: **free forever**. Do not add Stripe. Windows installer: https://github.com/Sofa-Loaf/soph-explorer/releases/latest
- Afterglow: **free**. Do not add Stripe.
- Billshot: **free**. Do not add Stripe. Client-side usage-report explainer only.
- Minute Cheat Sheet: **$0.99 one-time**. Stripe product name: **Minute Cheat Sheet — $0.99**. Payment Link: https://buy.stripe.com/28E28s03W7XXh0MbOT0co01. Success URL: https://28to3.me/apps/thanks-cheat-sheet.html

## Local preview

Open `index.html` in a browser, or serve the repo root:

```bash
python3 -m http.server 8080
```
