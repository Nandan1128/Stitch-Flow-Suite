import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from './src/Config/supabaseClient';

describe('Worker Operations and Salaries Test', () => {
    let workerId = '';

    beforeAll(async () => {
        // Create a dummy worker
        const { data, error } = await supabase
            .from('workers')
            .insert([{ name: 'Test Worker Vitest', phone: '1234567890' }])
            .select()
            .single();
        if (error) throw error;
        workerId = data.id;
    });

    afterAll(async () => {
        // Cleanup
        if (workerId) {
            await supabase.from('workers').delete().eq('id', workerId);
        }
    });

    it('should check if workeroperation table exists', async () => {
        const { error } = await supabase.from('workeroperation').select('*').limit(1);
        if (error) {
            console.log('workeroperation table missing or error:', error.message);
        } else {
            console.log('workeroperation table exists!');
        }
    });

    it('should check if worker_operations table exists', async () => {
        const { error } = await supabase.from('worker_operations').select('*').limit(1);
        if (error) {
            console.log('worker_operations table missing or error:', error.message);
        } else {
            console.log('worker_operations table exists!');
        }
    });

    it('should check if production_operation table exists', async () => {
        const { error } = await supabase.from('production_operation').select('*').limit(1);
        expect(error).toBeNull();
    });

    it('should check if worker_salaries table exists', async () => {
        const { error } = await supabase.from('worker_salaries').select('*').limit(1);
        expect(error).toBeNull();
    });
});
