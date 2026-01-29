export type UserRole = 'SHIPPER' | 'DRIVER' | 'OPERATOR'

export function redirectPathForRole(role: UserRole): string {
  if (role === 'OPERATOR') return '/admin'
  if (role === 'SHIPPER') return '/shipper'
  return '/driver'
}
