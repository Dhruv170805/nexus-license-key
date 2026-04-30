# Nexus Forge

Nexus Forge is a standalone license generation and management tool designed to secure hardware-bound software deployments. It provides an intuitive interface for creating, signing, and tracking licenses with hardware signature verification.

## 🚀 Features

- **Deterministic Signatures:** Implements canonical JSON stringification (sorted keys) to ensure signature stability across different environments.
- **Environment Driven:** Fully configurable via environment variables (Paths, Ports, Default values).
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
- **Cryptography:** Node.js `crypto` module (SHA256 with RSA)
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

### Configuration (Environment Variables)

The system is highly configurable via `.env` or system environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Forge Server Port | `5099` |
| `PRIVATE_KEY_PATH` | Path to RSA private key | `keys/private.pem` |
| `PUBLIC_KEY_PATH` | Path to RSA public key | `keys/public.pem` |
| `LICENSE_PATH` | Path to `license.dat` | `license.dat` |
| `CLIENTS_FILE_PATH`| Path to `clients.json` | `clients.json` |
| `MONGODB_URI` | Atlas connection string | `—` |
| `DEFAULT_MONGO_URL`| Default client DB link | `mongodb://localhost:27017/nexus` |
| `DEFAULT_IP_ADDRESS`| Default client IP | `127.0.0.1` |

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
