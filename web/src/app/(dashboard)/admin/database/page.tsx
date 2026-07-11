import { getSessionUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import DatabaseClient from './DatabaseClient'

export default async function DatabaseAdminPage() {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') {
    redirect('/employee')
  }

  return <DatabaseClient />
}
