import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { HostelNavbar } from '../../../hostels/components/hostel-navbar/hostel-navbar';
import { HostelStoreService } from '../../../hostels/data/hostel-store.service';

@Component({
  selector: 'app-shell',
  imports: [HostelNavbar, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly hostelStore = inject(HostelStoreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly sidebarOpen = signal(false);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly selectedHostel = computed(() => {
    const match = this.currentUrl().match(/^\/hostels\/([^/]+)$/);

    if (!match) {
      return undefined;
    }

    return this.hostelStore.getHostelById(match[1]);
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.hostelStore.loadHostels();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
