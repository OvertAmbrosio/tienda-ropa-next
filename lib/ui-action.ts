import { toast } from '@/lib/toast'

export type RunUiActionOptions<T> = {
  action: () => Promise<T>
  setLoading?: (v: boolean) => void
  onSuccess?: (result: T) => void | Promise<void>
  onError?: (err: Error) => void | Promise<void>
  successMessage?: string | ((result: T) => string)
  errorMessage?: string | ((err: Error) => string)
}

export async function runUiAction<T>(opts: RunUiActionOptions<T>) {
  const { action, setLoading, onSuccess, onError, successMessage, errorMessage } = opts
  try {
    setLoading?.(true)
    const result = await action()
    if (successMessage) {
      const msg = typeof successMessage === 'function' ? successMessage(result) : successMessage
      if (msg) toast.success(msg)
    }
    await onSuccess?.(result)
  } catch (e: any) {
    const err = e instanceof Error ? e : new Error(String(e?.message ?? e))
    const msg = typeof errorMessage === 'function' ? errorMessage(err) : (errorMessage ?? err.message)
    if (msg) toast.error(msg)
    await onError?.(err)
  } finally {
    setLoading?.(false)
  }
}
