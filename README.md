# 28to3.me — public product surface

Public landing page for **28to3.me**, the seller of **Actionscope**, **SophPDF Debloat**, and **Soph Explorer Debloat**. Stripe should match the business / seller name **28to3.me** (not Sofa Loaf).

**28to3.me is the public product surface for Sofa-Loaf ships.**

## Products

| Product | What it is | Price | Source |
| --- | --- | --- | --- |
| [Actionscope](https://github.com/Sofa-Loaf/actionscope) | GitHub Actions minute visibility. Private repos with **macOS or a wide Windows matrix** and surprise bills. Linux-only CI and enterprise Billing API shops are out of scope. | Free Action. **$49 Stripe booking fee** for a **Minute Teardown** (one org, one week). $19 App seats later. | Public: `Sofa-Loaf/actionscope` |
| [SophPDF Debloat](sophpdf.html) | Easy, lite PDF editor without the bloat. Everyday editing for office admins / older office workers: open, annotate, fill forms, sign, print. Same **Soph* Debloat** family as Soph Explorer Debloat. | **$29 one-time** when Stripe exists (stub/CTA only — do not invent a Payment Link). | [Sofa-Loaf/pdf-editor](https://github.com/Sofa-Loaf/pdf-editor) is **private**, so download may be limited. Landing files in that repo (`docs/landing`) are not a public URL yet. |
| [Soph Explorer Debloat](soph-explorer.html) | Free, lite, fast Windows file explorer — fast search, PDF preview by default — for office users who hate Explorer bloat. Same **Soph* Debloat** family as SophPDF Debloat. | **Free forever.** No Stripe. | Public: [Sofa-Loaf/soph-explorer](https://github.com/Sofa-Loaf/soph-explorer) |

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
| Sample Minute Teardown | `teardown-sample.html` |
| SophPDF Debloat | `sophpdf.html` |
| Soph Explorer Debloat | `soph-explorer.html` |
| About / brand origin | `about.html` |
| Privacy | `privacy.html` |
| Terms | `terms.html` |

If the first workflow run needs Pages enabled in the UI: **Settings → Pages → Source: GitHub Actions**.

## Support

- Support email on the site: `hello@28to3.me`

## Stripe

- Seller / business name on Stripe and this site: **28to3.me**
- Org pilot checkout: https://buy.stripe.com/8x2dRa7woa65dOA6uz0co00
- $49 is a **booking fee** for a Minute Teardown (one-week human artifact), not a software seat or App license
- SophPDF Debloat: **$29 one-time** when a Stripe Payment Link exists. Do not invent a link; the site uses a stub/email CTA until one is pasted in.
- Soph Explorer Debloat: **free forever**. Do not add Stripe.

## Local preview

Open `index.html` in a browser, or serve the repo root:

```bash
python3 -m http.server 8080
```
