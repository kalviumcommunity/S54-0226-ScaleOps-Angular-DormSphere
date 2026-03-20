import { Component, PLATFORM_ID, computed, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { RoomStoreService } from '../../../rooms/data/room-store.service';
import { NewStudentInput, StudentStatus } from '../../data/student.model';
import { StudentStoreService } from '../../data/student-store.service';

@Component({
  selector: 'app-student-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './student-form-page.html',
  styleUrl: './student-form-page.css',
})
export class StudentFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly studentStore = inject(StudentStoreService);
  private readonly roomStore = inject(RoomStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly statuses: StudentStatus[] = ['ACTIVE', 'PENDING', 'GRADUATED'];

  readonly rooms = this.roomStore.rooms;
  readonly loading = this.studentStore.loading;
  readonly saving = this.studentStore.saving;
  readonly errorMessage = this.studentStore.errorMessage;

  readonly editingStudentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  readonly editingStudent = computed(() => this.studentStore.getStudentById(this.editingStudentId()));
  readonly isEditMode = computed(() => this.editingStudent() !== undefined);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    department: ['', Validators.required],
    status: ['ACTIVE' as StudentStatus, Validators.required],
    roomId: [''],
    avatarUrl: [''],
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.studentStore.loadStudents();
      void this.roomStore.loadRooms();
    }

    effect(() => {
      const student = this.editingStudent();

      if (!student) {
        this.form.reset({
          name: '',
          email: '',
          phone: '',
          department: '',
          status: 'ACTIVE',
          roomId: '',
          avatarUrl: '',
        });
        return;
      }

      this.form.patchValue({
        name: student.name,
        email: student.email,
        phone: student.phone,
        department: student.department,
        status: student.status,
        roomId: student.roomId ?? '',
        avatarUrl: student.avatarUrl,
      });
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload: NewStudentInput = {
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      department: value.department.trim(),
      status: value.status,
      roomId: value.roomId || null,
      avatarUrl: value.avatarUrl.trim(),
    };

    const editingStudentId = this.editingStudentId();

    if (editingStudentId) {
      const updated = await this.studentStore.updateStudent(editingStudentId, payload);

      if (!updated) {
        return;
      }

      this.router.navigate(['/students']);
      return;
    }

    const created = await this.studentStore.addStudent(payload);

    if (!created) {
      return;
    }

    this.router.navigate(['/students']);
  }

  roomLabel(roomId: string): string {
    const room = this.rooms().find((item) => item.id === roomId);

    if (!room) {
      return 'Unassigned room';
    }

    return `${room.hostelName} - Room ${room.number}`;
  }
}
