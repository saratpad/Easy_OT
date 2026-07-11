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
  const { data: users } = await supabase.from('users').select('*').eq('full_name', 'นางรัตนา สามารถ');
  console.log("User:", users);
  
  const { data: routes } = await supabase.from('approval_routes').select('*');
  console.log("Routes:", routes);
}

test();
