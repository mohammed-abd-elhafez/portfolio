# Mohamed Abd Elhafez: portfolio

Static site. Deploy the folder as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages (root of a domain, since inner pages use absolute paths).

## Updating GitHub projects

The Work section is rendered from `data/projects.json`. To add a future project, append an object with:

```json
{
  "title": "Project name",
  "description": "One concise description.",
  "stack": ["HTML", "CSS", "JavaScript"],
  "url": "https://github.com/username/repository",
  "liveUrl": "https://username.github.io/repository/",
  "image": "https://raw.githubusercontent.com/username/repository/main/preview.jpg"
}
```

The Upwork buttons point to Mohamed's public profile and are configured in `index.html` under `CONFIG.upwork`. The contact form sends enquiries to `Abdelmohammed348@gmail.com` through FormSubmit; the first submission may require confirming the activation email. WhatsApp is configured in `CONFIG.whatsapp` with the international number `201034605431`.

## Before going live
0. **Domain:** run `sh set-domain.sh yourdomain.com` once. It fills in canonical tags, the sitemap and robots.txt (they stay inactive until then so nothing invalid ships).
1. **Fonts:** run `sh assets/fonts/get-fonts.sh` once (needs internet). It downloads the WOFF2 files and writes `assets/css/fonts.css`. Until then the site uses fallback fonts and makes no failing requests.
2. **Edit `CONFIG`** at the top of the `<script>` in `index.html`: email, Upwork URL, form endpoint, response time, stats, reviews.
3. **Replace every `[PLACEHOLDER]`** (search the folder for `[`): `[YOUR-DOMAIN]`, `[EMAIL]`, `[LEGAL NAME / TRADING NAME]`, `[EDITABLE: ...]`, `[REAL PROJECT DATA REQUIRED]`.
4. **Photo:** already added (`assets/img/mohamed.webp`). To change it, replace that file (800x1000) and its 400px copy.
5. **Case studies:** duplicate `case-studies/example-project.html` per real project and add it to `sitemap.xml` and `search-index.json`.
6. **Legal pages** are templates, not legal advice. Have them reviewed.
7. In `_headers`, replace `[YOUR-FORM-ENDPOINT-ORIGIN]` with your form provider's origin.

## Performance notes
- CSS is inline; the hero heading is plain text so it paints immediately. The 0.7s preloader runs once per session.
- GSAP, Lenis and Three.js load only after the first interaction (or 4 seconds), never during the initial load. Phones, Save-Data and reduced-motion get the static gradient hero.
- If you change the form provider, update `connect-src` in `_headers`.
