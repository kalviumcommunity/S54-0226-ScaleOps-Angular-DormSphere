import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StudentStoreService } from '../../data/student-store.service';
import { Student, StudentStatus } from '../../data/student.model';
import { ToastService } from '../../../../core/ui/toast.service';

@Component({
  selector: 'app-student-directory',
  templateUrl: './student-directory.html',
  styleUrl: './student-directory.css',
})
export class StudentDirectory {
  private readonly studentStore = inject(StudentStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly selectedDepartment = signal('');
  readonly statusFilter = signal<'ALL' | StudentStatus>('ALL');
  readonly page = signal(1);
  readonly pageSize = 8;

  readonly students = this.studentStore.students;
  readonly loading = this.studentStore.loading;
  readonly errorMessage = this.studentStore.errorMessage;
  readonly stats = this.studentStore.stats;
  readonly departments = this.studentStore.departments;

  readonly filteredStudents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const selectedDepartment = this.selectedDepartment();
    const statusFilter = this.statusFilter();

    return this.students().filter((student) => {
      const matchesDepartment =
        selectedDepartment.length === 0 || student.department === selectedDepartment;
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

      if (!matchesDepartment || !matchesStatus) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      return (
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.department.toLowerCase().includes(query) ||
        this.roomLabel(student).toLowerCase().includes(query)
      );
    });
  });

  readonly totalPages = computed(() => {
    const total = this.filteredStudents().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly pagedStudents = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize;
    return this.filteredStudents().slice(start, start + this.pageSize);
  });

  readonly pageSummary = computed(() => {
    const total = this.filteredStudents().length;

    if (total === 0) {
      return 'Showing 0 students';
    }

    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize + 1;
    const end = Math.min(currentPage * this.pageSize, total);

    return `Showing ${start}-${end} of ${total} students`;
  });

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  setDepartment(value: string): void {
    this.selectedDepartment.set(value);
    this.page.set(1);
  }

  setStatusFilter(value: 'ALL' | StudentStatus): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDepartment.set('');
    this.statusFilter.set('ALL');
    this.page.set(1);
  }

  async refresh(): Promise<void> {
    await this.studentStore.loadStudents();

    if (!this.errorMessage()) {
      this.toast.info('Students refreshed', 'Latest student records have been loaded.');
    }
  }

  addStudent(): void {
    this.router.navigate(['/students/new']);
  }

  editStudent(id: string): void {
    this.router.navigate(['/students', id, 'edit']);
  }

  async deleteStudent(id: string): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this student? This cannot be undone.')
    ) {
      return;
    }

    const deleted = await this.studentStore.deleteStudent(id);

    if (deleted) {
      this.toast.success('Student deleted', `Student ${id} has been removed.`);
    }
  }

  roomLabel(student: Student): string {
    if (student.roomNumber && student.hostelName) {
      return `${student.hostelName} - Room ${student.roomNumber}`;
    }

    if (student.roomNumber) {
      return `Room ${student.roomNumber}`;
    }

    return 'Not Assigned';
  }

  statusClass(status: StudentStatus): string {
    if (status === 'ACTIVE') {
      return 'status-pill status-pill--success';
    }

    if (status === 'PENDING') {
      return 'status-pill status-pill--warning';
    }

    return 'status-pill';
  }

  prevPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }
}