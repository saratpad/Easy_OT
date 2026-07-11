const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const envMap = {};
env.forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envMap[k.trim()] = v.trim();
});

const supabase = createClient(envMap['NEXT_PUBLIC_SUPABASE_URL'], envMap['SUPABASE_SERVICE_ROLE_KEY']);

async function test() {
  const { data, error } = await supabase.from('ot_requests').select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)').eq('status', 'pending');
  if (error) console.error("Error:", error);
  else console.log(JSON.stringify(data.map(d => ({id: d.id, user: d.user, division: d.division, step: d.current_step})), null, 2));
}

test();
