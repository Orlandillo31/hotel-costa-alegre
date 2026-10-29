# Villas Cangrejo

Promotional website for Villas Cangrejo, a hotel with 16 villas in San Patricio-Melaque, Jalisco, developed as a university project.

The project started as a hotel website, grew into a full reservation system (customer accounts, administrator panel, reviews and accounting) and is now a lightweight promotional site: the hotel handles its reservations directly, so the website focuses on showing the villas and getting guests in touch by WhatsApp.

> The full reservation system is preserved in the git tag [`v2-con-panel`](../../tree/v2-con-panel).

## Features

- Villa information, prices per night and long-stay monthly rates
- Photo gallery with lightbox
- Reservation request form that opens WhatsApp with the message ready to send (no data stored on a server)
- Price estimate based on the selected dates
- Location section with nearby places
- Floating WhatsApp button
- Spanish and English interface
- SEO: descriptive title and meta tags, canonical URL, schema.org `Hotel` data, `robots.txt` and `sitemap.xml`
- Responsive interface

## Technologies Used

- HTML5, CSS3 and JavaScript
- Cloudflare Pages (hosting, HTTPS and CDN)
- HTTP security headers and Content Security Policy in `public/_headers`
- Node.js + Express (only to preview the site locally and run the tests)

## Project Structure

```text
hotel-costa-alegre/
├── public/          # The whole website (HTML, CSS, JavaScript, images, robots.txt, sitemap.xml, _headers)
├── server/          # Small Express server that mimics Cloudflare Pages locally
├── test/            # Automated tests (page, security headers, SEO)
├── package.json
└── README.md
```

## Deployment

The site is published on **Cloudflare Pages**, connected to this repository: every push to `main` is deployed automatically.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `public` |

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
