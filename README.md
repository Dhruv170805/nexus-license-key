# Nexus Forge

Nexus Forge is a standalone license generation and management tool designed to secure hardware-bound software deployments. It provides an intuitive interface for creating, signing, and tracking licenses with hardware signature verification.

## 🚀 Features

- **Hardware Binding:** Generates unique Device IDs based on hardware signatures (MAC, CPU, Hostname).
- **Secure Signing:** Uses SHA256 digital signatures to prevent license tampering.
- **Dual Mode Deployment:**
  - **Standalone:** Local Express server with file-based storage (`clients.json`).
  - **Cloud:** Vercel-ready API with MongoDB Atlas integration.
- **Web Dashboard:** Elegant UI built with Tailwind CSS for managing clients and generating licenses.
- **Validation Suite:** Built-in utilities for full license validation (signature, device ID, and expiry).

## 🛠 Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas (Cloud) / Local JSON (Standalone)
- **Styling:** Tailwind CSS
- **Cryptography:** Node.js `crypto` module
- **Deployment:** Vercel

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB Atlas account (for cloud mode)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhruv170805/nexus-licence-key.git
   cd nexus-licence-key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup Keys:
   Place your RSA private key in `keys/private.pem` for local development.

### Running Locally

```bash
npm start
```
The server will be available at `http://localhost:5099`.

### Cloud Deployment (Vercel)

1. Set environment variables in Vercel:
   - `MONGODB_URI`: Your MongoDB connection string.
   - `PRIVATE_KEY`: Your RSA private key (replace newlines with `\n`).

2. Deploy using the Vercel CLI or via GitHub integration.

## 🔑 License Generation Workflow

1. Open the Nexus Forge dashboard.
2. Enter Client Name and the target machine's **Device ID**.
3. Configure optional network parameters (IP, DNS, Subnet).
4. Set validity dates.
5. Click **Generate License File**.
6. Download the resulting `.dat` file and deploy it with your application.

## 🛡 Security Note

The `keys/private.pem` file is critical. It should NEVER be committed to source control in a production environment. Use environment variables for cloud deployments.
