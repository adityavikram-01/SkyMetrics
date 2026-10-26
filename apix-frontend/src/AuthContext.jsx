import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from './authApi'

const Context = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    try { setUser(await authApi.session()) } catch { setUser(null) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])
  const login = async values => { const result = await authApi.login(values); setUser(result); return result }
  const loginWorkspace = async (workspace, values) => { const result = await authApi.workspaceLogin(workspace, values); setUser(result); return result }
  const register = async values => { const result = await authApi.register(values); setUser(result); return result }
  const logout = async () => { await authApi.logout(); setUser(null) }
  return <Context.Provider value={{ user, loading, refresh, login, loginWorkspace, register, logout }}>{children}</Context.Provider>
}

export function useAuth() {
  const context = useContext(Context)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
