'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'
import BrandHeader from '@/components/BrandHeader'

const initialState = { error: '', success: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState)

  useEffect(() => {
    if (state?.success) {
      window.location.href = '/dashboard'
    }
  }, [state])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <BrandHeader />
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h2 className="text-lg font-semibold mb-1">Admin Login</h2>
        <p className="text-sm text-gray-500 mb-6">Sign in to continue</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton />
        </form>
      </div>
      </div>
    </div>
  )
}
