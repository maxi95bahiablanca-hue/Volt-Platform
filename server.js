const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const mercadopago = require('mercadopago');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 1. Supabase Initialization
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://raqtdnjgkspczmjgusai.supabase.co',
    process.env.SUPABASE_KEY || 'sb_publishable_xgP0tFJxRms5KUdaRha30Q_0xxQih5K'
);

// 2. Mercado Pago Initialization
const mpClient = new mercadopago.MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'YOUR_MP_TOKEN'
});
const preference = new mercadopago.Preference(mpClient);

// --- API ROUTES ---

// Create a new job
app.post('/api/jobs', async (req, res) => {
    const { client_id, description, lat, lng } = req.body;
    const { data, error } = await supabase.from('jobs').insert([{
        client_id, description, location_lat: lat, location_lng: lng, status: 'open'
    }]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get quotes for a job (Rotation logic: max 3, sorted by score)
app.get('/api/quote/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    // Get excluded workers (already rejected)
    const { data: rejected } = await supabase.from('quotes')
        .select('worker_id')
        .eq('job_id', jobId)
        .eq('status', 'rejected');
    
    const excludedIds = rejected ? rejected.map(r => r.worker_id) : [];

    // Find best online worker not rejected
    const { data: worker, error } = await supabase.from('trabajadores')
        .select('*, profiles(full_name)')
        .eq('is_online', true)
        .not('id', 'in', `(${excludedIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('volt_score', { ascending: false })
        .limit(1)
        .single();

    if (error || !worker) return res.status(404).json({ message: 'Buscando el mejor presupuesto para ti...' });
    
    res.json({ worker, amount: 1500 }); // Mock amount logic
});

// Reject quote with feedback
app.post('/api/quote/reject', async (req, res) => {
    const { jobId, workerId, reason } = req.body;
    await supabase.from('quotes').insert([{
        job_id: jobId, worker_id: workerId, status: 'rejected', rejection_reason: reason
    }]);
    res.json({ success: true });
});

// Mercado Pago: Create payment preference
app.post('/api/payment/create', async (req, res) => {
    const { jobId, amount, workerName } = req.body;
    try {
        const body = {
            items: [{
                title: `Servicio VOLT - ${workerName}`,
                quantity: 1,
                unit_price: Number(amount),
                currency_id: 'ARS'
            }],
            notification_url: `${process.env.BASE_URL}/api/webhook`,
            external_reference: jobId,
            back_urls: {
                success: `${process.env.BASE_URL}/?payment=success`,
                failure: `${process.env.BASE_URL}/?payment=failure`
            },
            auto_return: "approved"
        };
        const response = await preference.create({ body });
        res.json({ init_point: response.init_point });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mercado Pago Webhook: Unlock contact info
app.post('/api/webhook', async (req, res) => {
    const { query } = req;
    if (query.type === 'payment') {
        const paymentId = query.id || query['data.id'];
        const payment = new mercadopago.Payment(mpClient);
        const pData = await payment.get({ id: paymentId });

        if (pData.status === 'approved') {
            const jobId = pData.external_reference;
            await supabase.from('jobs').update({ status: 'paid' }).eq('id', jobId);
            console.log(`[VOLT] Job ${jobId} PAID. Contact info unlocked.`);
        }
    }
    res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => res.send('VOLT-PLATFORM IS ALIVE'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`VOLT DEFINITIVE SERVER running on port ${PORT}`));
