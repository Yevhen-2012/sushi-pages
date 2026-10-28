# Sushi — GitHub Pages

Static migration of https://sushi-7096b4.webflow.io/ using the owner's Webflow ZIP and CMS CSV exports.

- Original exported layout, responsive styles, local fonts and animations.
- Six main pages, 15 menu items, and four published blog articles.
- Draft and archived CMS records are excluded. `content/cms.json` records the published content used by the HTML pages.
- Images, jQuery, GSAP, Flip and the custom navigation script are hosted locally.
- Reservation submissions are disabled at the owner's request. The page shows phone and email alternatives. No reservation is sent or stored.

## Hosting

GitHub Pages publishes the `main` branch from `/`. `.nojekyll` keeps the export unchanged. No build or Node.js runtime is required for hosting. Links are relative and support the `/sushi-pages/` project prefix.

## Verification

Run `node scripts/validate-site.mjs` and `node --check js/sushi.js`.

## Source and updates

The original ZIP and full CSV exports remain local and are excluded from Git. `scripts/migrate-webflow.mjs` is the one-time migration helper. It reads the extracted ZIP in `.migration/export/`, the CSV data converted to `.migration/cms-source.json`, and the original published-page snapshots in `.migration/`. It filters draft/archived records before generating HTML. These local inputs are not needed to serve the published site.

Content is static after migration. Editing `content/cms.json` alone does not update the HTML; update the corresponding HTML or regenerate it from the migration inputs.
