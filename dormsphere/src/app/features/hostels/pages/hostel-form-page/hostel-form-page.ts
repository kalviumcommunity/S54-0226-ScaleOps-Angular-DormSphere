import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HostelNavbar } from '../../components/hostel-navbar/hostel-navbar';
import { HostelStatus, HostelType } from '../../data/hostel.model';
import { HostelStoreService } from '../../data/hostel-store.service';

@Component({
  selector: 'app-hostel-form-page',
  imports: [ReactiveFormsModule, RouterLink, HostelNavbar],
  templateUrl: './hostel-form-page.html',
  styleUrl: './hostel-form-page.css',
})
export class HostelFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly hostelStore = inject(HostelStoreService);
  private readonly router = inject(Router);

  readonly types: HostelType[] = ['BOYS', 'GIRLS', 'CO-ED'];
  readonly statuses: HostelStatus[] = ['AVAILABLE', 'ALMOST FULL', 'FULLY OCCUPIED', 'MAINTENANCE'];

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    location: ['', [Validators.required]],
    type: 'BOYS' as HostelType,
    wardenName: ['', [Validators.required]],
    wardenExtension: ['', [Validators.required]],
    capacity: [300, [Validators.required, Validators.min(1)]],
    occupiedBeds: [0, [Validators.required, Validators.min(0)]],
    status: 'AVAILABLE' as HostelStatus,
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const hostel = this.hostelStore.addHostel({
      ...value,
      capacity: Number(value.capacity),
      occupiedBeds: Number(value.occupiedBeds),
    });

    this.router.navigate(['/hostels', hostel.id]);
  }

}
