export type LoginResponse = {
  success: boolean
  user: { id: number; email: string; name: string | null; roles: string[] }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || 'Request failed'
    throw new Error(msg)
  }
  return data as T
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ success: boolean }>('/api/logout', { method: 'POST' }),
}
