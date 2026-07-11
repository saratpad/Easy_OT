import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data } = await supabase.from('ot_requests').select('id, status, is_certified, end_time, group_id, certification_step')
  console.log(JSON.stringify(data, null, 2))
}
run()
