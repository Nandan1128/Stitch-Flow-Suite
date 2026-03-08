import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('--- Starting Test ---');

    // 1. Create a new Worker
    console.log('1. Creating a new worker...');
    const { data: worker, error: workerErr } = await supabase
        .from('workers')
        .insert([{ name: 'Test Worker XYZ', phone: '1234567890' }])
        .select()
        .single();

    if (workerErr) {
        console.error('Error creating worker:', workerErr);
        return;
    }
    console.log('Created Worker:', worker.id);

    // Need a product and operation master to insert production operation? 
    // Let's fetch one operation to use.
    const { data: opMaster } = await supabase.from('operations').select('*').limit(1).single();
    let opId = opMaster?.id;
    if (!opId) {
        console.log('No operation master found, creating a dummy one...');
        const { data: newOpMaster } = await supabase.from('operations').insert([{ name: 'Test Operation', amount_per_piece: 10 }]).select().single();
        opId = newOpMaster.id;
    }

    // 2. Insert new operation for worker into worker_salaries or production_operation
    // The user says "workeroperation table and workersalaries table both get updated you can insert new data then add operation"
    // Let's insert into worker_salaries directly? Wait, the user said "workeroperation table". Let's check if the table exists.

    const { data: checkTable, error: checkErr } = await supabase.from('workeroperation').select('*').limit(1);
    if (checkErr) {
        console.log('workeroperation table does not exist or error:', checkErr.message);
    } else {
        console.log('workeroperation table exists!');
    }

    const { data: checkTable2, error: checkErr2 } = await supabase.from('worker_operations').select('*').limit(1);
    if (checkErr2) {
        console.log('worker_operations table does not exist or error:', checkErr2.message);
    } else {
        console.log('worker_operations table exists!');
    }

    // 3. Cleanup worker
    console.log('Cleaning up worker...');
    await supabase.from('workers').delete().eq('id', worker.id);
    console.log('--- Test Completed ---');
}

runTest();
