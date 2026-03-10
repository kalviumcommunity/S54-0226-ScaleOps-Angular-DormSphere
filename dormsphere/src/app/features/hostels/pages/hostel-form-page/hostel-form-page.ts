import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HostelNavbar } from '../../components/hostel-navbar/hostel-navbar';
import { HostelStatus, HostelType } from '../../data/hostel.model';
import { HostelStoreService } from '../../data/hostel-store.service';

function occupiedBedsWithinCapacityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const capacity = Number(control.get('capacity')?.value ?? 0);
    const occupiedBeds = Number(control.get('occupiedBeds')?.value ?? 0);

    return occupiedBeds > capacity ? { occupiedBedsExceedsCapacity: true } : null;
  };
}

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
  private readonly route = inject(ActivatedRoute);

  readonly types: HostelType[] = ['BOYS', 'GIRLS', 'CO-ED'];
  readonly statuses: HostelStatus[] = ['AVAILABLE', 'ALMOST FULL', 'FULLY OCCUPIED', 'MAINTENANCE'];

  readonly editingHostelId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null }
  );

  readonly editingHostel = computed(() => this.hostelStore.getHostelById(this.editingHostelId()));
  readonly isEditMode = computed(() => this.editingHostel() !== undefined);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    location: ['', [Validators.required]],
    type: 'BOYS' as HostelType,
    wardenName: ['', [Validators.required]],
    wardenExtension: ['', [Validators.required]],
    capacity: [300, [Validators.required, Validators.min(1)]],
    occupiedBeds: [0, [Validators.required, Validators.min(0)]],
    status: 'AVAILABLE' as HostelStatus,
  }, { validators: [occupiedBedsWithinCapacityValidator()] });

  constructor() {
    effect(() => {
      const hostel = this.editingHostel();

      if (!hostel) {
        return;
      }

      this.form.reset({
        name: hostel.name,
        location: hostel.location,
        type: hostel.type,
        wardenName: hostel.wardenName,
        wardenExtension: hostel.wardenExtension,
        capacity: hostel.capacity,
        occupiedBeds: hostel.occupiedBeds,
        status: hostel.status,
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const capacity = Number(value.capacity);
    const occupiedBeds = Math.min(Number(value.occupiedBeds), capacity);

    const payload = {
      ...value,
      capacity,
      occupiedBeds,
    };

    const editingHostelId = this.editingHostelId();

    if (editingHostelId) {
      const updatedHostel = this.hostelStore.updateHostel(editingHostelId, payload);
      if (!updatedHostel) {
        this.router.navigate(['/hostels']);
        return;
      }

      this.router.navigate(['/hostels', updatedHostel.id]);
      return;
    }

    const hostel = this.hostelStore.addHostel(payload);

    this.router.navigate(['/hostels', hostel.id]);
  }

}
