'use client'

import { createContext, useContext } from 'react'

export const PasswordRequiredContext = createContext<{ clear: () => void }>({ clear: () => {} })

export function usePasswordRequired() {
  return useContext(PasswordRequiredContext)
}
