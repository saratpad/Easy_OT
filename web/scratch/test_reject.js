const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await supabase
    .from('ot_requests')
    .select(`
      id,
      status,
      ot_request_approvals (
        status,
        comment,
        approver:users (
          full_name
        )
      )
    `)
    .eq('status', 'rejected')
    .limit(1)

  console.log('Error:', error)
  console.log('Data:', JSON.stringify(data, null, 2))
}

test()
