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
  const { data: routeSteps } = await supabase.from('approval_routes').select('step_order, division_id').eq('target_role', 'executive');
  
  let pendingRequests = [];
  for (const route of routeSteps) {
    let query = supabase
      .from('ot_requests')
      .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
      .eq('division_id', route.division_id)
      .eq('current_step', route.step_order)
      .eq('status', 'pending');

    const { data: pending } = await query;
    if (pending) pendingRequests.push(...pending);
  }
  
  console.log(JSON.stringify(pendingRequests.map(d => ({id: d.id, user: d.user, division: d.division, group: d.group})), null, 2));
}

test();
