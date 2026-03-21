import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-hostel-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './hostel-navbar.html',
  styleUrl: './hostel-navbar.css',
})
export class HostelNavbar {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'dormsphere-theme';

  private readonly darkMode = signal(false);

  readonly darkModeLabel = computed(() => this.darkMode() ? 'Switch to light mode' : 'Switch to dark mode');
  readonly darkModeIcon = computed(() => this.darkMode() ? 'light_mode' : 'dark_mode');

  constructor() {
    this.initializeTheme();
  }

  toggleTheme(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    this.applyTheme(next);
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const saved = localStorage.getItem(this.storageKey);
    const initialDarkMode = saved === 'dark';

    this.darkMode.set(initialDarkMode);
    this.applyTheme(initialDarkMode);
  }

  private applyTheme(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
  }
}
