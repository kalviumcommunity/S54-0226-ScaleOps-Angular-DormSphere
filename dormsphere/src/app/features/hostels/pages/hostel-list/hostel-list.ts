import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hostel, HostelStatus, HostelType } from '../../data/hostel.model';
import { HostelStoreService } from '../../data/hostel-store.service';

type TypeFilter = 'ALL' | HostelType;
type StatusFilter = 'ANY' | HostelStatus;

const TYPE_FILTER_VALUES: TypeFilter[] = ['ALL', 'BOYS', 'GIRLS', 'CO-ED'];
const STATUS_FILTER_VALUES: StatusFilter[] = [
  'ANY',
  'AVAILABLE',
  'ALMOST FULL',
  'FULLY OCCUPIED',
  'MAINTENANCE',
];

function isTypeFilter(value: string): value is TypeFilter {
  return TYPE_FILTER_VALUES.includes(value as TypeFilter);
}

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_FILTER_VALUES.includes(value as StatusFilter);
}

@Component({
  selector: 'app-hostel-list',
  imports: [RouterLink],
  templateUrl: './hostel-list.html',
  styleUrl: './hostel-list.css',
})
export class HostelList {
  private readonly hostelStore = inject(HostelStoreService);

  readonly searchTerm = signal('');
  readonly selectedType = signal<TypeFilter>('ALL');
  readonly selectedStatus = signal<StatusFilter>('ANY');

  readonly hostels = this.hostelStore.hostels;
  readonly filteredHostels = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const selectedType = this.selectedType();
    const selectedStatus = this.selectedStatus();

    return this.hostels().filter((hostel) => {
      const matchesType = selectedType === 'ALL' || hostel.type === selectedType;
      const matchesStatus = selectedStatus === 'ANY' || hostel.status === selectedStatus;

      const matchesQuery =
        query.length === 0
        || hostel.name.toLowerCase().includes(query)
        || hostel.location.toLowerCase().includes(query)
        || hostel.wardenName.toLowerCase().includes(query)
        || hostel.id.toLowerCase().includes(query);

      return matchesType && matchesStatus && matchesQuery;
    });
  });
  readonly totals = this.hostelStore.totals;
  readonly loading = this.hostelStore.loading;
  readonly errorMessage = this.hostelStore.errorMessage;

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setTypeFilter(value: string): void {
    if (!isTypeFilter(value)) {
      return;
    }

    this.selectedType.set(value);
  }

  setStatusFilter(value: string): void {
    if (!isStatusFilter(value)) {
      return;
    }

    this.selectedStatus.set(value);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('ALL');
    this.selectedStatus.set('ANY');
  }

  async deleteHostel(id: string): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm('Delete this hostel? This cannot be undone.')) {
      return;
    }

    await this.hostelStore.deleteHostel(id);
  }

  occupancyPercentage(hostel: Hostel): number {
    if (hostel.capacity <= 0) {
      return 0;
    }

    const value = Math.round((hostel.occupiedBeds / hostel.capacity) * 100);
    return Math.min(Math.max(value, 0), 100);
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
