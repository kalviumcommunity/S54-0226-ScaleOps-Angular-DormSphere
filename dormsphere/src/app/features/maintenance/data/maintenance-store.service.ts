import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ApiMaintenanceRequest,
  MaintenanceRequest,
  MaintenanceStats,
  MaintenanceStatus,
  NewMaintenanceRequestInput,
} from './maintenance.model';

const MAINTENANCE_API_BASE_URL = '/api/maintenance';

interface MaintenancePayload {
  room_id: number | null;
  description: string;
  status: MaintenanceStatus;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceStoreService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly requests = signal<MaintenanceRequest[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly stats = computed<MaintenanceStats>(() => {
    const requests = this.requests();

    return {
      total: requests.length,
      open: requests.filter((item) => item.status === 'OPEN').length,
      inProgress: requests.filter((item) => item.status === 'IN_PROGRESS').length,
      resolved: requests.filter((item) => item.status === 'RESOLVED').length,
    };
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadRequests();
    }
  }

  getById(id: string | null): MaintenanceRequest | undefined {
    if (!id) {
      return undefined;
    }

    return this.requests().find((item) => item.id === id);
  }

  async loadRequests(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const apiData = await firstValueFrom(
        this.http.get<ApiMaintenanceRequest[]>(MAINTENANCE_API_BASE_URL),
      );

      this.requests.set(apiData.map((item) => this.toRequest(item)));
    } catch (error) {
      this.errorMessage.set('Unable to load maintenance requests. Please try again later.');
      console.error('Failed to load maintenance requests from backend API.', error);
      this.requests.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async addRequest(input: NewMaintenanceRequestInput): Promise<MaintenanceRequest | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const created = await firstValueFrom(
        this.http.post<ApiMaintenanceRequest>(
          MAINTENANCE_API_BASE_URL,
          this.toApiPayload(input),
        ),
      );

      const mapped = this.toRequest(created);
      this.requests.update((items) => [mapped, ...items]);
      return mapped;
    } catch {
      this.errorMessage.set('Unable to create maintenance request. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async updateRequest(
    id: string,
    input: NewMaintenanceRequestInput,
  ): Promise<MaintenanceRequest | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.put<ApiMaintenanceRequest>(
          `${MAINTENANCE_API_BASE_URL}/${id}`,
          this.toApiPayload(input),
        ),
      );

      const mapped = this.toRequest(updated);
      this.requests.update((items) => items.map((item) => (item.id === id ? mapped : item)));
      return mapped;
    } catch {
      this.errorMessage.set('Unable to update maintenance request. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRequest(id: string): Promise<boolean> {
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${MAINTENANCE_API_BASE_URL}/${id}`, { responseType: 'text' }),
      );

      this.requests.update((items) => items.filter((item) => item.id !== id));
      return true;
    } catch {
      this.errorMessage.set('Unable to delete maintenance request. Please try again.');
      return false;
    }
  }

  private toApiPayload(input: NewMaintenanceRequestInput): MaintenancePayload {
    return {
      room_id: this.toNullableNumber(input.roomId),
      description: input.description.trim(),
      status: input.status,
    };
  }

  private toRequest(apiItem: ApiMaintenanceRequest): MaintenanceRequest {
    return {
      id: String(apiItem.id),
      roomId: apiItem.room_id !== null ? String(apiItem.room_id) : null,
      roomNumber: apiItem.room_number,
      hostelId: apiItem.hostel_id !== null ? String(apiItem.hostel_id) : null,
      hostelName: apiItem.hostel_name,
      description: apiItem.description,
      status: this.normalizeStatus(apiItem.status),
      createdAt: apiItem.created_at,
    };
  }

  private normalizeStatus(value: string): MaintenanceStatus {
    const normalized = value.trim().toUpperCase();

    if (normalized === 'IN_PROGRESS') {
      return 'IN_PROGRESS';
    }

    if (normalized === 'RESOLVED') {
      return 'RESOLVED';
    }

    return 'OPEN';
  }

  private toNullableNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
