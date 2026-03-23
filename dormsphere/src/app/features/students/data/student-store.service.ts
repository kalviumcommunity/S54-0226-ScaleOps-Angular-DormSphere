import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiStudent, NewStudentInput, Student, StudentStats, StudentStatus } from './student.model';
import { environment } from '../../../../environments/environment';

const STUDENTS_API_BASE_URL = `${environment.apiUrl}/api/students`;
const DEFAULT_AVATAR_URL = 'https://i.pravatar.cc/64?img=12';

interface StudentCreatePayload {
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  status: StudentStatus;
  avatar_url: string | null;
  room_id: number | null;
}

interface StudentUpdatePayload {
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  status: StudentStatus;
  avatar_url: string | null;
  room_id: number | null;
}

@Injectable({ providedIn: 'root' })
export class StudentStoreService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly stats = computed<StudentStats>(() => {
    const students = this.students();

    return {
      total: students.length,
      assigned: students.filter((item) => item.roomId !== null).length,
      waitlist: students.filter((item) => item.roomId === null).length,
      active: students.filter((item) => item.status === 'ACTIVE').length,
    };
  });

  readonly departments = computed(() => {
    const values = new Set<string>();

    for (const student of this.students()) {
      const department = student.department.trim();

      if (department.length > 0) {
        values.add(department);
      }
    }

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadStudents();
    }
  }

  getStudentById(id: string | null): Student | undefined {
    if (!id) {
      return undefined;
    }

    return this.students().find((student) => student.id === id);
  }

  async loadStudents(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const apiStudents = await firstValueFrom(this.http.get<ApiStudent[]>(STUDENTS_API_BASE_URL));
      this.students.set(apiStudents.map((student) => this.toStudent(student)));
    } catch (error) {
      this.errorMessage.set('Unable to load students. Please try again later.');
      console.error('Failed to load students from backend API.', error);
      this.students.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async addStudent(input: NewStudentInput): Promise<Student | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const created = await firstValueFrom(
        this.http.post<ApiStudent>(STUDENTS_API_BASE_URL, this.toCreatePayload(input)),
      );

      const mapped = this.toStudent(created);
      this.students.update((items) => [...items, mapped]);
      return mapped;
    } catch {
      this.errorMessage.set('Unable to create student. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async updateStudent(id: string, input: NewStudentInput): Promise<Student | undefined> {
    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.put<ApiStudent>(`${STUDENTS_API_BASE_URL}/${id}`, this.toUpdatePayload(input)),
      );

      const mapped = this.toStudent(updated);
      this.students.update((items) => items.map((student) => (student.id === id ? mapped : student)));
      return mapped;
    } catch {
      this.errorMessage.set('Unable to update student. Please try again.');
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${STUDENTS_API_BASE_URL}/${id}`, { responseType: 'text' }),
      );

      this.students.update((items) => items.filter((student) => student.id !== id));
      return true;
    } catch {
      this.errorMessage.set('Unable to delete student. Please try again.');
      return false;
    }
  }

  private toCreatePayload(input: NewStudentInput): StudentCreatePayload {
    return {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: this.toNullable(input.phone),
      department: this.toNullable(input.department),
      status: input.status,
      avatar_url: this.toNullable(input.avatarUrl),
      room_id: this.toNullableNumber(input.roomId),
    };
  }

  private toUpdatePayload(input: NewStudentInput): StudentUpdatePayload {
    return {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: this.toNullable(input.phone),
      department: this.toNullable(input.department),
      status: input.status,
      avatar_url: this.toNullable(input.avatarUrl),
      room_id: this.toNullableNumber(input.roomId),
    };
  }

  private toStudent(apiStudent: ApiStudent): Student {
    return {
      id: String(apiStudent.id),
      name: apiStudent.name,
      email: apiStudent.email,
      phone: apiStudent.phone ?? '',
      department: apiStudent.department ?? 'General',
      status: this.normalizeStatus(apiStudent.status),
      avatarUrl: apiStudent.avatar_url ?? DEFAULT_AVATAR_URL,
      roomId: apiStudent.room_id !== null ? String(apiStudent.room_id) : null,
      roomNumber: apiStudent.room_number,
      hostelId: apiStudent.hostel_id !== null ? String(apiStudent.hostel_id) : null,
      hostelName: apiStudent.hostel_name,
    };
  }

  private normalizeStatus(value: string): StudentStatus {
    const normalized = value.trim().toUpperCase();

    if (normalized === 'PENDING') {
      return 'PENDING';
    }

    if (normalized === 'GRADUATED') {
      return 'GRADUATED';
    }

    return 'ACTIVE';
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toNullableNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
