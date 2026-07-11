'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey)

export type Holiday = {
  id: string
  date: string
  name: string
  created_at: string
}

// Fetch all holidays, ordered by date
export async function getHolidays(): Promise<Holiday[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching holidays:', error)
    return []
  }
  return data as Holiday[]
}

// Add a new holiday
export async function addHoliday(date: string, name: string) {
  const { data, error } = await supabaseAdmin
    .from('holidays')
    .insert([{ date, name }])
    .select()
    .single()

  if (error) {
    console.error('Error adding holiday:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/holidays')
  return { success: true, data }
}

// Delete a holiday
export async function deleteHoliday(id: string) {
  const { error } = await supabaseAdmin
    .from('holidays')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting holiday:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/holidays')
  return { success: true }
}
