import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('ot_requests').select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)').limit(1);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
