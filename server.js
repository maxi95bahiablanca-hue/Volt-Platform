const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const mercadopago = require('mercadopago');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// PORT optimization for Railway
const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// 1. Supabase Initialization (Robust)
const supabaseUrl = process.env.SUPABASE_URL || 'https://raqtdnjgkspczmjgusai.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_xgP0tFJxRms5KUdaRha30Q_0xxQih5K';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Mercado Pago Initialization (Lazy loading to avoid crash if token missing)
let preference = null;
let mpPayment = null;
try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (mpToken) {
        const mpClient = new mercadopago.MercadoPagoConfig({ accessToken: mpToken });
        preference = new mercadopago.Preference(mpClient);
        mpPayment = new mercadopago.Payment(mpClient);
    }
} catch (e) {
    console.error("MP Init Error:", e.message);
}

// --- API ROUTES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.0.1' }));

app.post('/api/jobs', async (req, res) => {
    const { client_id, description, lat, lng } = req.body;
    const { data, error } = await supabase.from('jobs').insert([{
        client_id, description, location_lat: lat, location_lng: lng, status: 'open'
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/quote/:jobId', async (req, res) => {
    try {
        const { data: worker, error } = await supabase.from('trabajadores')
            .select('*, profiles(full_name)')
            .eq('is_online', true)
            .order('volt_score', { ascending: false })
            .limit(1)
            .single();

        if (error || !worker) return res.status(404).json({ message: 'Buscando el mejor presupuesto...' });
        res.json({ worker, amount: 1500 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/create', async (req, res) => {
    if (!preference) return res.status(503).json({ error: "Servicio de pago no configurado" });
    const { jobId, amount, workerName } = req.body;
    try {
        const body = {
            items: [{ title: `VOLT - ${workerName}`, quantity: 1, unit_price: Number(amount), currency_id: 'ARS' }],
            notification_url: `${process.env.BASE_URL}/api/webhook`,
            external_reference: jobId,
            auto_return: "approved"
        };
        const response = await preference.create({ body });
        res.json({ init_point: response.init_point });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/webhook', async (req, res) => {
    const { query } = req;
    if (query.type === 'payment' && mpPayment) {
        try {
            const paymentId = query.id || query['data.id'];
            const pData = await mpPayment.get({ id: paymentId });
            if (pData.status === 'approved') {
                const jobId = pData.external_reference;
                await supabase.from('jobs').update({ status: 'paid' }).eq('id', jobId);
            }
        } catch (e) { console.error("Webhook error:", e.message); }
    }
    res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`VOLT SERVER 3.0.1 running on port ${PORT}`);
});
