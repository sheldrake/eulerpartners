# Euler Partners build rules
- PaperMod is the engine. Never write standalone DOCTYPE templates in layouts/.
- Override themes via baseof blocks (define "main"), never by replacing pages wholesale.
- CSS lives in assets/css/extended/ and is bundled automatically. Never hardcode asset URLs.
- No new CSS/JS without noting it in AGENTS.md's "Site wiring" section.
- Text widths are set in em/ch; layout widths are set in %/px; never let one masquerade as the other.

## Site wiring
- `assets/css/extended/homepage.css` — homepage styles, bundled automatically by PaperMod. Includes the `.section-intro` utility (muted `--text-medium` lead under a section heading: 60ch measure, centred with auto margins at ≥768px) used by the "Who We Are" and "Practice & Proof" intro paragraphs. At ≥768px all homepage section `h2`s (`.section-title`, `.proof-section`, `.partners-section`, `.terms-section`, `.contact-section`) are also centred, with their `::before` rule moved to `left: 50%; translateX(-50%)` so it stays centred with the text; the contact section's `.text-lead` is centred the same way (its `.contact-info` wrapper gets auto side margins).
- `assets/css/extended/homepage.css` also pins the scroll-to-top button (`#top-link`) to the bottom right at ≤900px, overriding PaperMod's `.list .top-link { transform: translateY(-5rem) }` lift in the theme's `zmedia.css` (bundled later, so the override wins).
- `assets/css/extended/homepage.css` — at ≤600px the hero text (`.hero-intro__text`) gets `min-height: calc(100dvh - var(--header-height) - var(--space-5xl))` with a `100vh` fallback, so the first viewport is filled by the hero copy on any phone: the subtitle is bottom-anchored via `margin-top: auto` (with `var(--space-xl)` breathing room below), and the CTA row (`.hero-intro__cta`, which carries the hero's bottom padding at all widths) starts 1px below the fold.
- `assets/css/extended/content-pages.css` — styles for content pages (`layouts/single.html`) and section indexes (`layouts/list.html`), reusing the homepage token palette. Also pins PaperMod's auto dark theme to light values (the site is light-only outside the hero). Bundled automatically by PaperMod.
- `static/js/header.js` — header listener (show/hide on scroll) and hamburger nav toggle (shows the dropdown on small viewports, styles in `homepage.css` under the `max-width: 768px` block), loaded from `layouts/_partials/header.html`.
- `static/js/services.js` — services card stack (pinned stage, scroll-driven card travel, dwell before group exit), loaded from `layouts/index.html`. Fallback: per-card `position: sticky` in `homepage.css`. Also collapses each card's Deliverables list behind its `.service-deliverables-toggle` button below 768px (expanded by tapping; always expanded on desktop, where the chevron is hidden in `homepage.css`). Without JS all deliverables lists render expanded.
- `static/js/accordion.js` — reusable `accordion-section` component (exclusive open/close with animated panel height, first item open by default, and crossfade of an optional paired `.accordion-figure` photo), loaded from `layouts/index.html`. Not used by any current section; kept for reuse. Without JS all accordion panels render expanded and the first photo shows.
- `static/js/hero-organism.js` — canvas animation for the `.hero-intro` visual (`#hero-organism`), a single always-dark palette (the hero shell is a fixed dark section; the rest of the page is light-only) with a `prefers-reduced-motion` fallback, loaded from `layouts/index.html`. Without JS the canvas stays empty.

# General info
A static website. The homepage is critical, of course. It describes the new consulting proposition of our two-person consultancy. We are inspired by the look and feel of cohere.com. There's a moderated boldness, a clarity, that invokes a feeling of trustworthiness. Good typography and white space. Well considered responsive design.

# About the company
Boutique management and technology consulting. Sector agnostic. A small number of services. No target clients at this juncture.
