const crypto = require('crypto');
const os = require('os');

/**
 * Utility for Hardware Binding and License Cryptography
 */
class LicenseUtils {
    /**
     * Generates a unique Device ID based on hardware signatures.
     * Uses Hostname, MAC Addresses, and CPU architecture.
     */
    static getDeviceId() {
        const networkInterfaces = os.networkInterfaces();
        const macs = Object.values(networkInterfaces)
            .flat()
            .filter(details => details && details.mac && details.mac !== '00:00:00:00:00:00')
            .map(details => details.mac)
            .sort()
            .join(',');

        const systemInfo = [
            os.hostname(),
            macs,
            os.arch(),
            os.cpus().map(cpu => cpu.model).join('|')
        ].join('::');

        return crypto.createHash('sha256').update(systemInfo).digest('hex');
    }

    /**
     * Signs license data using a Private Key.
     * (Private Key should ONLY exist on the licensing server)
     */
    static signLicense(data, privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(this.canonicalStringify(data));
        sign.end();
        const signature = sign.sign(privateKey, 'hex');
        return { data, signature };
    }

    /**
     * Verifies a signed license file using a Public Key.
     */
    static verifyLicense(licenseObj, publicKey) {
        try {
            if (!licenseObj || !licenseObj.data || !licenseObj.signature) return false;
            const verify = crypto.createVerify('SHA256');
            verify.update(this.canonicalStringify(licenseObj.data));
            verify.end();
            return verify.verify(publicKey, licenseObj.signature, 'hex');
        } catch (err) {
            console.error('[License] Verification Error:', err.message);
            return false;
        }
    }

    /**
     * Helper to ensure deterministic JSON stringification by sorting keys.
     */
    static canonicalStringify(obj) {
        return JSON.stringify(this.sortObject(obj));
    }

    /**
     * Recursively sort object keys.
     */
    static sortObject(obj) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = this.sortObject(obj[key]);
            return acc;
        }, {});
    }

    /**
     * Full Validation: Signature + Device ID + Expiry
     */
    static validateFull(licenseObj, publicKey) {
        // 1. Check Signature
        if (!this.verifyLicense(licenseObj, publicKey)) {
            return { valid: false, message: 'CRITICAL: License file has been tampered with or corrupted.' };
        }

        const { data } = licenseObj;
        const currentDeviceId = this.getDeviceId();

        // 2. Check Device Binding
        if (data.deviceId !== currentDeviceId) {
            return { valid: false, message: 'UNAUTHORIZED: License is bound to a different hardware signature.' };
        }

        // 3. Check Expiry
        const now = new Date();
        const validTo = new Date(data.validTo);
        if (now > validTo) {
            return { valid: false, message: `EXPIRED: License expired on ${validTo.toLocaleDateString()}.` };
        }

        return { valid: true, data: data };
    }

    /**
     * Reads and verifies the local license file.
     * @param {string} customLicensePath - Optional override for license path
     * @param {string} customPublicKeyPath - Optional override for public key path
     */
    static getLocalLicense(customLicensePath, customPublicKeyPath) {
        const path = require('path');
        const fs = require('fs');

        const licensePath = customLicensePath || 
            process.env.LICENSE_PATH || 
            path.join(process.cwd(), 'license.dat');

        const publicKeyPath = customPublicKeyPath || 
            process.env.PUBLIC_KEY_PATH || 
            path.join(process.cwd(), 'keys/public.pem');

        if (!fs.existsSync(licensePath) || !fs.existsSync(publicKeyPath)) return null;

        try {
            const licenseObj = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
            const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
            const result = this.validateFull(licenseObj, publicKey);
            
            if (!result.valid) {
                console.error(`[License] Validation Failed: ${result.message}`);
                return null;
            }
            return result.data;
        } catch (err) {
            console.error('[License] Read Error:', err.message);
            return null;
        }
    }
}

module.exports = LicenseUtils;
