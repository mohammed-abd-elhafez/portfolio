# Mohamed Abd Elhafez — portfolio

Static portfolio site for [Mohamed Abd Elhafez](https://github.com/mohammed-abd-elhafez), deployed from this repository through GitHub Pages.

## Homepage

`index.html` follows the attached `MohamedAbdElhafez—SoftwareDeveloper.html` design: dark/light theme toggle, Three.js background scene, services, work cards, process, FAQ, and a mailto contact form. Project cards have a desktop spotlight/focus interaction with keyboard focus support.

Three.js is loaded only during idle time on capable desktop devices. It is skipped on mobile, coarse-pointer, Save-Data, reduced-motion, and low-memory/low-core devices; the render loop also pauses while the tab is hidden. Mobile cards and forms disable backdrop blur to reduce GPU work.

The Work cards are populated from the current public repositories in `data/projects.json`. The repository slugs are kept exact so every card opens the matching GitHub project.

## Current project data

The homepage currently includes the 11 public repositories on the GitHub profile at the time of the latest update:

- FitnessTracker
- m-pizza
- flutter-expense-tracker
- flutter-task-manager
- flutter-starter-architecture
- NEW-E-COMMERCE
- ELZERO-TEMPLATE-3
- the-first-project-2-11-2022
- casper-30-12-2022
- bootsrap-project
- e-commerce

When the GitHub account changes, update `data/projects.json` and the generated `WK` list in `index.html` while preserving the exact repository slugs.

## Contact configuration

The editable contact values are in the script inside `index.html`: email address, WhatsApp number, Upwork URL, response-time text, and Cairo timezone.

The legal pages are informational templates, not legal advice. Review them for the final business setup before relying on them.

## Local preview

Serve the repository root with any static server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Adding a project
Add one entry to `data/projects.json`; no code changes needed. A card appears automatically (if the repo is not already listed in `WK` in `index.html`) and the telescope preview works for it.
Fields: `title`, `url` (GitHub repo, https), `stack` (array), optional `liveUrl` (https://<user>.github.io/...), optional `image` (screenshot path, shown first).
Hovering a card fires the projector beam: screenshot first, then the live page with auto-scroll.
