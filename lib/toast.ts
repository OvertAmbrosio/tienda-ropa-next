export type ToastType = 'success' | 'error' | 'info' | 'warning'
export type ToastInput = {
  message: string
  type?: ToastType
  durationMs?: number
}

const EVENT_NAME = 'app:toast'

type ToastEventDetail = Required<Omit<ToastInput, 'type' | 'durationMs'>> & {
  type: ToastType
  durationMs: number
  id: string
}

function emit(detail: ToastEventDetail) {
  if (typeof window === 'undefined') return
  const ev = new CustomEvent(EVENT_NAME, { detail })
  window.dispatchEvent(ev)
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

export const toast = Object.assign(
  (input: ToastInput) => {
    emit({
      id: makeId(),
      message: input.message,
      type: input.type ?? 'info',
      durationMs: input.durationMs ?? 3000,
    })
  },
  {
    success: (message: string, durationMs = 3000) =>
      emit({ id: makeId(), message, type: 'success', durationMs }),
    error: (message: string, durationMs = 3500) =>
      emit({ id: makeId(), message, type: 'error', durationMs }),
    info: (message: string, durationMs = 3000) =>
      emit({ id: makeId(), message, type: 'info', durationMs }),
    warning: (message: string, durationMs = 3200) =>
      emit({ id: makeId(), message, type: 'warning', durationMs }),
    EVENT_NAME,
  }
)
