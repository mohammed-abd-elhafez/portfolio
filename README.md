# Mohamed Abd Elhafez — portfolio

A static portfolio for Mohamed Abd Elhafez, populated from verified public GitHub projects and deployed to GitHub Pages.

## Live site

https://mohammed-abd-elhafez.github.io/portfolio/

## Run locally

Requires Node 18 or newer. No dependencies are required.

```bash
npm run build
npm run dev
```

The generated site is written to `dist/`.

## Structure

- `src/data/site.json` — identity, social links and GitHub Pages base path.
- `src/data/projects.json` — verified project summaries, stacks and repository/demo links.
- `src/pages/` — homepage, about page and 404 page.
- `src/templates/project.html` — case-study template.
- `scripts/build.mjs` — dependency-free static-site build with placeholder validation.
- `public/` — favicon, social image and robots file.
- `.github/workflows/pages.yml` — automated GitHub Pages deployment.

## Publishing

Pushes to `main` build `dist/` and deploy it through the GitHub Pages environment. The site uses `/portfolio/` as its base path because it is hosted from the `portfolio` project repository.
