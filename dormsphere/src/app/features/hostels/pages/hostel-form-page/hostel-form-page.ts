import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HostelNavbar } from '../../components/hostel-navbar/hostel-navbar';
import { HostelStatus, HostelType, NewHostelInput } from '../../data/hostel.model';
import { HostelStoreService } from '../../data/hostel-store.service';

function occupiedBedsWithinCapacityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const capacity = Number(control.get('capacity')?.value ?? 0);
    const occupiedBeds = Number(control.get('occupiedBeds')?.value ?? 0);

    return occupiedBeds > capacity ? { occupiedBedsExceedsCapacity: true } : null;
  };
}

function defaultWardenName(hostelName: string): string {
  const trimmedName = hostelName.trim();
  return trimmedName ? `${trimmedName} Warden` : 'Assigned Warden';
}

function defaultWardenExtension(capacity: number): string {
  const safeCapacity = Number.isFinite(capacity) ? Math.max(0, capacity) : 0;
  return String(4100 + (safeCapacity % 700));
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
  readonly saving = this.hostelStore.saving;
  readonly errorMessage = this.hostelStore.errorMessage;

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    location: [''],
    type: 'BOYS' as HostelType,
    wardenName: [''],
    wardenExtension: [''],
    capacity: [300, [Validators.required, Validators.min(1)]],
    occupiedBeds: [0, [Validators.min(0)]],
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

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const capacity = Number(value.capacity);
    const occupiedBeds = Math.min(Number(value.occupiedBeds), capacity);
    const name = value.name.trim();
    const location = value.location.trim();

    const payload: NewHostelInput = {
      ...value,
      name,
      location,
      wardenName: value.wardenName.trim() || defaultWardenName(name),
      wardenExtension: value.wardenExtension.trim() || defaultWardenExtension(capacity),
      capacity,
      occupiedBeds,
    };

    const editingHostelId = this.editingHostelId();

    if (editingHostelId) {
      const updatedHostel = await this.hostelStore.updateHostel(editingHostelId, payload);
      if (!updatedHostel) {
        return;
      }

      this.router.navigate(['/hostels', updatedHostel.id]);
      return;
    }

    const hostel = await this.hostelStore.addHostel(payload);

    if (!hostel) {
      return;
    }

    this.router.navigate(['/hostels', hostel.id]);
  }

}
