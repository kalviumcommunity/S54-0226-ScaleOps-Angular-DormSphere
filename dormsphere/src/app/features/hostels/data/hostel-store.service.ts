import { Injectable, computed, signal } from '@angular/core';
import { Hostel, HostelStatus, HostelType } from './hostel.model';
import { INITIAL_HOSTELS } from './hostel.seed';

interface NewHostelInput {
  name: string;
  location: string;
  type: HostelType;
  wardenName: string;
  wardenExtension: string;
  capacity: number;
  occupiedBeds: number;
  status: HostelStatus;
}

const STORAGE_KEY = 'dormsphere.hostels';

@Injectable({ providedIn: 'root' })
export class HostelStoreService {
  readonly hostels = signal<Hostel[]>(this.loadHostels());

  readonly totals = computed(() => {
    const items = this.hostels();
    const totalCapacity = items.reduce((sum, hostel) => sum + hostel.capacity, 0);
    const occupiedBeds = items.reduce((sum, hostel) => sum + hostel.occupiedBeds, 0);
    const availableBeds = totalCapacity - occupiedBeds;
    const occupancyRate = totalCapacity === 0 ? 0 : (occupiedBeds / totalCapacity) * 100;

    return {
      totalCapacity,
      occupiedBeds,
      availableBeds,
      occupancyRate,
    };
  });

  getHostelById(id: string | null): Hostel | undefined {
    if (!id) {
      return undefined;
    }

    return this.hostels().find((hostel) => hostel.id === id);
  }

  addHostel(input: NewHostelInput): Hostel {
    const nextId = this.generateNextId();
    const hostel: Hostel = {
      id: nextId,
      ...input,
    };

    this.hostels.update((items) => [...items, hostel]);
    this.persistHostels();

    return hostel;
  }

  private loadHostels(): Hostel[] {
    if (typeof window === 'undefined') {
      return INITIAL_HOSTELS;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return INITIAL_HOSTELS;
    }

    try {
      const parsed = JSON.parse(stored) as Hostel[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HOSTELS;
    } catch {
      return INITIAL_HOSTELS;
    }
  }

  private persistHostels(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hostels()));
  }

  private generateNextId(): string {
    const year = new Date().getFullYear();
    const numbers = this.hostels()
      .map((hostel) => Number(hostel.id.split('-').at(-1)))
      .filter((value) => Number.isFinite(value));

    const nextNumber = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `HST-${year}-${String(nextNumber).padStart(3, '0')}`;
  }
}
