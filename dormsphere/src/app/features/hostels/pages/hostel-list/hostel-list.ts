import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HostelNavbar } from '../../components/hostel-navbar/hostel-navbar';
import { Hostel, HostelStatus, HostelType } from '../../data/hostel.model';
import { HostelStoreService } from '../../data/hostel-store.service';

@Component({
  selector: 'app-hostel-list',
  imports: [HostelNavbar, RouterLink],
  templateUrl: './hostel-list.html',
  styleUrl: './hostel-list.css',
})
export class HostelList {
  private readonly hostelStore = inject(HostelStoreService);

  readonly hostels = this.hostelStore.hostels;
  readonly totals = this.hostelStore.totals;

  occupancyPercentage(hostel: Hostel): number {
    if (hostel.capacity <= 0) {
      return 0;
    }

    return Math.round((hostel.occupiedBeds / hostel.capacity) * 100);
  }

  occupancyBarClass(hostel: Hostel): string {
    const value = this.occupancyPercentage(hostel);

    if (value >= 95) {
      return 'bg-red-500';
    }

    if (value >= 75) {
      return 'bg-amber-500';
    }

    return 'bg-emerald-500';
  }

  occupancyTextClass(hostel: Hostel): string {
    const value = this.occupancyPercentage(hostel);

    if (value >= 95) {
      return 'text-red-500';
    }

    if (value >= 75) {
      return 'text-amber-500';
    }

    return 'text-emerald-500';
  }

  typeBadgeClass(type: HostelType): string {
    switch (type) {
      case 'BOYS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'GIRLS':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      default:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    }
  }

  statusBadgeClass(status: HostelStatus): string {
    switch (status) {
      case 'ALMOST FULL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'MAINTENANCE':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  }
}
