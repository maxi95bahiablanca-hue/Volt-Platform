const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const testWorkers = [
    { full_name: "Marcos Electricidad", volt_score: 4.9, status: "active", lat: -38.7183, lng: -62.2663, email: "marcos@test.com" },
    { full_name: "Ana Plomería", volt_score: 4.7, status: "active", lat: -38.7150, lng: -62.2720, email: "ana@test.com" },
    { full_name: "Roberto Gas", volt_score: 4.5, status: "active", lat: -38.7250, lng: -62.2600, email: "roberto@test.com" }
];

async function seed() {
    console.log("Cargando trabajadores de prueba...");
    const { data, error } = await supabase.from('workers').insert(testWorkers);
    if (error) console.error("Error al cargar datos:", error.message);
    else console.log("¡Trabajadores cargados con éxito!");
}

seed();
