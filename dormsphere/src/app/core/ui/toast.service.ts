import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  title: string;
  message: string;
  variant: ToastVariant;
  closing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly removeAnimationMs = 240;
  private readonly defaultDurationMs = 3200;
  private idCounter = 0;

  readonly toasts = signal<ToastItem[]>([]);

  success(title: string, message: string): void {
    this.push({ title, message, variant: 'success' });
  }

  error(title: string, message: string): void {
    this.push({ title, message, variant: 'error' });
  }

  info(title: string, message: string): void {
    this.push({ title, message, variant: 'info' });
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));

    setTimeout(() => {
      this.toasts.update((items) => items.filter((toast) => toast.id !== id));
    }, this.removeAnimationMs);
  }

  private push(input: Omit<ToastItem, 'id' | 'closing'>): void {
    const id = ++this.idCounter;

    this.toasts.update((items) => [...items, { id, ...input, closing: false }]);

    setTimeout(() => {
      this.dismiss(id);
    }, this.defaultDurationMs);
  }
}
