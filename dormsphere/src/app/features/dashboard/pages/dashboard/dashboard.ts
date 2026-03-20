import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HostelStoreService } from '../../../hostels/data/hostel-store.service';
import { ToastService } from '../../../../core/ui/toast.service';

interface KpiCard {
  label: string;
  value: string;
  trend: number;
  helper: string;
}

interface OccupancyPoint {
  month: string;
  value: number;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly hostelStore = inject(HostelStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly adminName = 'Admin';
  readonly searchQuery = signal('');

  readonly hostels = this.hostelStore.hostels;
  readonly loading = this.hostelStore.loading;
  readonly errorMessage = this.hostelStore.errorMessage;
  readonly totals = this.hostelStore.totals;

  readonly filteredHostels = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return this.hostels().filter((hostel) => {
      if (query.length === 0) {
        return true;
      }

      return (
        hostel.name.toLowerCase().includes(query)
        || hostel.location.toLowerCase().includes(query)
        || hostel.type.toLowerCase().includes(query)
        || hostel.status.toLowerCase().includes(query)
        || hostel.id.toLowerCase().includes(query)
      );
    });
  });

  readonly kpis = computed<KpiCard[]>(() => {
    const totals = this.totals();
    const hostelCount = this.filteredHostels().length;
    const baseOccupancy = totals.occupancyRate;
    const availabilityRatio = totals.totalCapacity === 0
      ? 0
      : (totals.availableBeds / totals.totalCapacity) * 100;

    return [
      {
        label: 'Total Hostels',
        value: String(hostelCount),
        trend: Math.round(Math.min(12, hostelCount * 0.6) * 10) / 10,
        helper: 'Live facilities mapped',
      },
      {
        label: 'Total Capacity',
        value: String(totals.totalCapacity),
        trend: Math.round(Math.min(15, totals.totalCapacity / 120) * 10) / 10,
        helper: 'Beds across selected hostels',
      },
      {
        label: 'Occupied Beds',
        value: String(totals.occupiedBeds),
        trend: Math.round((baseOccupancy - 70) * 10) / 10,
        helper: 'Current utilization load',
      },
      {
        label: 'Available Beds',
        value: String(totals.availableBeds),
        trend: Math.round((availabilityRatio - 20) * 10) / 10,
        helper: 'Immediate allocation pool',
      },
    ];
  });

  readonly occupancyData = computed<OccupancyPoint[]>(() => {
    const rate = this.totals().occupancyRate;
    const monthAxis = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const offsetPattern = [-6, -2, 1, 4, 7, 3];

    return monthAxis.map((month, index) => {
      const value = Math.round(Math.min(100, Math.max(10, rate + offsetPattern[index])));
      return { month, value };
    });
  });

  readonly activities = computed<ActivityItem[]>(() => {
    const items = [...this.filteredHostels()]
      .sort((a, b) => b.occupiedBeds - a.occupiedBeds)
      .slice(0, 5);

    return items.map((hostel, index) => {
      const occupancyRate = hostel.capacity === 0
        ? 0
        : Math.round((hostel.occupiedBeds / hostel.capacity) * 100);

      return {
        title: `${hostel.name} occupancy update`,
        description: `${hostel.occupiedBeds}/${hostel.capacity} beds occupied (${occupancyRate}%)`,
        time: `${index + 1}h ago`,
      };
    });
  });

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  kpiTrendClass(value: number): string {
    if (value > 0) {
      return 'text-emerald-600 dark:text-emerald-400';
    }

    if (value < 0) {
      return 'text-red-600 dark:text-red-400';
    }

    return 'text-slate-500 dark:text-slate-400';
  }

  trendLabel(value: number): string {
    if (value > 0) {
      return `+${value.toFixed(1)}%`;
    }

    return `${value.toFixed(1)}%`;
  }

  occupancySummary(): string {
    const totals = this.totals();

    if (totals.totalCapacity === 0) {
      return 'No occupancy information available yet.';
    }

    return `${totals.occupancyRate.toFixed(1)}% average occupancy across ${this.filteredHostels().length} hostels`;
  }

  async refresh(): Promise<void> {
    await this.hostelStore.loadHostels();
    this.toast.info('Dashboard refreshed', 'Latest hostel metrics were fetched successfully.');
  }

  addHostel(): void {
    this.router.navigate(['/hostels/new']);
  }

  addStudent(): void {
    this.router.navigate(['/students/new']);
  }

  allocateRoom(): void {
    this.router.navigate(['/rooms']);
  }

  generateInvoice(): void {
    this.toast.info('Billing module', 'Invoice generation is being enabled in the next release.');
  }

  broadcast(): void {
    this.toast.info('Broadcast center', 'Announcement broadcast tools are coming soon.');
  }
}