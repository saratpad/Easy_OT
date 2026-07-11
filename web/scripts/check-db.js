const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Testing delete routes ---');
  const divId = 'd0000000-0000-0000-0000-000000000001';
  const { error: delErr } = await supabase.from('approval_routes').delete().eq('division_id', divId);
  if (delErr) console.error('Delete error:', delErr);
  else console.log('Delete success');

  const { error: insErr } = await supabase.from('approval_routes').insert([
    { division_id: divId, step_order: 1, target_role: 'supervisor' },
    { division_id: divId, step_order: 2, target_role: 'director' }
  ]);
  if (insErr) console.error('Insert error:', insErr);
  else console.log('Insert success');
  
  console.log('\n--- Checking approval_routes ---');
  const { data: routes, error: err2 } = await supabase.from('approval_routes').select('*');
  console.log(routes);
  if (err2) console.error(err2);

  console.log('\n--- Checking ot_requests ---');
  const { data: requests, error: err3 } = await supabase.from('ot_requests').select('*');
  console.log(requests);
  if (err3) console.error(err3);
}

main();
