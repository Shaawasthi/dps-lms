'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'
import Image from 'next/image'

const initialState = { error: '', success: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-green-800 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-700 active:bg-green-900 disabled:opacity-50 transition-colors"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-teal-800 p-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Brand header */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 px-8 pt-8 pb-6 flex flex-col items-center text-center border-b border-gray-100">
            <div className="flex items-center justify-center gap-5 mb-5">
              <Image
                src="/dps-logo.png"
                alt="Delhi Public School"
                width={76}
                height={76}
                className="rounded-full ring-2 ring-green-100"
              />
              <div className="w-px h-14 bg-gray-200" />
              <Image
                src="/eq-logo.png"
                alt="Equanimity Learning"
                width={76}
                height={76}
                className="rounded-full ring-2 ring-orange-100"
              />
            </div>
            <h1 className="text-lg font-bold text-green-900 leading-tight">Delhi Public School</h1>
            <p className="text-xs text-teal-700 font-medium tracking-wide mt-0.5">× Equanimity Learning</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <p className="text-sm font-semibold text-gray-800 mb-0.5">Admin Portal</p>
            <p className="text-xs text-gray-400 mb-6">Sign in to access the LMS dashboard</p>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent placeholder-gray-300"
                  placeholder="you@school.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              {state?.error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {state.error}
                </p>
              )}

              <SubmitButton />
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-green-200/60 mt-5">
          Service Before Self
        </p>
      </div>
    </div>
  )
}
