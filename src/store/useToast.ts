import { create } from 'zustand';
import { uuid } from '@/lib/id';

export type ToastKind = 'success' | 'danger' | 'info' | 'neutral';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, kind = 'neutral') => {
    const toast: Toast = { id: uuid(), message, kind };
    set((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
    setTimeout(() => get().dismiss(toast.id), 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const showToast = (message: string, kind?: ToastKind) =>
  useToast.getState().show(message, kind);
