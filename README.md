# Villas Cangrejo

Promotional website for Villas Cangrejo, a hotel with 16 villas in San Patricio-Melaque, Jalisco, developed as a university project.

The project started as a hotel website, grew into a full reservation system (customer accounts, administrator panel, reviews and accounting) and is now a lightweight promotional site: the hotel handles its reservations directly, so the website focuses on showing the villas and getting guests in touch by WhatsApp.

> The full reservation system is preserved in the git tag [`v2-con-panel`](../../tree/v2-con-panel).

## Pages

| Page | Content |
| --- | --- |
| `/` | Home: hero, amenities, links to every page, rates and call to action |
| `/villas` | What every villa includes, amenities, nightly and monthly rates, check-in/out |
| `/galeria` | Photo gallery with lightbox |
| `/ubicacion` | Address, nearby places and Google Maps link |
| `/contacto` | Reservation form that opens WhatsApp with the message ready to send, contact details and rates |
| `/aviso-privacidad` | Privacy notice |

## Features

- Minimal design inspired by [rulebase.co](https://rulebase.co), adapted to the hotel (sand, ocean ink and crab coral)
- Fonts: Geist, Geist Mono and Fraunces italic (Google Fonts)
- Smooth page transitions (View Transitions), scroll reveal and a statement that lights up word by word
- Skeleton loaders with a shimmer while photos download
- Price estimate based on the selected dates (no data stored on a server)
- Floating WhatsApp button
- Spanish and English: every translatable element carries its English text in a `data-en` attribute (`public/js/i18n.js`)
- SEO: a title, description and canonical URL per page, schema.org `Hotel` data, `robots.txt` and `sitemap.xml`
- Responsive interface with a full-screen mobile menu

## Technologies Used

- HTML5, CSS3 and JavaScript
- Cloudflare Workers static assets (hosting, HTTPS and CDN)
- HTTP security headers and Content Security Policy in `public/_headers`
- Node.js + Express (only to preview the site locally and run the tests)

## Project Structure

```text
hotel-costa-alegre/
├── public/          # The whole website (HTML, CSS, JavaScript, images, robots.txt, sitemap.xml, _headers)
├── server/          # Small Express server that mimics Cloudflare locally
├── test/            # Automated tests (page, security headers, SEO)
├── package.json
└── README.md
```

## Deployment

The site is published on **Cloudflare Workers** (static assets), connected to this repository: every push to `main` is deployed automatically.

The configuration is in `wrangler.jsonc`: it publishes the `public/` folder and shows `public/404.html` for pages that do not exist.

Security headers live in `public/_headers`. The local server reads the same file, so the tests check the headers that Cloudflare applies.

## Running Locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm start
```

The site runs on port `3000` by default. Run the tests with `npm test`.

## About the Project

This project is part of my work as a Teleinformatics Engineering student and has helped me practice frontend development, backend development, REST APIs, databases and web application security concepts.
