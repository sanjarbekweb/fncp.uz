# Financopedia (fncp.uz)

> The premier event management and statistics platform.

Exact replica of [fncp.uz](https://fncp.uz/), copied down to the last asset, route, stylesheet, web font, and script detail.

---

## Overview

Financopedia is an event management and statistics web application connecting organizers, participants, camps, and partners with real-time leaderboards, referral tracking, and event monitoring.

### Key Capabilities & Pages

- **Public Landing Page** (`/`): Dynamic hero section, featured events, statistics counters, institutional sponsors (Central Bank of Uzbekistan, TuronBank, TDIU, Ustoz AI, Finlit, Westminster).
- **Archive** (`/archive`): Past events and historical activity records.
- **Team** (`/team`): Organization structure, leadership, and team profiles.
- **Top List** (`/top-list`): Performance rankings and statistics.
- **Authentication & Onboarding**:
  - `/login` — Secure participant/organizer sign-in.
  - `/register` — Account registration with Telegram bot verification linkage.
  - `/forgot-password` & `/reset-password` — Password recovery workflow.
- **Camp & Event Exploration**:
  - `/camps`, `/camps/:id`, `/camps/:id/leaderboard`, `/camps/:id/team/:teamId`
  - `/events`, `/events/:id`, `/events/create`, `/events/edit/:id`
- **Dashboard & Roles**:
  - `/dashboard`, `/leaderboard`, `/referral`, `/referral-stats`, `/my-qr`, `/scan-qr`
  - `/roles`, `/roles/create`, `/roles/edit/:id`
- **Legal & Compliance**:
  - `/privacy-policy` & `/terms-of-service`
- **Backend API Integration**:
  - Communicates directly with the Financopedia API endpoint (`https://api.fncp.uz`).

---

## Project Structure

```text
fncp.uz/
├── assets/
│   ├── fa-brands-400-*.woff2        # FontAwesome Brands webfont
│   ├── fa-regular-400-*.woff2       # FontAwesome Regular webfont
│   ├── fa-solid-900-*.woff2         # FontAwesome Solid webfont
│   ├── index-Dg23-Yg1.js            # Compiled application SPA bundle
│   ├── index-NUmzW8Nl.css           # Compiled styling & typography bundle
│   ├── Finlit--3pt-a9H.svg          # Partner logo
│   ├── MarkaziyBank-BAkkpOgW.png    # Central Bank of Uzbekistan logo
│   ├── OzbGerb-BDsQam2q.png         # State Emblem of Uzbekistan
│   ├── TDIU-CXPa2xTE.png            # TDIU University logo
│   ├── TuronBank-B6YCjzBh.png       # Turon Bank logo
│   ├── UstozAI-B86PJAEu.svg         # Ustoz AI logo
│   ├── WEST-Mcc15AEb.svg            # Westminster University logo
│   ├── us-8TV7KmXO.svg              # Flag vector asset
│   ├── logo-colored-*.png           # Colored Financopedia brand logo
│   ├── logo-white-*.png             # White Financopedia brand logo
│   └── images/branding/             # Brand identity aliases
├── test/
│   └── server.test.js               # Node.js automated test suite
├── bird.svg                         # Decorative illustration asset
├── default-avatar.png               # Fallback profile avatar
├── favicon.ico                      # Multi-resolution favicon icon
├── index.html                       # HTML5 entrypoint with OpenGraph & Schema.org LD-JSON
├── nginx.conf                       # Production Nginx reverse-proxy / SPA configuration
├── Dockerfile                       # Multi-stage Alpine container build
├── .dockerignore                    # Docker build exclusions
├── .gitignore                       # Git exclusions
├── package.json                     # NPM scripts and project metadata
├── server.js                        # Zero-dependency local Node.js SPA server with Gzip
├── vite.config.js                   # Vite configuration for dev/preview
├── robots.txt                       # Search engine crawler policies
└── sitemap.xml                      # XML Sitemap with page priorities
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (tested on v24.x)
- Optional: [Docker](https://www.docker.com/) for container deployment

### Running Locally

Run with the zero-dependency Node server:

```bash
# Start server (default: http://localhost:3000)
npm start

# Or with custom port
PORT=8080 npm start
```

Or using Vite:

```bash
npx vite
```

### Running Tests

Run the built-in Node.js test suite covering all routes, assets, MIME types, gzip compression, and SPA fallbacks:

```bash
npm test
```

### Docker Deployment

Build and run the containerized Nginx instance:

```bash
# Build the Docker image
docker build -t fncp-uz .

# Run the container on port 8080
docker run -d -p 8080:80 --name fncp-uz fncp-uz
```

---

## Deployment Options

### Nginx (Bare Metal / VPS)

Use the provided [nginx.conf](file:///d:/gitprojects/fncp.uz/nginx.conf) to serve the static assets with `try_files $uri $uri/ /index.html;` to ensure client-side routing works smoothly.

### Cloudflare Pages / Vercel / Netlify

This repository is ready for direct static deployment:
- **Build command**: *(none needed / static)*
- **Output directory**: `.`
- **SPA Fallback**: Enabled by default with root `index.html`.