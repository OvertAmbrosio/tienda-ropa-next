import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function getSessionUser() {
  const store = await cookies()
  const session = store.get('session')?.value
  if (!session) return null
  const id = Number(session)
  if (!Number.isFinite(id)) return null
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { select: { name: true } } },
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles.map((r: { name: string }) => r.name),
  }
}

export function hasAnyRole(user: { roles: string[] } | null, roles: string[]) {
  if (!user) return false
  return user.roles.some((r) => roles.includes(r))
}
