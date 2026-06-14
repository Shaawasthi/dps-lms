'use server'

import { createClient } from '@/lib/supabase/server'

export async function loginAction(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { error: '', success: true }
}
