// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const cron = require('node-cron');

const AIResearchScanner = require('./services/AIResearchScanner');
const DeepSeekService = require('./services/DeepSeekService');
const GitHubScanner = require('./services/GitHubScanner');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Services
const deepSeekService = new DeepSeekService(process.env.DEEPSEEK_API_KEY);
const githubScanner = new GitHubScanner(process.env.GITHUB_TOKEN);
const aiScanner = new AIResearchScanner(deepSeekService, githubScanner);

// Store active connections
const activeConnections = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔗 New client connected to AI Brain');
    activeConnections.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Connected to Revolutionary AI Brain - Live scanning initiated',
        timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
        console.log('❌ Client disconnected');
        activeConnections.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        activeConnections.delete(ws);
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    activeConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}

// AI Brain scanning cycle
async function performAIScan() {
    try {
        console.log('🧠 Starting AI research scan cycle...');
        
        // Get latest AI research insights
        const insights = await aiScanner.getLatestInsights();
        
        for (const insight of insights) {
            // Broadcast each insight to connected clients
            broadcast({
                type: 'thought',
                data: insight,
                timestamp: new Date().toISOString()
            });
            
            console.log(`📡 Broadcasted: ${insight.title}`);
            
            // Small delay between insights for better UX
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
    } catch (error) {
        console.error('❌ Scan cycle error:', error);
        broadcast({
            type: 'error',
            message: 'Temporary scanning disruption - reconnecting...',
            timestamp: new Date().toISOString()
        });
    }
}

// Continuous scanning every 30 seconds
setInterval(performAIScan, parseInt(process.env.SCAN_INTERVAL) || 30000);

// Manual trigger endpoint
app.post('/api/trigger-scan', async (req, res) => {
    try {
        await performAIScan();
        res.json({ status: 'success', message: 'Manual scan triggered' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'active',
        connections: activeConnections.size,
        uptime: process.uptime(),
        lastScan: new Date().toISOString()
    });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await aiScanner.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start initial scan after 5 seconds
setTimeout(performAIScan, 5000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Revolutionary AI Brain Backend running on port ${PORT}`);
    console.log(`🧠 Autonomous scanning every ${process.env.SCAN_INTERVAL || 30000}ms`);
    console.log(`🔗 WebSocket server ready for real-time connections`);
});
