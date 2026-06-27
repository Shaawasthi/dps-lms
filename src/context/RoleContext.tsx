'use client'

import { createContext, useContext } from 'react'

export type Role = 'admin' | 'teacher'
const RoleContext = createContext<Role>('admin')

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export const useRole = () => useContext(RoleContext)
