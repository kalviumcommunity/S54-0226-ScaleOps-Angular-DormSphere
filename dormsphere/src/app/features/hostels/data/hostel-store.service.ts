import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiHostel, Hostel, HostelStatus, HostelType, NewHostelInput } from './hostel.model';

interface HostelMetadata {
  type: HostelType;
  wardenName: string;
  wardenExtension: string;
  occupiedBeds: number;
  status: HostelStatus;
}

interface HostelCreateOrUpdatePayload {
  name: string;
  location: string | null;
  total_capacity: number;
}

const HOSTELS_API_BASE_URL = '/api/hostels';
const HOSTEL_META_STORAGE_KEY = 'dormsphere.hostel-metadata';

@Injectable({ providedIn: 'root' })
export class HostelStoreService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly metadata = signal<Record<string, HostelMetadata>>(this.loadMetadata());

  readonly hostels = signal<Hostel[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly totals = computed(() => {
    const items = this.hostels();
    const totalCapacity = items.reduce((sum, hostel) => sum + hostel.capacity, 0);
    const occupiedBeds = items.reduce((sum, hostel) => sum + hostel.occupiedBeds, 0);
    const availableBeds = Math.max(totalCapacity - occupiedBeds, 0);
    const occupancyRate = totalCapacity === 0 ? 0 : (occupiedBeds / totalCapacity) * 100;

    return {
      totalCapacity,
      occupiedBeds,
      availableBeds,
      occupancyRate,
    };
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadHostels();
    }
  }

  getHostelById(id: string | null): Hostel | undefined {
    if (!id) {
      return undefined;
    }

    return this.hostels().find((hostel) => hostel.id === id);
  }

  async loadHostels(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const apiHostels = await firstValueFrom(this.http.get<ApiHostel[]>(HOSTELS_API_BASE_URL));
      this.hostels.set(apiHostels.map((item) => this.toHostel(item)));
    } catch {
      this.errorMessage.set('Unable to load hostels from backend API. Verify the Rust server is running on port 8000 and restart ng serve so the proxy is active.');
      this.hostels.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async addHostel(input: NewHostelInput): Promise<Hostel> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const created = await firstValueFrom(
        this.http.post<ApiHostel>(HOSTELS_API_BASE_URL, this.toApiPayload(input))
      );

      this.upsertMetadata(String(created.id), {
        type: input.type,
        wardenName: input.wardenName,
        wardenExtension: input.wardenExtension,
        occupiedBeds: Math.min(input.occupiedBeds, input.capacity),
        status: input.status,
      });

      const mapped = this.toHostel(created);
      this.hostels.update((items) => [...items, mapped]);
      return mapped;
    } catch {
      this.errorMessage.set('Unable to create hostel. Please try again.');
      throw new Error('Create hostel failed');
    } finally {
      this.saving.set(false);
    }
  }

  async updateHostel(id: string, input: NewHostelInput): Promise<Hostel | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.put<ApiHostel>(`${HOSTELS_API_BASE_URL}/${id}`, this.toApiPayload(input))
      );

      this.upsertMetadata(String(updated.id), {
        type: input.type,
        wardenName: input.wardenName,
        wardenExtension: input.wardenExtension,
        occupiedBeds: Math.min(input.occupiedBeds, input.capacity),
        status: input.status,
      });

      const mapped = this.toHostel(updated);

      this.hostels.update((items) =>
        items.map((hostel) => (hostel.id === id ? mapped : hostel))
      );

      return mapped;
    } catch {
      this.errorMessage.set('Unable to update hostel. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteHostel(id: string): Promise<boolean> {
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.http.delete(`${HOSTELS_API_BASE_URL}/${id}`, { responseType: 'text' }));
      this.hostels.update((items) => items.filter((hostel) => hostel.id !== id));
      this.removeMetadata(id);
      return true;
    } catch {
      this.errorMessage.set('Unable to delete hostel. Please try again.');
      return false;
    }
  }

  private toApiPayload(input: NewHostelInput): HostelCreateOrUpdatePayload {
    return {
      name: input.name.trim(),
      location: input.location.trim() || null,
      total_capacity: Math.max(0, Number(input.capacity) || 0),
    };
  }

  private toHostel(apiHostel: ApiHostel): Hostel {
    const id = String(apiHostel.id);
    const capacity = Math.max(0, Number(apiHostel.total_capacity ?? 0));
    const existingMeta = this.metadata()[id];

    const fallbackOccupied = Math.round(capacity * this.derivedOccupancyRatio(apiHostel.id));
    const occupiedBeds = Math.min(existingMeta?.occupiedBeds ?? fallbackOccupied, capacity);

    const status = existingMeta?.status ?? this.deriveStatus(occupiedBeds, capacity);

    return {
      id,
      name: apiHostel.name,
      location: apiHostel.location ?? 'Unassigned Campus Block',
      type: existingMeta?.type ?? this.deriveType(apiHostel.id),
      wardenName: existingMeta?.wardenName ?? this.deriveWardenName(apiHostel.id),
      wardenExtension: existingMeta?.wardenExtension ?? this.deriveWardenExtension(apiHostel.id),
      capacity,
      occupiedBeds,
      status,
    };
  }

  private deriveStatus(occupiedBeds: number, capacity: number): HostelStatus {
    if (capacity <= 0) {
      return 'AVAILABLE';
    }

    const occupancyPct = (occupiedBeds / capacity) * 100;

    if (occupancyPct >= 100) {
      return 'FULLY OCCUPIED';
    }

    if (occupancyPct >= 80) {
      return 'ALMOST FULL';
    }

    return 'AVAILABLE';
  }

  private deriveType(id: number): HostelType {
    const index = Math.abs(id) % 3;

    if (index === 0) {
      return 'CO-ED';
    }

    if (index === 1) {
      return 'BOYS';
    }

    return 'GIRLS';
  }

  private derivedOccupancyRatio(id: number): number {
    const band = Math.abs(id) % 4;

    if (band === 0) {
      return 0.95;
    }

    if (band === 1) {
      return 0.82;
    }

    if (band === 2) {
      return 0.68;
    }

    return 0.54;
  }

  private deriveWardenName(id: number): string {
    const names = ['Dr. Meera Singh', 'Prof. Daniel Carter', 'Ms. Ananya Rao', 'Mr. Ethan Blake'];
    return names[Math.abs(id) % names.length];
  }

  private deriveWardenExtension(id: number): string {
    const value = 4100 + (Math.abs(id) % 800);
    return String(value);
  }

  private loadMetadata(): Record<string, HostelMetadata> {
    if (typeof window === 'undefined') {
      return {};
    }

    const raw = window.localStorage.getItem(HOSTEL_META_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, HostelMetadata>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistMetadata(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(HOSTEL_META_STORAGE_KEY, JSON.stringify(this.metadata()));
  }

  private upsertMetadata(id: string, metadata: HostelMetadata): void {
    this.metadata.update((value) => ({
      ...value,
      [id]: metadata,
    }));

    this.persistMetadata();
  }

  private removeMetadata(id: string): void {
    this.metadata.update((value) => {
      const next = { ...value };
      delete next[id];
      return next;
    });

    this.persistMetadata();
  }
}
