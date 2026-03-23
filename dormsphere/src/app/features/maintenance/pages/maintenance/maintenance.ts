import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoomStoreService } from '../../../rooms/data/room-store.service';
import { ToastService } from '../../../../core/ui/toast.service';
import { MaintenanceStoreService } from '../../data/maintenance-store.service';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  NewMaintenanceRequestInput,
} from '../../data/maintenance.model';

@Component({
  selector: 'app-maintenance',
  imports: [DatePipe, NgClass, ReactiveFormsModule],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
})
export class Maintenance {
  private readonly maintenanceStore = inject(MaintenanceStoreService);
  private readonly roomStore = inject(RoomStoreService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  readonly page = signal(1);
  readonly pageSize = 8;
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'ALL' | MaintenanceStatus>('ALL');
  readonly editingId = signal<string | null>(null);

  readonly requests = this.maintenanceStore.requests;
  readonly loading = this.maintenanceStore.loading;
  readonly saving = this.maintenanceStore.saving;
  readonly errorMessage = this.maintenanceStore.errorMessage;
  readonly stats = this.maintenanceStore.stats;
  readonly rooms = this.roomStore.rooms;

  readonly form = this.formBuilder.nonNullable.group({
    roomId: [''],
    description: ['', [Validators.required, Validators.minLength(4)]],
    status: ['OPEN' as MaintenanceStatus, Validators.required],
  });

  readonly filteredRequests = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.requests().filter((request) => {
      const matchesStatus = status === 'ALL' || request.status === status;

      if (!matchesStatus) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      return (
        request.description.toLowerCase().includes(query) ||
        this.requestLocation(request).toLowerCase().includes(query) ||
        request.status.toLowerCase().includes(query)
      );
    });
  });

  readonly totalPages = computed(() => {
    const total = this.filteredRequests().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly pagedRequests = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize;
    return this.filteredRequests().slice(start, start + this.pageSize);
  });

  readonly pageSummary = computed(() => {
    const total = this.filteredRequests().length;

    if (total === 0) {
      return 'Showing 0 requests';
    }

    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize + 1;
    const end = Math.min(currentPage * this.pageSize, total);

    return `Showing ${start}-${end} of ${total} requests`;
  });

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  setStatusFilter(value: 'ALL' | MaintenanceStatus): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.page.set(1);
  }

  async refresh(): Promise<void> {
    await this.maintenanceStore.loadRequests();

    if (!this.errorMessage()) {
      this.toast.info('Maintenance refreshed', 'Latest maintenance requests have been loaded.');
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      roomId: '',
      description: '',
      status: 'OPEN',
    });
  }

  startEdit(item: MaintenanceRequest): void {
    this.editingId.set(item.id);
    this.form.patchValue({
      roomId: item.roomId ?? '',
      description: item.description,
      status: item.status,
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: NewMaintenanceRequestInput = {
      roomId: value.roomId || null,
      description: value.description.trim(),
      status: value.status,
    };

    const editingId = this.editingId();

    if (editingId) {
      const updated = await this.maintenanceStore.updateRequest(editingId, payload);

      if (!updated) {
        return;
      }

      this.toast.success('Request updated', `Maintenance ticket #${editingId} was updated.`);
      return;
    }

    const created = await this.maintenanceStore.addRequest(payload);

    if (!created) {
      return;
    }

    this.toast.success('Request created', `Maintenance ticket #${created.id} was created.`);
    this.form.reset({
      roomId: '',
      description: '',
      status: 'OPEN',
    });
  }

  async deleteRequest(id: string): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this maintenance request? This cannot be undone.')
    ) {
      return;
    }

    const deleted = await this.maintenanceStore.deleteRequest(id);

    if (deleted) {
      this.toast.success('Request deleted', `Maintenance ticket #${id} was removed.`);
    }
  }

  statusClass(status: MaintenanceStatus): string {
    if (status === 'RESOLVED') {
      return 'status-pill status-pill--success';
    }

    if (status === 'IN_PROGRESS') {
      return 'status-pill status-pill--warning';
    }

    return 'status-pill status-pill--danger';
  }

  requestLocation(request: MaintenanceRequest): string {
    if (request.hostelName && request.roomNumber) {
      return `${request.hostelName} - Room ${request.roomNumber}`;
    }

    if (request.roomNumber) {
      return `Room ${request.roomNumber}`;
    }

    return 'Common Area / Unassigned';
  }

  prevPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }

}
