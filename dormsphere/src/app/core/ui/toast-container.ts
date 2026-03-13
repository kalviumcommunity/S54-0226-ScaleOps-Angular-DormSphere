import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <section class="toast-center" aria-live="polite" aria-atomic="true">
      @for (toast of toasts(); track toast.id) {
        <article
          class="toast"
          [class.toast--success]="toast.variant === 'success'"
          [class.toast--error]="toast.variant === 'error'"
          [class.toast--info]="toast.variant === 'info'"
          [class.toast--closing]="toast.closing"
        >
          <div class="toast__content">
            <strong class="toast__title">{{ toast.title }}</strong>
            <p class="toast__message">{{ toast.message }}</p>
          </div>

          <button
            type="button"
            class="toast__dismiss interactive"
            aria-label="Dismiss notification"
            (click)="dismiss(toast.id)"
          >
            x
          </button>
        </article>
      }
    </section>
  `,
})
export class ToastContainer {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
