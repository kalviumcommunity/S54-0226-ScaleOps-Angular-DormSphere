import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { ToastService } from '../ui/toast.service';

const API_PATH_PATTERN = /\/api(?:\/|$)/i;
const REQUEST_TRANSITION_MS = 140;

function isApiRequest(url: string): boolean {
  return API_PATH_PATTERN.test(url);
}

function toTitleCase(method: string): string {
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}

export const toastInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const toastService = inject(ToastService);
  const method = req.method.toUpperCase();
  const showSuccessToast = method !== 'GET';

  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse) || !showSuccessToast) {
        return;
      }

      setTimeout(() => {
        toastService.success(
          `${toTitleCase(method)} request successful`,
          event.statusText || 'Completed successfully.',
        );
      }, REQUEST_TRANSITION_MS);
    }),
    catchError((error: HttpErrorResponse) => {
      const message = error.error?.message || error.message || 'Something went wrong. Please try again.';
      setTimeout(() => {
        toastService.error(`${toTitleCase(method)} request failed`, message);
      }, REQUEST_TRANSITION_MS);
      return throwError(() => error);
    }),
  );
};
