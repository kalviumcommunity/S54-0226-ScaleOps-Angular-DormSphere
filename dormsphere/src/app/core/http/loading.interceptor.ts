import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingService } from '../ui/loading.service';

const API_PATH_PATTERN = /\/api(?:\/|$)/i;

function isApiRequest(url: string): boolean {
  return API_PATH_PATTERN.test(url);
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.startRequest();

  return next(req).pipe(finalize(() => loadingService.endRequest()));
};
