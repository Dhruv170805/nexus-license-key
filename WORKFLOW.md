# Workflow Documentation: Nexus Forge

This document describes the standard development and operational workflows for Nexus Forge.

## 💻 Development Workflow

### 1. Feature Development
- Create a new branch from `main`: `git checkout -b feature/your-feature-name`.
- Use `npm start` to test changes locally.
- Standalone mode uses `forge-server.js` and `clients.json`.

### 2. Testing
- Verify license generation via the local dashboard (`http://localhost:5099`).
- Use the `LicenseUtils` to verify that generated licenses are valid and correctly bound to the hardware signature.
- **Note:** The verification engine uses canonical stringification. If testing manually, ensure keys are sorted or use `LicenseUtils.canonicalStringify()`.

### 3. Code Review & Integration
- Push branch to origin and create a Pull Request.
- Ensure all code follows existing patterns (e.g., using `LicenseUtils` for crypto operations).
- **Never commit `node_modules`, `.env`, or `.pem` keys.** These are ignored via `.gitignore`.
- Merge to `main` after approval.

## 🔑 License Issuance Workflow

The primary purpose of Nexus Forge is to issue licenses to clients. Follow this process:

### Step 1: Obtain Hardware Signature
The client application must use `LicenseUtils.getDeviceId()` on the target machine to generate a unique Hardware ID (HID).

### Step 2: Generation
1. Access the production Nexus Forge instance.
2. Enter the Client Name and the Hardware ID obtained in Step 1.
3. Define the license parameters (Start Date, Expiry, Features).
4. Click **Generate**.

### Step 3: Distribution
1. Download the generated `license.dat` file.
2. Securely deliver the file to the client.
3. The client places `license.dat` in the root of their application directory.

### Step 4: Verification
The client application uses `LicenseUtils.getLocalLicense()` at startup to:
1. Verify the digital signature against the Public Key.
2. Confirm the Hardware ID matches the current machine.
3. Validate that the current date is within the license window.

## 🌍 Cloud Deployment Workflow

When deploying to Vercel:
1. Ensure `vercel.json` is configured to route all `/api/*` and `/` requests to `api/index.js`.
2. Verify that MongoDB Atlas IP Access List includes Vercel's deployment IP ranges (or allow all `0.0.0.0/0` if necessary).
3. Confirm `PRIVATE_KEY` in Vercel settings contains the full PEM content with `\n` characters.
