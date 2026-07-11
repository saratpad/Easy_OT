import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data } = await supabase.from('users').select('id, full_name, role, group_id, division_id').eq('role', 'supervisor')
  console.log(JSON.stringify(data, null, 2))
}
run()
