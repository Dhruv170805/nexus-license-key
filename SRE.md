# SRE Documentation: Nexus Forge

This document outlines the Site Reliability Engineering (SRE) practices and operational guidelines for the Nexus Forge license management system.

## 📈 Service Level Objectives (SLOs)

- **Availability:** 99.9% uptime for the license generation API.
- **Latency:** 95% of license generation requests should complete under 200ms.
- **Data Integrity:** Zero tolerance for unauthorized license modifications or database corruption. Uses canonical JSON stringification to ensure cryptographic consistency.

## 🛠 Infrastructure & Deployment

### Environment Strategies
- **Development:** Local execution via `forge-server.js` using `clients.json`. Configurable via `PRIVATE_KEY_PATH` and `CLIENTS_FILE_PATH`.
- **Production:** Serverless deployment on Vercel using MongoDB Atlas.

### Deployment Pipeline
1. **Validation:** Linting and local testing. Ensure `public.pem` matches `private.pem`.
2. **Staging:** Deployment to a Vercel preview branch.
3. **Production:** Merging to `main` triggers automatic deployment to Vercel production.

## 🛡 Security Operations

### Secret Management
- **Private Keys:** Stored in Vercel Environment Variables (`PRIVATE_KEY`) or at `PRIVATE_KEY_PATH`. Never log or print the private key.
- **Database Credentials:** Managed via `MONGODB_URI` environment variable.

### Access Control
- The Forge UI should be protected by an authentication layer (e.g., Vercel Authentication or a custom middleware) in production environments to prevent unauthorized license generation.

## 🕵️ Monitoring & Observability

- **Logs:** Vercel Runtime Logs for tracking API requests and errors.
- **Database:** MongoDB Atlas monitoring for connection counts, query performance, and storage metrics.
- **Alerting:** Configure Vercel alerts for deployment failures and high error rates.

## 🚑 Incident Response & DR

### Common Failure Modes
- **Atlas Connection Failure:** Check `MONGODB_URI` and IP allowlist in Atlas.
- **Missing Private Key:** Ensure `PRIVATE_KEY` is correctly set in Vercel with escaped newlines.
- **License Verification Failure:** Ensure the public key on the client application matches the private key on the forge server.

### Backup & Recovery
- **MongoDB Atlas:** Automated daily snapshots.
- **Local Mode:** Regular backups of `clients.json`.

## ⚙️ Scaling
The system is designed to be horizontally scalable via Vercel's serverless functions. MongoDB Atlas provides automated scaling for the database layer.
