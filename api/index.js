const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const LicenseUtils = require('../src/utils/licenseUtils');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB Atlas Schema
const clientSchema = new mongoose.Schema({
    companyName: String,
    deviceId: String,
    validFrom: String,
    validTo: String,
    logoPath: String,
    mongoUrl: String,
    ipAddress: String,
    dns: String,
    subnet: String,
    features: [String],
    issuedAt: { type: Date, default: Date.now }
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
        console.error('ATLAS CONNECTION ERROR:', err);
    }
};

app.get('/api/clients', async (req, res) => {
    await connectDB();
    const clients = await Client.find().sort({ issuedAt: -1 });
    res.json(clients);
});

app.post('/api/forge', async (req, res) => {
    try {
        await connectDB();
        const { 
            companyName, deviceId, validFrom, validTo, 
            logoPath, mongoUrl, ipAddress, dns, subnet 
        } = req.body;

        const privateKey = process.env.PRIVATE_KEY ? 
            process.env.PRIVATE_KEY.replace(/\\n/g, '\n') : null;

        if (!privateKey) {
            return res.status(500).json({ message: 'PRIVATE_KEY environment variable is missing.' });
        }

        const licenseData = {
            companyName, deviceId, 
            validFrom, validTo,
            logoPath: logoPath || process.env.DEFAULT_LOGO_PATH || '/uploads/logo.png',
            mongoUrl: mongoUrl || process.env.DEFAULT_MONGO_URL || 'mongodb://localhost:27017/nexus',
            ipAddress: ipAddress || process.env.DEFAULT_IP_ADDRESS || '127.0.0.1',
            dns: dns || process.env.DEFAULT_DNS || '8.8.8.8',
            subnet: subnet || process.env.DEFAULT_SUBNET || '255.255.255.0',
            features: ["audio", "video", "weather"],
            issuedAt: new Date().toISOString()
        };

        const signed = LicenseUtils.signLicense(licenseData, privateKey);
        await Client.create(licenseData);
        res.json(signed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nexus | Cloud Manager</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root { 
                --bg: #f8fafc; 
                --card-bg: #ffffff;
                --accent: #2563eb; 
                --text-main: #0f172a;
                --text-muted: #475569;
                --border: #e2e8f0;
            }
            body { 
                background-color: var(--bg); 
                color: var(--text-main); 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                background-image: 
                    radial-gradient(at 0% 0%, #eff6ff 0%, transparent 50%),
                    radial-gradient(at 100% 100%, #f1f5f9 0%, transparent 50%);
            }
            .studio-card { 
                background: var(--card-bg);
                border: 1px solid var(--border);
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }
            .glass-panel { 
                background: #f1f5f9; 
                border: 1px solid var(--border); 
            }
            input { 
                background: #ffffff !important; 
                border: 1px solid #cbd5e1 !important; 
                color: var(--text-main) !important; 
                transition: all 0.2s ease; 
            }
            input:focus { 
                border-color: var(--accent) !important; 
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); 
                outline: none; 
            }
            .btn-blue { 
                background: var(--accent); 
                color: #ffffff; 
                transition: all 0.2s ease; 
                font-weight: 600;
            }
            .btn-blue:hover { opacity: 0.9; transform: translateY(-1px); }
            
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            .toggle-btn { transition: all 0.2s ease; }
            .active-tab { background: var(--accent); color: white; }
        </style>
    </head>
    <body class="min-h-screen p-6 lg:p-12">
        <div class="max-w-4xl mx-auto space-y-10 relative">
            <header class="text-center space-y-2">
                <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">
                    Cloud Infrastructure
                </div>
                <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 uppercase">Nexus Forge</h1>
                <p class="text-slate-500 font-medium">Enterprise license distribution powered by Atlas.</p>
            </header>

            <div class="flex justify-center">
                <div class="bg-white p-1 rounded-xl flex gap-1 items-center border border-slate-200 shadow-sm">
                    <button id="showForge" class="toggle-btn px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider active-tab">Create License</button>
                    <button id="showRegistry" class="toggle-btn px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600">Client List</button>
                </div>
            </div>

            <div class="relative">
                <div id="forgeView" class="studio-card p-10 rounded-3xl transition-all duration-500">
                    <h2 class="text-lg font-bold mb-8 text-slate-800 flex items-center gap-2">Create New Connection</h2>
                    <form id="forgeForm" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Client Name</label><input name="companyName" placeholder="Global Enterprises" class="w-full p-4 rounded-xl text-sm" required></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Device ID</label><input name="deviceId" placeholder="HWID-..." class="w-full p-4 rounded-xl text-sm font-mono" required></div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Logo URL</label><input name="logoPath" placeholder="/uploads/logo.png" class="w-full p-4 rounded-xl text-sm"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Database Link</label><input name="mongoUrl" placeholder="mongodb+srv://..." class="w-full p-4 rounded-xl text-sm"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Client IP</label><input name="ipAddress" placeholder="127.0.0.1" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">DNS Server</label><input name="dns" placeholder="8.8.8.8" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Network Mask</label><input name="subnet" placeholder="255.255.255.0" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                        </div>
                        <div class="glass-panel p-8 rounded-2xl space-y-6">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="space-y-2"><label class="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Start Date</label><input name="validFrom" type="datetime-local" class="w-full p-3 rounded-lg text-xs" id="vFrom"></div>
                                <div class="space-y-2"><label class="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Expiry Date</label><input name="validTo" type="datetime-local" class="w-full p-3 rounded-lg text-xs" id="vTo"></div>
                            </div>
                        </div>
                        <button type="submit" class="w-full btn-blue py-5 rounded-xl text-xs uppercase tracking-widest shadow-md">Generate License</button>
                    </form>
                </div>

                <div id="registryView" class="hidden studio-card p-10 rounded-3xl flex flex-col min-h-[600px]">
                    <div class="flex items-center justify-between mb-10">
                        <h2 class="text-lg font-bold text-slate-800">Atlas Registry</h2>
                        <div id="clientCount" class="px-4 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">0 ENTRIES</div>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6" id="clientList"></div>
                </div>
            </div>
        </div>

        <script>
            const showForgeBtn = document.getElementById('showForge');
            const showRegistryBtn = document.getElementById('showRegistry');
            const forgeView = document.getElementById('forgeView');
            const registryView = document.getElementById('registryView');

            const toggleView = (target) => {
                if (target === 'forge') {
                    showForgeBtn.classList.add('active-tab'); showForgeBtn.classList.remove('text-slate-500');
                    showRegistryBtn.classList.remove('active-tab'); showRegistryBtn.classList.add('text-slate-500');
                    registryView.classList.add('hidden'); forgeView.classList.remove('hidden');
                } else {
                    showRegistryBtn.classList.add('active-tab'); showRegistryBtn.classList.remove('text-slate-500');
                    showForgeBtn.classList.remove('active-tab'); showForgeBtn.classList.add('text-slate-500');
                    forgeView.classList.add('hidden'); registryView.classList.remove('hidden');
                    refreshClients();
                }
            };

            showForgeBtn.onclick = () => toggleView('forge');
            showRegistryBtn.onclick = () => toggleView('registry');
            document.getElementById('vFrom').value = new Date().toISOString().slice(0,16);
            document.getElementById('vTo').value = new Date(Date.now() + 31536000000).toISOString().slice(0,16);

            const refreshClients = async () => {
                const res = await fetch('/api/clients');
                const clients = await res.json();
                const container = document.getElementById('clientList');
                document.getElementById('clientCount').innerText = clients.length + ' ENTRIES';
                if (clients.length === 0) { container.innerHTML = '<p class="text-center text-slate-400 py-20 uppercase tracking-widest text-xs">Registry Empty</p>'; return; }

                container.innerHTML = clients.map(c => {
                    const statusClass = new Date(c.validTo) > new Date() ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100';
                    return \`
                        <div class="glass-panel p-8 rounded-2xl group mb-6 border border-slate-100 shadow-sm">
                            <div class="flex justify-between items-start mb-6">
                                <div class="space-y-1">
                                    <h3 class="text-lg font-bold text-slate-800">\${c.companyName}</h3>
                                    <p class="text-[10px] text-slate-400 font-mono tracking-widest">\${c.deviceId}</p>
                                </div>
                                <div class="px-3 py-1 rounded-full \${statusClass} border text-[9px] font-black uppercase tracking-widest">\${new Date(c.validTo) > new Date() ? 'Active' : 'Expired'}</div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-slate-200/50">
                                <div class="space-y-4">
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Network</p><div class="text-[10px] font-medium text-slate-600">\${c.ipAddress || '—'} • \${c.dns || '—'} • \${c.subnet || '—'}</div></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Database</p><p class="text-[10px] text-blue-600 font-mono truncate">\${c.mongoUrl || 'Default'}</p></div>
                                </div>
                                <div class="space-y-4">
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Logo</p><p class="text-[10px] text-slate-600 font-mono">\${c.logoPath || 'Default'}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Validity</p><p class="text-[10px] text-slate-600">\${new Date(c.validFrom).toLocaleDateString()} to \${new Date(c.validTo).toLocaleDateString()}</p></div>
                                </div>
                            </div>
                        </div>\`;
                }).join('');
            };

            document.getElementById('forgeForm').onsubmit = async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                btn.innerText = 'GENERATING...'; btn.disabled = true;
                try {
                    const data = Object.fromEntries(new FormData(e.target));
                    const res = await fetch('/api/forge', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
                    const signed = await res.json();
                    const blob = new Blob([JSON.stringify(signed, null, 2)], {type: 'application/json'});
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'license-' + data.companyName.toLowerCase().replace(/\\s+/g, '-') + '.dat'; a.click();
                    toggleView('registry');
                } catch (err) { alert('Error: ' + err.message); } finally { btn.innerText = 'Generate License'; btn.disabled = false; }
            };
            refreshClients();
        </script>
    </body>
    </html>
    `);
});

module.exports = app;
