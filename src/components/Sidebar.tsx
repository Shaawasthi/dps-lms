'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BrandHeader from './BrandHeader'
import type { Role } from '@/context/RoleContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/setup/classes', label: 'Classes & Students' },
  { href: '/setup/curriculum', label: 'Curriculum' },
  { href: '/questions', label: 'Questions' },
  { href: '/responses', label: 'Responses' },
  { href: '/reports', label: 'Reports' },
  { href: '/remedy', label: 'Remedy' },
]

export default function Sidebar({ email, role }: { email: string; role: Role }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <BrandHeader compact />

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 truncate mb-1">{email}</p>
        <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded mb-2 ${
          role === 'teacher'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {role === 'teacher' ? 'Teacher' : 'Admin'}
        </span>
        <br />
        <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-600">
          Sign out
        </button>
      </div>
    </aside>
  )
}
