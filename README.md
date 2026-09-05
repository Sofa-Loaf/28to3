# 28to3.me — Actionscope site

Public landing page for **28to3.me**, the seller of **Actionscope**. Stripe should match the business / seller name **28to3.me** (not Sofa Loaf).

**28to3.me sells Actionscope — GitHub Actions minute visibility.**

- Product: [Actionscope](https://github.com/Sofa-Loaf/actionscope)
- Install (GitHub org only): `uses: Sofa-Loaf/actionscope@v0.1.2`
- Latest release: https://github.com/Sofa-Loaf/actionscope/releases/latest

The GitHub org **Sofa-Loaf** appears only in repository URLs and the Action install snippet.

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
| Privacy | `privacy.html` |
| Terms | `terms.html` |

If the first workflow run needs Pages enabled in the UI: **Settings → Pages → Source: GitHub Actions**.

## Support

- Support email on the site: `hello@28to3.me`

## Stripe

- Seller / business name on Stripe and this site: **28to3.me**
- Org pilot checkout: https://buy.stripe.com/8x2dRa7woa65dOA6uz0co00

## Local preview

Open `index.html` in a browser, or serve the repo root:

```bash
python3 -m http.server 8080
```
