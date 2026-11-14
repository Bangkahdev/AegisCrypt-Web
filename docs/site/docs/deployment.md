---
sidebar_position: 9
slug: /deployment
title: "Deployment"
description: "How to build and deploy the AegisCrypt web app and documentation site to Cloudflare."
---

# Deployment

AegisCrypt Web and its documentation are served as static assets on Cloudflare Workers. There is no application backend processing user data.

## Deployment targets

| Site | Directory | URL | Worker | Tool |
| --- | --- | --- | --- | --- |
| Web app | `apps/web` | [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech) | `aegiscrypt-web` | `cf` CLI (`cloudflare.config.ts`) |
| Documentation | `docs/site` | [docs.aegiscrypt.bangkah.tech](https://docs.aegiscrypt.bangkah.tech) | `aegiscrypt-docs` | Wrangler (`wrangler.jsonc`) |

## Prerequisites

- Node.js and npm
- Appropriate Cloudflare access/authentication (account, domain/route, and permissions)
- Dependencies installed (`npm ci`/`npm install`) in the relevant directory

## Deploy the web app

Run from `apps/web`:

```bash
npm ci
npm run build
cf deploy
```

`cf deploy` uses `apps/web/cloudflare.config.ts` to build/upload assets according to the project configuration.

## Deploy the documentation

Run from `docs/site`:

```bash
npm ci
npm run build
npx wrangler deploy
```

Configuration is in `docs/site/wrangler.jsonc` (assets `./build`, custom domain `docs.aegiscrypt.bangkah.tech`).

## Pre-deploy validation

```bash
# App (from apps/web)
cf deploy --dry-run

# Docs (from docs/site)
npx wrangler deploy --dry-run
```

It is also recommended to run quality checks before release:

```bash
# apps/web
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

## Operational notes

- **Certificates/domain:** when adding a custom domain for the first time, HTTPS provisioning may take a short while.
- **Rollback:** use Cloudflare deployment history and/or Git commits to return to a previous version.
- **Cache/PWA:** after deployment, clients that previously opened the app may load an old app shell from cache until the service worker updates; instruct users to reload while online if needed.
- **Security headers:** the app and docs include static security headers (`_headers`) such as CSP, HSTS, and related policies per configuration.
- **Secrets:** do not store credentials in the repository; use platform-managed secrets/env.

## CI

The CI workflow in `.github/workflows/ci.yml` runs Web/Desktop checks (lint, typecheck, unit, e2e, audit, secret scan, SBOM, build) per current configuration. Production deployment is performed manually according to the project process.

## References

- [Cloudflare `cf` CLI](https://developers.cloudflare.com/cf/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Troubleshooting](/troubleshooting)
