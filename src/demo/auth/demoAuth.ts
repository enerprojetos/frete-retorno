export type DemoRole = 'SHIPPER' | 'DRIVER' | 'OPERATOR'

export type DemoUser = {
  id: string
  name: string
  role: DemoRole
}

const KEY = 'frete_retorno_demo_user_v1'

export function getDemoUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as DemoUser
  } catch {
    return null
  }
}

export function setDemoUser(user: DemoUser) {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearDemoUser() {
  localStorage.removeItem(KEY)
}
