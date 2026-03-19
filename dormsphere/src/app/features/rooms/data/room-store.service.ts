import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HostelStoreService } from '../../hostels/data/hostel-store.service';
import { ApiRoom, NewRoomInput, Room, RoomStats, RoomStatus, RoomType } from './room.model';

const ROOMS_API_BASE_URL = '/api/rooms';

interface RoomCreateOrUpdatePayload {
  hostel_id: number;
  room_number: string;
  capacity: number;
}

@Injectable({ providedIn: 'root' })
export class RoomStoreService {
  private readonly http = inject(HttpClient);
  private readonly hostelStore = inject(HostelStoreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly stats = computed<RoomStats>(() => {
    const rooms = this.rooms();
    const total = rooms.length;
    const occupied = rooms.filter((room) => room.status === 'OCCUPIED').length;
    const maintenance = rooms.filter((room) => room.status === 'MAINTENANCE').length;
    const available = Math.max(total - occupied - maintenance, 0);

    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const filledBeds = rooms.reduce((sum, room) => sum + room.occupied, 0);
    const occupancyRate = totalCapacity === 0 ? 0 : (filledBeds / totalCapacity) * 100;

    return {
      total,
      available,
      occupied,
      maintenance,
      occupancyRate,
    };
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadRooms();
    }
  }

  getRoomById(id: string | null): Room | undefined {
    if (!id) {
      return undefined;
    }

    return this.rooms().find((room) => room.id === id);
  }

  async loadRooms(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await this.hostelStore.loadHostels();
      const apiRooms = await firstValueFrom(this.http.get<ApiRoom[]>(ROOMS_API_BASE_URL));
      this.rooms.set(apiRooms.map((room) => this.toRoom(room)));
    } catch (error) {
      this.errorMessage.set('Unable to load rooms. Please try again later.');
      console.error('Failed to load rooms from backend API.', error);
      this.rooms.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async addRoom(input: NewRoomInput): Promise<Room | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const created = await firstValueFrom(
        this.http.post<ApiRoom>(ROOMS_API_BASE_URL, this.toApiPayload(input)),
      );

      const mapped = this.toRoom(created);
      this.rooms.update((items) => [...items, mapped]);
      return mapped;
    } catch {
      this.errorMessage.set('Unable to create room. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async updateRoom(id: string, input: NewRoomInput): Promise<Room | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.put<ApiRoom>(`${ROOMS_API_BASE_URL}/${id}`, this.toApiPayload(input)),
      );

      const mapped = this.toRoom(updated);
      this.rooms.update((items) => items.map((room) => (room.id === id ? mapped : room)));
      return mapped;
    } catch {
      this.errorMessage.set('Unable to update room. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRoom(id: string): Promise<boolean> {
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${ROOMS_API_BASE_URL}/${id}`, { responseType: 'text' }),
      );

      this.rooms.update((items) => items.filter((room) => room.id !== id));
      return true;
    } catch {
      this.errorMessage.set('Unable to delete room. Please try again.');
      return false;
    }
  }

  private toApiPayload(input: NewRoomInput): RoomCreateOrUpdatePayload {
    return {
      hostel_id: Number(input.hostelId),
      room_number: input.number.trim(),
      capacity: Math.max(1, Number(input.capacity) || 1),
    };
  }

  private toRoom(apiRoom: ApiRoom): Room {
    const hostelId = String(apiRoom.hostel_id);
    const hostels = this.hostelStore.hostels();
    const hostel = hostels.find((item) => item.id === hostelId);

    const capacity = Math.max(1, Number(apiRoom.capacity || 0));
    const occupied = Math.max(0, Number(apiRoom.occupied_beds || 0));

    const status = this.deriveStatus(occupied, capacity);

    return {
      id: String(apiRoom.id),
      hostelId,
      hostelName: hostel?.name ?? `Hostel ${hostelId}`,
      number: apiRoom.room_number,
      name: `Room ${apiRoom.room_number}`,
      block: hostel?.location ?? 'Unassigned Block',
      floor: this.deriveFloorFromRoomNumber(apiRoom.room_number),
      type: this.deriveType(capacity),
      capacity,
      occupied: Math.min(occupied, capacity),
      status,
    };
  }

  private deriveStatus(occupied: number, capacity: number): RoomStatus {
    if (capacity <= 0 || occupied <= 0) {
      return 'AVAILABLE';
    }

    if (occupied >= capacity) {
      return 'OCCUPIED';
    }

    return 'AVAILABLE';
  }

  private deriveType(capacity: number): RoomType {
    if (capacity <= 1) {
      return 'Single';
    }

    if (capacity === 2) {
      return 'Double';
    }

    if (capacity === 3) {
      return 'Triple';
    }

    return 'Suite';
  }

  private deriveFloorFromRoomNumber(roomNumber: string): string {
    const firstDigit = Number.parseInt(roomNumber.trim().charAt(0), 10);

    if (!Number.isFinite(firstDigit) || firstDigit <= 0) {
      return 'Ground Floor';
    }

    if (firstDigit === 1) {
      return '1st Floor';
    }

    if (firstDigit === 2) {
      return '2nd Floor';
    }

    if (firstDigit === 3) {
      return '3rd Floor';
    }

    return `${firstDigit}th Floor`;
  }
}
