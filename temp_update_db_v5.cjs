const runCustomSQL = async () => {
    const url = 'https://bwkunrcuwbvhyorrzvjf.supabase.co/rest/v1/rpc/execute_sql';
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3a3VucmN1d2J2aHlvcnJ6dmpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyMDEwNywiZXhwIjoyMDg3Nzk2MTA3fQ.Ecl1uBsscdSneHdasyNdXLx5c8P7LFoIgWQZ59cohZo';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: "ALTER TABLE vocabularies ADD COLUMN IF NOT EXISTS parent_vocab_id uuid REFERENCES vocabularies(id) ON DELETE SET NULL;"
            })
        });

        if (!res.ok) {
            console.log("Error response from Supabase:");
            console.log(await res.text());
        } else {
            console.log("Thành công! Đã thêm cột parent_vocab_id.");
        }

    } catch (e) {
        console.log(e);
    }
}

runCustomSQL();
