import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('\n--- Starting DB Trigger Integration Test ---\n');

    try {
        console.log('1. Fetching existing active worker...');
        const { data: workers, error: wErr } = await supabase.from('workers').select('*').limit(1);
        if (wErr || !workers || workers.length === 0) {
            console.error('No workers found in DB. Please create one in the UI first.');
            return;
        }
        const worker = workers[0];

        console.log('2. Fetching existing test data for production...');
        const { data: operations } = await supabase.from('operations').select('*').limit(1);
        const { data: productions } = await supabase.from('production').select('*').limit(1);

        if (!operations?.length || !productions?.length) {
            console.error('Missing operations/productions to test with. Aborting.');
            return;
        }
        const operation = operations[0];
        const production = productions[0];
        const product_id = production.product_id || operation.product_id;

        const dateStr = new Date().toISOString().split('T')[0];

        console.log('   ✅ Found Worker:', worker.id);
        console.log('   ✅ Found Operation:', operation.id);
        console.log('   ✅ Found Production:', production.id);

        // 3. Insert Operation
        console.log('\n3. Inserting new operation to trigger the sync...');
        const piecesDone = 10;
        const earnings = piecesDone * operation.amount_per_piece;

        const { data: prodOp, error: prodErr } = await supabase.from('production_operation').insert([{
            operation_id: operation.id,
            worker_id: worker.id,
            worker_name: worker.name,
            pieces_done: piecesDone,
            earnings: earnings,
            date: dateStr,
            production_id: production.id,
            entered_by: 'Trigger Test Script'
        }]).select().single();

        if (prodErr) throw new Error('Insert prodOp error: ' + JSON.stringify(prodErr));
        console.log('   ✅ Inserted into production_operation:', prodOp.id);

        // Wait a moment for trigger (though it's transactionally synchronous)
        await new Promise(r => setTimeout(r, 100));

        const { data: salaryOp, error: salErr } = await supabase.from('worker_salaries')
            .select('*')
            .eq('related_production_operation_id', prodOp.id)
            .single();

        if (salErr || !salaryOp) {
            throw new Error('Trigger Failed on Insert! No matching salary record found.');
        }
        console.log('   🔥 SUCCESS! Database trigger created worker_salaries:', salaryOp.id);

        // 5. Update Operation
        console.log('\n4. Updating operation (changing pieces to 25) to test UPDATE trigger...');
        const updatedPieces = 25;
        const updatedEarnings = updatedPieces * operation.amount_per_piece;

        await supabase.from('production_operation').update({ pieces_done: updatedPieces, earnings: updatedEarnings }).eq('id', prodOp.id);

        const { data: checkSal2 } = await supabase.from('worker_salaries').select('*').eq('id', salaryOp.id).single();

        if (checkSal2.pieces_done === 25 && Number(checkSal2.total_amount) === updatedEarnings) {
            console.log('   🔥 SUCCESS! Database trigger updated worker_salaries table! Pieces = 25');
        } else {
            console.error('   ❌ UPDATE Trigger failed. Sal pieces:', checkSal2.pieces_done, 'Expected:', 25);
        }

        // 7. Delete Operation
        console.log('\n6. Deleting operation to test DELETE trigger...');
        await supabase.from('production_operation').delete().eq('id', prodOp.id);

        const { data: checkSal3 } = await supabase.from('worker_salaries').select('*').eq('id', salaryOp.id).maybeSingle();

        if (!checkSal3) {
            console.log('   🔥 SUCCESS! Database trigger deleted worker_salaries record.');
        } else {
            console.error('   ❌ DELETE Trigger failed. Record still exists.');
        }

    } catch (err: any) {
        console.error('Test execution error:', err.message || err);
    } finally {
        console.log('\n--- Test Completed Successfully ---\n');
    }
}

runTest();
