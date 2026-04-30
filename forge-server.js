const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const LicenseUtils = require('./src/utils/licenseUtils');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5099;
const CLIENTS_FILE = process.env.CLIENTS_FILE_PATH || path.join(__dirname, 'clients.json');
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || path.join(__dirname, 'keys/private.pem');

const getClients = () => {
    if (!fs.existsSync(CLIENTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
    } catch (e) { return []; }
};

const saveClients = (clients) => {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
};

app.get('/api/clients', (req, res) => {
    res.json(getClients());
});

app.post('/api/forge', (req, res) => {
    try {
        const {
            companyName, deviceId, validFrom, validTo,
            logoPath, mongoUrl, ipAddress, dns, subnet
        } = req.body;

        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

        const licenseData = {
            companyName, deviceId,
            validFrom, validTo,
            logoPath: logoPath || process.env.DEFAULT_LOGO_PATH || '/uploads/logo.png',
            mongoUrl: mongoUrl || process.env.DEFAULT_MONGO_URL || 'mongodb://localhost:27017/nexus',
            ipAddress: ipAddress || process.env.DEFAULT_IP_ADDRESS || '127.0.0.1',
            dns: dns || process.env.DEFAULT_DNS || '8.8.8.8',
            subnet: subnet || process.env.DEFAULT_SUBNET || '255.255.255.0',
            issuedAt: new Date().toISOString()
        };

        const signed = LicenseUtils.signLicense(licenseData, privateKey);
        const clients = getClients();
        clients.unshift({ ...licenseData, id: Date.now(), isActive: true });
        saveClients(clients);
        res.json(signed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/clients/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

        const licenseData = {
            companyName: updateData.companyName,
            deviceId: updateData.deviceId,
            validFrom: updateData.validFrom,
            validTo: updateData.validTo,
            logoPath: updateData.logoPath,
            mongoUrl: updateData.mongoUrl,
            ipAddress: updateData.ipAddress,
            dns: updateData.dns,
            subnet: updateData.subnet,
            issuedAt: new Date().toISOString()
        };

        const signed = LicenseUtils.signLicense(licenseData, privateKey);
        const clients = getClients();
        const index = clients.findIndex(c => c.id == id);
        if (index !== -1) {
            clients[index] = { ...licenseData, id: Number(id), isActive: updateData.isActive !== undefined ? updateData.isActive : true };
            saveClients(clients);
        }
        res.json(signed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/clients/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const clients = getClients();
        const index = clients.findIndex(c => c.id == id);
        if (index !== -1) {
            clients[index].isActive = isActive;
            saveClients(clients);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/clients/:id/extend', (req, res) => {
    try {
        const { id } = req.params;
        const { months } = req.body;
        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
        
        const clients = getClients();
        const index = clients.findIndex(c => c.id == id);
        if (index === -1) return res.status(404).json({ message: 'Client not found' });

        const client = clients[index];
        const newValidTo = new Date(client.validTo);
        newValidTo.setMonth(newValidTo.getMonth() + months);

        const licenseData = {
            companyName: client.companyName,
            deviceId: client.deviceId,
            validFrom: client.validFrom,
            validTo: newValidTo.toISOString(),
            logoPath: client.logoPath,
            mongoUrl: client.mongoUrl,
            ipAddress: client.ipAddress,
            dns: client.dns,
            subnet: client.subnet,
            issuedAt: new Date().toISOString()
        };

        const signed = LicenseUtils.signLicense(licenseData, privateKey);
        clients[index].validTo = licenseData.validTo;
        saveClients(clients);
        res.json(signed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/clients/:id', (req, res) => {
    try {
        const { id } = req.params;
        const clients = getClients();
        const filtered = clients.filter(c => c.id != id);
        saveClients(filtered);
        res.json({ success: true });
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
        <title>Nexus | License Manager</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root { 
                --bg: #f0f4f8; 
                --card-bg: #ffffff;
                --accent: #2563eb; 
                --text-main: #1e293b;
                --text-muted: #64748b;
                --glass-border: rgba(37, 99, 235, 0.1);
            }
            body { 
                background-color: var(--bg); 
                color: var(--text-main); 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                overflow-x: hidden;
                background-image: 
                    radial-gradient(at 0% 0%, #dbeafe 0%, transparent 50%),
                    radial-gradient(at 100% 100%, #eff6ff 0%, transparent 50%);
            }
            .studio-card { 
                background: var(--card-bg);
                border: 1px solid var(--glass-border);
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(10px);
            }
            .glass-panel { 
                background: #f8fafc; 
                border: 1px solid #e2e8f0; 
                transition: all 0.3s ease; 
            }
            input { 
                background: #ffffff !important; 
                border: 1px solid #cbd5e1 !important; 
                color: var(--text-main) !important; 
                transition: all 0.2s ease; 
                font-weight: 500; 
            }
            input:focus { 
                border-color: var(--accent) !important; 
                box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); 
                outline: none; 
            }
            .btn-blue { 
                background: var(--accent); 
                color: #ffffff; 
                transition: all 0.3s ease; 
                font-weight: 700; 
            }
            .btn-blue:hover { transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3); }
            .btn-blue:active { transform: translateY(0); }
            
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            
            .toggle-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .active-tab { background: var(--accent); color: white; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }

            .duration-btn { 
                padding: 4px 10px; 
                border-radius: 6px; 
                font-size: 10px; 
                font-weight: 700; 
                text-transform: uppercase; 
                background: #e2e8f0; 
                color: #475569; 
                transition: all 0.2s ease;
            }
            .duration-btn:hover { background: #2563eb; color: white; }
        </style>
    </head>
    <body class="min-h-screen p-8 lg:p-12">
        <div class="max-w-4xl mx-auto space-y-10 relative">
            <header class="text-center space-y-2">
                <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">
                    System Forge
                </div>
                <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">License Manager</h1>
                <p class="text-slate-500 font-medium">Generate and track hardware-secured licenses.</p>
            </header>

            <div class="flex justify-center">
                <div class="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 items-center border border-slate-200 shadow-sm">
                    <button id="showForge" class="toggle-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider active-tab">Create License</button>
                    <button id="showRegistry" class="toggle-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600">Client List</button>
                </div>
            </div>

            <div class="relative">
                <!-- Create License View -->
                <div id="forgeView" class="studio-card p-10 rounded-[32px] transition-all duration-500">
                    <h2 id="formTitle" class="text-lg font-bold mb-8 text-slate-800 flex items-center gap-2">
                        <div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                        Client Details
                    </h2>
                    <form id="forgeForm" class="space-y-6">
                        <input type="hidden" name="id" id="editId">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Client Name</label><input name="companyName" id="fCompanyName" placeholder="e.g. Acme Corp" class="w-full p-4 rounded-xl text-sm" required></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Device ID</label><input name="deviceId" id="fDeviceId" placeholder="Hardware Signature" class="w-full p-4 rounded-xl text-sm font-mono" required></div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Logo URL</label><input name="logoPath" id="fLogoPath" placeholder="/uploads/logo.png" class="w-full p-4 rounded-xl text-sm"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Database Link</label><input name="mongoUrl" id="fMongoUrl" placeholder="mongodb://..." class="w-full p-4 rounded-xl text-sm"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-5">
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Client IP</label><input name="ipAddress" id="fIpAddress" placeholder="127.0.0.1" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">DNS Server</label><input name="dns" id="fDns" placeholder="8.8.8.8" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                            <div class="group"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Network Mask</label><input name="subnet" id="fSubnet" placeholder="255.255.0.0" class="w-full p-4 rounded-xl text-xs font-mono"></div>
                        </div>
                        <div class="glass-panel p-8 rounded-2xl space-y-6">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="space-y-2"><label class="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Start Date</label><input name="validFrom" type="datetime-local" class="w-full p-3 rounded-lg text-xs" id="vFrom"></div>
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center mb-1">
                                        <label class="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Expiry Date</label>
                                        <div class="flex gap-1">
                                            <button type="button" class="duration-btn" onclick="setDuration(1)">1M</button>
                                            <button type="button" class="duration-btn" onclick="setDuration(3)">3M</button>
                                            <button type="button" class="duration-btn" onclick="setDuration(6)">6M</button>
                                            <button type="button" class="duration-btn" onclick="setDuration(12)">1Y</button>
                                        </div>
                                    </div>
                                    <input name="validTo" type="datetime-local" class="w-full p-3 rounded-lg text-xs" id="vTo">
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-4">
                            <button type="submit" id="submitBtn" class="flex-1 btn-blue py-5 rounded-2xl text-xs uppercase tracking-widest shadow-lg">Generate License File</button>
                            <button type="button" id="cancelEdit" class="hidden px-8 py-5 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-200 text-slate-600 hover:bg-slate-300">Cancel</button>
                        </div>
                    </form>
                </div>

                <!-- Client Registry View -->
                <div id="registryView" class="hidden studio-card p-10 rounded-[32px] transition-all duration-500 flex flex-col min-h-[600px]">
                    <div class="flex items-center justify-between mb-10">
                        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                            Active Clients
                        </h2>
                        <div id="clientCount" class="px-4 py-1.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">0 RECORDS</div>
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
            const forgeForm = document.getElementById('forgeForm');
            const submitBtn = document.getElementById('submitBtn');
            const cancelEditBtn = document.getElementById('cancelEdit');
            const formTitle = document.getElementById('formTitle');
            const editIdInput = document.getElementById('editId');

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

            const setDuration = (months) => {
                const start = new Date(document.getElementById('vFrom').value);
                const end = new Date(start);
                end.setMonth(end.getMonth() + months);
                document.getElementById('vTo').value = end.toISOString().slice(0,16);
            };

            showForgeBtn.onclick = () => { resetForm(); toggleView('forge'); };
            showRegistryBtn.onclick = () => toggleView('registry');
            document.getElementById('vFrom').value = new Date().toISOString().slice(0,16);
            setDuration(12);

            const resetForm = () => {
                forgeForm.reset();
                editIdInput.value = '';
                formTitle.innerHTML = '<div class="w-1.5 h-6 bg-blue-500 rounded-full"></div> Client Details';
                submitBtn.innerText = 'Generate License File';
                cancelEditBtn.classList.add('hidden');
                document.getElementById('vFrom').value = new Date().toISOString().slice(0,16);
                setDuration(12);
            };

            cancelEditBtn.onclick = resetForm;

            const downloadLicense = (signed, companyName) => {
                const blob = new Blob([JSON.stringify(signed, null, 2)], {type: 'application/json'});
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'license-' + companyName.toLowerCase().replace(/\\s+/g, '-') + '.dat'; a.click();
            };

            const refreshClients = async () => {
                const res = await fetch('/api/clients');
                const clients = await res.json();
                const container = document.getElementById('clientList');
                document.getElementById('clientCount').innerText = clients.length + ' RECORDS';
                if (clients.length === 0) { container.innerHTML = '<p class="text-center text-slate-400 py-20 uppercase tracking-widest text-xs">No clients found</p>'; return; }

                container.innerHTML = clients.map(c => {
                    const isActuallyActive = new Date(c.validTo) > new Date() && (c.isActive !== false);
                    const statusClass = isActuallyActive ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200';
                    const statusText = isActuallyActive ? 'Active' : 'Expired/Inactive';
                    const opacityClass = c.isActive === false ? 'opacity-60 grayscale-[0.5]' : '';
                    
                    return \`
                        <div class="glass-panel p-8 rounded-3xl group mb-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 \${opacityClass}">
                            <div class="flex justify-between items-start mb-6">
                                <div class="space-y-1">
                                    <h3 class="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">\${c.companyName}</h3>
                                    <p class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">\${c.deviceId}</p>
                                </div>
                                <div class="flex flex-col items-end gap-2">
                                    <div class="px-3 py-1 rounded-full \${statusClass} border text-[9px] font-black uppercase tracking-widest">\${statusText}</div>
                                    <div class="flex gap-2">
                                        <button onclick="editClient('\${c.id}')" class="text-[9px] font-bold text-blue-600 uppercase hover:underline">Edit</button>
                                        <button onclick="toggleStatus('\${c.id}', \${c.isActive !== false})" class="text-[9px] font-bold text-slate-500 uppercase hover:underline">\${c.isActive !== false ? 'Deactivate' : 'Activate'}</button>
                                        <button onclick="deleteClient('\${c.id}')" class="text-[9px] font-bold text-red-600 uppercase hover:underline">Delete</button>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-slate-50">
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Network Configuration</p>
                                        <div class="flex flex-wrap gap-2 text-[10px] font-medium text-slate-600">
                                            <span>IP: \${c.ipAddress || '—'}</span> • <span>DNS: \${c.dns || '—'}</span> • <span>MSK: \${c.subnet || '—'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Database</p>
                                        <p class="text-[10px] text-blue-600 font-mono truncate">\${c.mongoUrl || 'Default Instance'}</p>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Asset Path</p>
                                            <p class="text-[10px] text-slate-600 font-mono">\${c.logoPath || '/uploads/logo.png'}</p>
                                        </div>
                                        <div class="flex gap-1 mt-4">
                                            <button onclick="extendLicense('\${c.id}', 1)" class="duration-btn !text-[8px] !px-1.5">+1M</button>
                                            <button onclick="extendLicense('\${c.id}', 3)" class="duration-btn !text-[8px] !px-1.5">+3M</button>
                                            <button onclick="extendLicense('\${c.id}', 6)" class="duration-btn !text-[8px] !px-1.5">+6M</button>
                                            <button onclick="extendLicense('\${c.id}', 12)" class="duration-btn !text-[8px] !px-1.5">+1Y</button>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">License Dates</p>
                                        <p class="text-[10px] text-slate-600">Issued: \${new Date(c.issuedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between pt-6">
                                <div><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Commence</p><span class="text-[10px] text-slate-700 font-bold">\${new Date(c.validFrom).toLocaleDateString()}</span></div>
                                <div class="text-right"><p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Terminate</p><span class="text-[10px] text-slate-700 font-bold">\${new Date(c.validTo).toLocaleDateString()}</span></div>
                            </div>
                        </div>\`;
                }).join('');
            };

            window.editClient = async (id) => {
                const res = await fetch('/api/clients');
                const clients = await res.json();
                const c = clients.find(x => x.id == id);
                if (!c) return;

                editIdInput.value = c.id;
                document.getElementById('fCompanyName').value = c.companyName;
                document.getElementById('fDeviceId').value = c.deviceId;
                document.getElementById('fLogoPath').value = c.logoPath;
                document.getElementById('fMongoUrl').value = c.mongoUrl;
                document.getElementById('fIpAddress').value = c.ipAddress;
                document.getElementById('fDns').value = c.dns;
                document.getElementById('fSubnet').value = c.subnet;
                document.getElementById('vFrom').value = c.validFrom.slice(0,16);
                document.getElementById('vTo').value = c.validTo.slice(0,16);

                formTitle.innerText = 'Edit & Regenerate License';
                submitBtn.innerText = 'Update & Download';
                cancelEditBtn.classList.remove('hidden');
                toggleView('forge');
            };

            window.toggleStatus = async (id, currentStatus) => {
                await fetch(\`/api/clients/\${id}/status\`, { 
                    method: 'PATCH', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ isActive: !currentStatus }) 
                });
                refreshClients();
            };

            window.extendLicense = async (id, months) => {
                if (!confirm(\`Extend license by \${months} month(s) and download new file?\`)) return;
                const res = await fetch(\`/api/clients/\${id}/extend\`, { 
                    method: 'PATCH', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ months }) 
                });
                const signed = await res.json();
                const clientsRes = await fetch('/api/clients');
                const clients = await clientsRes.json();
                const c = clients.find(x => x.id == id);
                downloadLicense(signed, c.companyName);
                refreshClients();
            };

            window.deleteClient = async (id) => {
                if (!confirm('Are you sure? This will permanently delete the client record.')) return;
                await fetch(\`/api/clients/\${id}\`, { method: 'DELETE' });
                refreshClients();
            };

            forgeForm.onsubmit = async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('#submitBtn');
                btn.innerText = 'PROCESSING...'; btn.disabled = true;
                try {
                    const data = Object.fromEntries(new FormData(e.target));
                    const isEdit = !!editIdInput.value;
                    const url = isEdit ? \`/api/clients/\${editIdInput.value}\` : '/api/forge';
                    const method = isEdit ? 'PUT' : 'POST';

                    const res = await fetch(url, { 
                        method, 
                        headers: {'Content-Type': 'application/json'}, 
                        body: JSON.stringify(data) 
                    });
                    const signed = await res.json();
                    downloadLicense(signed, data.companyName);
                    resetForm();
                    toggleView('registry');
                } catch (err) { alert('Error: ' + err.message); } finally { btn.innerText = isEdit ? 'Update & Download' : 'Generate License File'; btn.disabled = false; }
            };
            refreshClients();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => { console.log('🚀 Nexus Online at http://localhost:' + PORT); });
