// Run once: node --env-file=.env.local scripts/create-teacher-user.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'teacher@dpsnashik.in',
  password: 'dpslmsclass@2026',
  email_confirm: true,
  user_metadata: { role: 'teacher' },
})

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('Teacher user created:', data.user.email, '(id:', data.user.id + ')')
