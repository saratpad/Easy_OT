const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data: div } = await supabase.from('divisions').select('id, name').limit(1).single()
  console.log('Division:', div)

  const insertData = {
    id: crypto.randomUUID(),
    full_name: 'Test CSV User',
    position: 'Tester',
    division_id: div.id,
    role: 'employee',
    line_uid: `import_test_${Date.now()}`
  }

  const { data, error } = await supabase.from('users').insert(insertData).select()
  console.log('Insert Error:', error)
  console.log('Inserted Data:', data)

  if (!error) {
    await supabase.from('users').delete().eq('id', insertData.id)
  }
}

test()
