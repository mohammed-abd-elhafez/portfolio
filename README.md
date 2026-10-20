# Mohamed Abd Elhafez — portfolio

Static portfolio site for [Mohamed Abd Elhafez](https://github.com/mohammed-abd-elhafez), deployed from this repository through GitHub Pages.

## What is included

- Responsive landing page with light/dark theme support.
- Current snapshot of the 11 public repositories on the GitHub profile, sourced from the account on 2026-10-20.
- Local, optimized project preview assets so the site does not depend on external image hosts.
- Case studies for the selected web and Flutter projects.
- Accessible contact form with validation, FormSubmit delivery, email fallback, and privacy links.
- SEO metadata, JSON-LD, valid sitemap, robots rules, manifest, and static security headers.

## Updating projects

The Work section is rendered from `data/projects.json`. Each entry contains the repository URL and may include a live demo, case study URL, local preview image, description, and stack. Keep descriptions factual and do not add fabricated metrics or testimonials.

When the GitHub account changes, update the snapshot from the public repository metadata and keep the repository count in `index.html` synchronized with the data file.

## Contact configuration

The editable configuration is near the top of the script in `index.html`:

- `email` — contact address.
- `whatsapp` — international phone number used by the WhatsApp CTA.
- `upwork` — public Upwork profile URL.
- `endpoint` — FormSubmit AJAX endpoint.
- `responseTime` and `tz` — availability copy and Cairo timezone.

The legal pages are informational templates, not legal advice. Review them for the final business setup before relying on them.

## Local preview

Because this is a static site, serve the repository root with any static server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.
