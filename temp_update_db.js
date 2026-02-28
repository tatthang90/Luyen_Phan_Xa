const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bwkunrcuwbvhyorrzvjf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3a3VucmN1d2J2aHlvcnJ6dmpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyMDEwNywiZXhwIjoyMDg3Nzk2MTA3fQ.Ecl1uBsscdSneHdasyNdXLx5c8P7LFoIgWQZ59cohZo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
    try {
        // 1. Thử RPC (Có thể RPC ddl không bật sẵn)
        const { error: rpcError } = await supabase.rpc('execute_sql', {
            sql: "ALTER TABLE vocabularies ADD COLUMN IF NOT EXISTS last_5_results jsonb DEFAULT '[]'::jsonb;"
        });

        if (rpcError) {
            // 2. Vì API Data Rest của Supabase không hỗ trợ Alter DDL, ta đành dùng Rest qua Schema API hoặc bypass.
            // Nhưng Supabase PostgREST default chặn Query RAW.
            console.log("RPC Error: ", rpcError.message);
            console.log("Gợi ý: Do PostgREST chặn lệnh ALTER DDL, Script này có thể không chạy được qua thư viện standard client.");
        } else {
            console.log("Success by RPC");
        }
    } catch (e) {
        console.log(e);
    }
}

addColumn();
