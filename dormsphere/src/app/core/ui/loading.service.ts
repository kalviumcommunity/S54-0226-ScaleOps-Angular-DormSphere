import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeRequests = signal(0);
  private readonly activeNavigations = signal(0);
  private readonly isVisible = signal(false);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleSince = 0;
  private readonly minimumVisibleMs = 280;

  readonly isBusy = computed(() => this.isVisible());

  startRequest(): void {
    this.activeRequests.update((value) => value + 1);
    this.refreshVisibility();
  }

  endRequest(): void {
    this.activeRequests.update((value) => Math.max(0, value - 1));
    this.refreshVisibility();
  }

  startNavigation(): void {
    this.activeNavigations.update((value) => value + 1);
    this.refreshVisibility();
  }

  endNavigation(): void {
    this.activeNavigations.update((value) => Math.max(0, value - 1));
    this.refreshVisibility();
  }

  private refreshVisibility(): void {
    const shouldShow = this.activeRequests() > 0 || this.activeNavigations() > 0;

    if (shouldShow) {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }

      if (!this.isVisible()) {
        this.visibleSince = Date.now();
        this.isVisible.set(true);
      }

      return;
    }

    if (!this.isVisible()) {
      return;
    }

    const elapsed = Date.now() - this.visibleSince;
    const delayMs = Math.max(this.minimumVisibleMs - elapsed, 0);

    if (delayMs === 0) {
      this.isVisible.set(false);
      return;
    }

    this.hideTimer = setTimeout(() => {
      this.isVisible.set(false);
      this.hideTimer = null;
    }, delayMs);
  }
}