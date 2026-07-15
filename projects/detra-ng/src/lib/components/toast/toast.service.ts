import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  public readonly toasts = this._toasts.asReadonly();

  show(toast: Omit<ToastMessage, 'id'>): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id, duration: toast.duration || 4000 };

    this._toasts.update((current) => [...current, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => this.remove(id), newToast.duration);
    }
  }

  success(message: string, title?: string, duration?: number): void {
    this.show({ message, title, type: 'success', duration });
  }

  error(message: string, title?: string, duration?: number): void {
    this.show({ message, title, type: 'error', duration });
  }

  info(message: string, title?: string, duration?: number): void {
    this.show({ message, title, type: 'info', duration });
  }

  warning(message: string, title?: string, duration?: number): void {
    this.show({ message, title, type: 'warning', duration });
  }

  remove(id: string): void {
    this._toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
