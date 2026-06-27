import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { RoleProvider, type Role } from '@/context/RoleContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const role: Role = session.user.user_metadata?.role === 'teacher' ? 'teacher' : 'admin'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={session.user.email ?? ''} role={role} />
      <RoleProvider role={role}>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </RoleProvider>
    </div>
  )
}
