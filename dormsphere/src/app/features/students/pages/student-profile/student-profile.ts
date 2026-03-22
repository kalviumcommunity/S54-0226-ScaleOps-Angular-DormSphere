import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { map } from 'rxjs';
import { StudentStoreService } from '../../data/student-store.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfile {
  private readonly studentStore = inject(StudentStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = this.studentStore.loading;
  readonly errorMessage = this.studentStore.errorMessage;

  readonly studentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null }
  );

  get student() {
    return this.studentStore.getStudentById(this.studentId());
  }

  editStudent(): void {
    if (this.studentId()) {
      this.router.navigate(['/students', this.studentId(), 'edit']);
    }
  }

  messageStudent(): void {
    // User-facing placeholder until messaging is implemented
    window.alert(`Messaging student (ID: ${this.studentId()}) is not implemented yet.`);
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }
}