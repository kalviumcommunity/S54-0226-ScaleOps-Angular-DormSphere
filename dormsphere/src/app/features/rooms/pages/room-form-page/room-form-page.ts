import { Component, PLATFORM_ID, computed, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HostelStoreService } from '../../../hostels/data/hostel-store.service';
import { NewRoomInput } from '../../data/room.model';
import { RoomStoreService } from '../../data/room-store.service';

@Component({
  selector: 'app-room-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-form-page.html',
  styleUrl: './room-form-page.css',
})
export class RoomFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly roomStore = inject(RoomStoreService);
  private readonly hostelStore = inject(HostelStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly hostels = this.hostelStore.hostels;
  readonly saving = this.roomStore.saving;
  readonly loading = this.roomStore.loading;
  readonly errorMessage = this.roomStore.errorMessage;

  readonly editingRoomId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null }
  );

  readonly editingRoom = computed(() => this.roomStore.getRoomById(this.editingRoomId()));
  readonly isEditMode = computed(() => this.editingRoom() !== undefined);

  readonly form = this.formBuilder.nonNullable.group({
    hostelId: ['', Validators.required],
    number: ['', [Validators.required, Validators.minLength(2)]],
    capacity: [2, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.hostelStore.loadHostels();
      void this.roomStore.loadRooms();
    }

    effect(() => {
      const room = this.editingRoom();

      if (!room) {
         this.form.reset({
           hostelId: '',
           number: '',
           capacity: 2,
         });
        return;
      }

      this.form.patchValue({
        hostelId: room.hostelId,
        number: room.number,
        capacity: room.capacity,
      });
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload: NewRoomInput = {
      hostelId: value.hostelId,
      number: value.number.trim(),
      capacity: Number(value.capacity),
    };

    const editingRoomId = this.editingRoomId();

    if (editingRoomId) {
      const updated = await this.roomStore.updateRoom(editingRoomId, payload);

      if (!updated) {
        return;
      }

      this.router.navigate(['/rooms']);
      return;
    }

    const created = await this.roomStore.addRoom(payload);

    if (!created) {
      return;
    }

    this.router.navigate(['/rooms']);
  }
}
