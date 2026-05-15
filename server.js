const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

// Railway dynamic port
const PORT = process.env.PORT || 8080;

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Simple API Mocks to avoid crashing
app.get('/api/health', (req, res) => res.json({ status: 'ok', mode: 'recovery' }));
app.get('/api/quote/:id', (req, res) => res.json({ worker: { full_name: "Marcos (MOCK)", volt_score: 4.9 }, amount: 1500 }));
app.post('/api/jobs', (req, res) => res.json({ success: true, id: 'mock-job' }));

// For everything else, serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`RECOVERY SERVER running on port ${PORT}`);
});
