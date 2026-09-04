# Sofa Loaf — Actionscope site

Public landing page for **Sofa Loaf** and **Actionscope**. This repository is the company website Stripe can match to the business name.

- Product: [Actionscope](https://github.com/Sofa-Loaf/actionscope) — see where GitHub Actions minutes go
- Install: `uses: Sofa-Loaf/actionscope@v0.1.0`
- Latest release: https://github.com/Sofa-Loaf/actionscope/releases/latest

## URLs

| URL | Status |
| --- | --- |
| https://sofa-loaf.github.io/28to3/ | GitHub Pages (this repo) |
| https://28to3.me | Custom domain — **DNS / Cloudflare out of scope** (ops sets records separately) |

## Pages

GitHub Pages is deployed from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) (GitHub Actions). The site is static HTML/CSS plus a small copy-to-clipboard script. No password wall.

If the first workflow run needs Pages enabled in the UI: **Settings → Pages → Source: GitHub Actions**.

## Placeholders for John

- Support email on the site: `hello@sofaloaf.com`
- Org pilot checkout: `https://buy.stripe.com/test_placeholder_actionscope_org_pilot`

## Local preview

Open `index.html` in a browser, or serve the repo root:

```bash
python3 -m http.server 8080
```
