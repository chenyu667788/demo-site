const express = require('express');
const path = require('path');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = 8080;

app.use(express.static('public'));
app.use(express.json());

const demoServices = {
    'linkpay-oneoff': {
        port: 3000,
        path: 'e:\\payment-demo\\evonet-linkpay-demo',
        name: 'LinkPay 一次性支付'
    },
    'dropin-oneoff': {
        port: 3001,
        path: 'e:\\evonet-dropin-demo',
        name: 'Drop-in 一次性支付'
    },
    'directapi-oneoff': {
        port: 3002,
        path: 'e:\\evonet-direct-api-demo',
        name: 'Direct API 一次性支付'
    },
    'dropin-subscription': {
        port: 3003,
        path: 'e:\\drop-in-subscription-demo',
        name: 'Drop-in 订阅支付'
    },
    'directapi-subscription': {
        port: 3004,
        path: 'e:\\direct API-subscription-demo',
        name: 'Direct API 订阅支付'
    },
    'linkpay-subscription': {
        port: 3005,
        path: 'e:\\linkpay-subscription-demo',
        name: 'LinkPay 订阅支付'
    }
};

const runningServices = new Set();

function checkPortInUse(port) {
    return new Promise((resolve) => {
        const cmd = `netstat -ano | findstr ":${port}" | findstr "LISTENING"`;
        exec(cmd, (error, stdout) => {
            resolve(stdout.trim().length > 0);
        });
    });
}

function startService(serviceId) {
    return new Promise(async (resolve, reject) => {
        const service = demoServices[serviceId];
        if (!service) {
            reject(new Error('Service not found'));
            return;
        }

        const isRunning = await checkPortInUse(service.port);
        if (isRunning) {
            runningServices.add(serviceId);
            resolve({ success: true, message: 'Service already running', port: service.port });
            return;
        }

        const command = `start "${service.name}" cmd /k "cd /d ${service.path} && node server.js"`;
        
        exec(command, (error) => {
            if (error) {
                reject(error);
            } else {
                runningServices.add(serviceId);
                setTimeout(() => {
                    resolve({ success: true, message: 'Service started', port: service.port });
                }, 2000);
            }
        });
    });
}

function stopService(serviceId) {
    return new Promise(async (resolve, reject) => {
        const service = demoServices[serviceId];
        if (!service) {
            reject(new Error('Service not found'));
            return;
        }

        const isRunning = await checkPortInUse(service.port);
        if (!isRunning) {
            runningServices.delete(serviceId);
            resolve({ success: true, message: 'Service not running' });
            return;
        }

        const cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${service.port}" ^| findstr "LISTENING"') do taskkill /F /PID %a`;
        
        exec(cmd, (error) => {
            if (error) {
                reject(error);
            } else {
                runningServices.delete(serviceId);
                resolve({ success: true, message: 'Service stopped' });
            }
        });
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/demos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/service/status', async (req, res) => {
    const status = {};
    for (const [id, service] of Object.entries(demoServices)) {
        status[id] = await checkPortInUse(service.port);
    }
    res.json(status);
});

app.get('/api/service/status/:serviceId', async (req, res) => {
    const service = demoServices[req.params.serviceId];
    if (!service) {
        res.status(404).json({ error: 'Service not found' });
        return;
    }
    const isRunning = await checkPortInUse(service.port);
    res.json({ running: isRunning, port: service.port });
});

app.post('/api/service/start/:serviceId', async (req, res) => {
    try {
        const result = await startService(req.params.serviceId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/stop/:serviceId', async (req, res) => {
    try {
        const result = await stopService(req.params.serviceId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  Evonet Demos Site`);
    console.log(`  端口: ${PORT}`);
    console.log(`  访问地址: http://localhost:${PORT}`);
    console.log(`========================================`);
});
