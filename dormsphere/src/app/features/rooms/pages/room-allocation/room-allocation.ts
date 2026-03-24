import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { StudentStoreService } from '../../../students/data/student-store.service';
import { RoomStoreService } from '../../data/room-store.service';
import { ToastService } from '../../../../core/ui/toast.service';

@Component({
  selector: 'app-room-allocation',
  imports: [NgClass],
  templateUrl: './room-allocation.html',
  styleUrl: './room-allocation.css',
})
export class RoomAllocation {
  private readonly studentStore = inject(StudentStoreService);
  private readonly roomStore = inject(RoomStoreService);
  private readonly toast = inject(ToastService);

  readonly selectedStudentId = signal<string | null>(null);

  readonly students = this.studentStore.students;
  readonly rooms = this.roomStore.rooms;

  readonly studentsLoading = this.studentStore.loading;
  readonly roomsLoading = this.roomStore.loading;
  readonly assigning = this.studentStore.saving;

  readonly errorMessage = computed(
    () => this.studentStore.errorMessage() ?? this.roomStore.errorMessage(),
  );

  readonly selectedStudent = computed(() => {
    const id = this.selectedStudentId();

    if (!id) {
      return undefined;
    }

    return this.students().find((student) => student.id === id);
  });

  readonly unassignedStudents = computed(() =>
    this.students().filter((student) => student.roomId === null),
  );

  readonly roomsWithAvailability = computed(() =>
    this.rooms().map((room) => {
      const availableBeds = Math.max(room.capacity - room.occupied, 0);

      return {
        ...room,
        availableBeds,
        isFull: availableBeds <= 0,
      };
    }),
  );

  readonly summary = computed(() => ({
    unassigned: this.unassignedStudents().length,
    rooms: this.rooms().length,
    availableBeds: this.roomsWithAvailability().reduce((sum, room) => sum + room.availableBeds, 0),
  }));

  selectStudent(studentId: string): void {
    this.selectedStudentId.set(studentId);
  }

  clearSelection(): void {
    this.selectedStudentId.set(null);
  }

  async refresh(): Promise<void> {
    await Promise.all([this.studentStore.loadStudents(), this.roomStore.loadRooms()]);

    if (!this.errorMessage()) {
      this.toast.info('Room allocation refreshed', 'Latest students and rooms were loaded.');
    }
  }

  async assignToRoom(roomId: string): Promise<void> {
    const student = this.selectedStudent();

    if (!student) {
      this.toast.error('Student required', 'Please select an unassigned student first.');
      return;
    }

    const room = this.roomsWithAvailability().find((item) => item.id === roomId);

    if (!room || room.isFull) {
      this.toast.error('Room unavailable', 'This room is at full capacity. Choose another room.');
      return;
    }

    const updated = await this.studentStore.assignRoom(student.id, roomId);

    if (!updated) {
      return;
    }

    await this.roomStore.loadRooms();
    this.selectedStudentId.set(null);
    this.toast.success('Room assigned', `${student.name} was assigned to Room ${room.number}.`);
  }

  roomMeta(roomNumber: string, hostelName: string): string {
    return `${hostelName} - Room ${roomNumber}`;
  }
}
