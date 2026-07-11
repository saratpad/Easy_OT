import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data, error } = await supabase.from('system_settings').update({ value: 'true' }).eq('key', 'enable_work_certification')
  console.log('Updated:', error ? error : 'Success')
}
run()
