import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RoomStoreService } from '../../data/room-store.service';
import { Room, RoomStatus } from '../../data/room.model';
import { RoomStatusBadge } from '../../components/room-status-badge/room-status-badge';
import { RoomStatsGrid } from '../../components/room-stats-grid/room-stats-grid';
import { ToastService } from '../../../../core/ui/toast.service';

type RoomFilter = 'ALL' | RoomStatus;

const FILTER_VALUES: RoomFilter[] = ['ALL', 'AVAILABLE', 'OCCUPIED'];
function isRoomFilter(value: string): value is RoomFilter {
  return FILTER_VALUES.includes(value as RoomFilter);
}

@Component({
  selector: 'app-room-management',
  imports: [RoomStatusBadge, RoomStatsGrid],
  templateUrl: './room-management.html',
  styleUrl: './room-management.css',
})
export class RoomManagement {
  private readonly roomStore = inject(RoomStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly filter = signal<RoomFilter>('ALL');
  readonly page = signal(1);
  readonly pageSize = 8;

  readonly rooms = this.roomStore.rooms;
  readonly loading = this.roomStore.loading;
  readonly errorMessage = this.roomStore.errorMessage;
  readonly stats = this.roomStore.stats;

  readonly filteredRooms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.filter();

    return this.rooms().filter((room) => {
      const matchesFilter = filter === 'ALL' || room.status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      return (
        room.number.toLowerCase().includes(query) ||
        room.name.toLowerCase().includes(query) ||
        room.block.toLowerCase().includes(query) ||
        room.floor.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query)
      );
    });
  });

  readonly totalPages = computed(() => {
    const total = this.filteredRooms().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly pagedRooms = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize;
    return this.filteredRooms().slice(start, start + this.pageSize);
  });

  readonly pageSummary = computed(() => {
    const total = this.filteredRooms().length;

    if (total === 0) {
      return 'Showing 0 rooms';
    }

    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize + 1;
    const end = Math.min(currentPage * this.pageSize, total);

    return `Showing ${start}-${end} of ${total} rooms`;
  });

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  setFilter(value: string): void {
    if (!isRoomFilter(value)) {
      return;
    }

    this.filter.set(value);
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filter.set('ALL');
    this.page.set(1);
  }

  async refresh(): Promise<void> {
    await this.roomStore.loadRooms();

    if (!this.errorMessage()) {
      this.toast.info('Rooms refreshed', 'Latest room inventory has been loaded.');
    }
  }

  addRoom(): void {
    this.router.navigate(['/rooms/new']);
  }

  editRoom(id: string): void {
    this.router.navigate(['/rooms', id, 'edit']);
  }

  async deleteRoom(id: string): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this room? This cannot be undone.')
    ) {
      return;
    }

    const deleted = await this.roomStore.deleteRoom(id);

    if (deleted) {
      this.toast.success('Room deleted', `Room ${id} has been removed.`);
    }
  }

  viewHostel(room: Room): void {
    this.router.navigate(['/hostels', room.hostelId]);
  }

  prevPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }

  statusButtonClass(selected: boolean): string {
    return selected
      ? 'bg-primary text-white border-primary'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';
  }

  occupancyText(room: Room): string {
    const pct = room.capacity === 0 ? 0 : Math.round((room.occupied / room.capacity) * 100);
    return `${room.occupied}/${room.capacity} (${pct}%)`;
  }

  hostelLabel(room: Room): string {
    return `${room.hostelName} - ${room.block}`;
  }
}
