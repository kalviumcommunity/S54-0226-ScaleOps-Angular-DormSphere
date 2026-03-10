import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { HostelStoreService } from '../../data/hostel-store.service';

interface FloorOccupancy {
  level: number;
  label: string;
  occupied: number;
  capacity: number;
  occupancyPct: number;
  track: Array<'ok' | 'warn' | 'full'>;
}

interface RoomMixItem {
  name: string;
  occupied: number;
  capacity: number;
  pct: number;
}

interface TicketItem {
  id: string;
  severity: 'URGENT' | 'MEDIUM';
  title: string;
  description: string;
  age: string;
  assignees: number;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
  tone: 'good' | 'info' | 'warn';
}

@Component({
  selector: 'app-hostel-detail-view',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './hostel-detail-view.html',
  styleUrl: './hostel-detail-view.css',
})
export class HostelDetailView {
  private readonly hostelStore = inject(HostelStoreService);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;

  readonly hostelId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null }
  );

  get hostel() {
    return this.hostelStore.getHostelById(this.hostelId());
  }

  get occupancyRate(): number {
    if (!this.hostel || this.hostel.capacity === 0) {
      return 0;
    }

    return Math.round((this.hostel.occupiedBeds / this.hostel.capacity) * 100);
  }

  get availableBeds(): number {
    if (!this.hostel) {
      return 0;
    }

    return Math.max(this.hostel.capacity - this.hostel.occupiedBeds, 0);
  }

  get activeTicketsCount(): number {
    if (!this.hostel) {
      return 0;
    }

    if (this.hostel.status === 'MAINTENANCE') {
      return 14;
    }

    if (this.hostel.status === 'ALMOST FULL') {
      return 12;
    }

    if (this.hostel.status === 'FULLY OCCUPIED') {
      return 9;
    }

    return 4;
  }

  get floorBreakdown(): FloorOccupancy[] {
    if (!this.hostel) {
      return [];
    }

    const hostel = this.hostel;

    const labels = ['Premium Singles', 'Double Shared', 'Double Shared', 'Triple Shared'];
    const floors = 4;
    const baseCap = Math.floor(hostel.capacity / floors);
    const capacities = Array.from({ length: floors }, (_, idx) =>
      idx === 0 ? baseCap + (hostel.capacity % floors) : baseCap
    );

    let remaining = hostel.occupiedBeds;

    return capacities.map((capacity, index) => {
      const occupied = Math.min(remaining, capacity);
      remaining -= occupied;
      const occupancyPct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

      return {
        level: floors - index,
        label: labels[index],
        occupied,
        capacity,
        occupancyPct,
        track: this.buildTrack(occupancyPct),
      };
    });
  }

  get roomMix(): RoomMixItem[] {
    if (!this.hostel) {
      return [];
    }

    const hostel = this.hostel;

    const mixes = [
      { name: 'Single Rooms', share: 0.3 },
      { name: 'Double Rooms', share: 0.35 },
      { name: 'Triple Rooms', share: 0.35 },
    ];

    let assignedCapacity = 0;
    let assignedOccupied = 0;

    return mixes.map((mix, index) => {
      const isLast = index === mixes.length - 1;
      const capacity = isLast
        ? hostel.capacity - assignedCapacity
        : Math.round(hostel.capacity * mix.share);
      const occupied = isLast
        ? hostel.occupiedBeds - assignedOccupied
        : Math.round(hostel.occupiedBeds * mix.share);

      assignedCapacity += capacity;
      assignedOccupied += occupied;

      return {
        name: mix.name,
        occupied,
        capacity,
        pct: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
      };
    });
  }

  get tickets(): TicketItem[] {
    const base = this.hostel?.id ?? 'HST';

    return [
      {
        id: `${base}-4412`,
        severity: 'URGENT',
        title: 'Water Leakage - Room 302',
        description: 'Heavy leakage in the bathroom ceiling reported by resident.',
        age: '2h ago',
        assignees: 2,
      },
      {
        id: `${base}-4409`,
        severity: 'MEDIUM',
        title: 'AC Not Cooling - Room 105',
        description: 'Unit makes noise and fails to reach target temperature.',
        age: '5h ago',
        assignees: 1,
      },
    ];
  }

  get recentActivity(): ActivityItem[] {
    return [
      {
        title: 'New Resident Check-in',
        description: 'Alex Johnson moved into Room 402B',
        time: 'Today, 10:45 AM',
        tone: 'good',
      },
      {
        title: 'Inspection Completed',
        description: 'Quarterly safety inspection completed for Floor 2',
        time: 'Yesterday, 4:20 PM',
        tone: 'info',
      },
      {
        title: 'Maintenance Ticket Logged',
        description: 'AC system issue reported in west wing corridor',
        time: 'Jul 14, 2:15 PM',
        tone: 'warn',
      },
    ];
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  floorStatusClass(value: number): string {
    if (value >= 100) {
      return 'bg-slate-400';
    }

    if (value >= 95) {
      return 'bg-orange-400';
    }

    return 'bg-green-500';
  }

  activityDotClass(tone: ActivityItem['tone']): string {
    switch (tone) {
      case 'good':
        return 'bg-green-500';
      case 'warn':
        return 'bg-orange-400';
      default:
        return 'bg-primary';
    }
  }

  private buildTrack(occupancyPct: number): Array<'ok' | 'warn' | 'full'> {
    const slots = 5;
    const filled = Math.round((occupancyPct / 100) * slots);

    return Array.from({ length: slots }, (_, idx) => {
      if (idx >= filled) {
        return 'full';
      }

      if (occupancyPct >= 100) {
        return 'full';
      }

      if (occupancyPct >= 95 && idx === filled - 1) {
        return 'warn';
      }

      return 'ok';
    });
  }

  trackSegmentClass(segment: 'ok' | 'warn' | 'full'): string {
    switch (segment) {
      case 'ok':
        return 'bg-green-500';
      case 'warn':
        return 'bg-orange-400';
      default:
        return 'bg-slate-400';
    }
  }
}
