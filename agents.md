# Euler Partners build rules
- PaperMod is the engine. Never write standalone DOCTYPE templates in layouts/.
- Override themes via baseof blocks (define "main"), never by replacing pages wholesale.
- CSS lives in assets/css/extended/ and is bundled automatically. Never hardcode asset URLs.
- No new CSS/JS without noting it in AGENTS.md's "Site wiring" section.

## Site wiring
- `assets/css/extended/homepage.css` — homepage styles, bundled automatically by PaperMod.
- `static/js/header.js` — header listener (show/hide on scroll) and hamburger nav toggle (shows the dropdown on small viewports, styles in `homepage.css` under the `max-width: 768px` block), loaded from `layouts/_partials/header.html`.
- `static/js/services.js` — services card stack (pinned stage, scroll-driven card travel, dwell before group exit), loaded from `layouts/index.html`. Fallback: per-card `position: sticky` in `homepage.css`. Also collapses each card's Deliverables list behind its `.service-deliverables-toggle` button below 768px (expanded by tapping; always expanded on desktop, where the chevron is hidden in `homepage.css`). Without JS all deliverables lists render expanded.
- `static/js/accordion.js` — reusable `accordion-section` component (exclusive open/close with animated panel height, first item open by default, and crossfade of an optional paired `.accordion-figure` photo), loaded from `layouts/index.html`. Not used by any current section; kept for reuse. Without JS all accordion panels render expanded and the first photo shows.

# General info
We are building static website. The homepage is critical, of course. It will describe the new consulting proposition of our two-person consultancy. We are inspired by the look and feel of cohere.com. There's a moderated boldness, a clarity, that invokes a feeling of trustworthiness. Good typography and white space. Well considered responsive design.

# About the company
Boutique management and technology consulting. Sector agnostic. A small number of services. No target clients at this juncture.

See /static/images/euler-logo.svg of the site we're building here for the brand logo. The logo contains the one and only colour we identify with, but open to having a secondary colour for the website. For all other style questions, look to cohere.com.
