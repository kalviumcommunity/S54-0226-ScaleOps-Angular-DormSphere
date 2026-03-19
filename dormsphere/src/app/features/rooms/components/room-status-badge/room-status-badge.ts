import { Component, Input } from '@angular/core';
import { RoomStatus } from '../../data/room.model';

@Component({
  selector: 'app-room-status-badge',
  imports: [],
  templateUrl: './room-status-badge.html',
  styleUrl: './room-status-badge.css',
})
export class RoomStatusBadge {
  @Input({ required: true }) status!: RoomStatus;

  badgeClass(): string {
    switch (this.status) {
      case 'AVAILABLE':
        return 'status-pill status-pill--success';
      case 'OCCUPIED':
        return 'status-pill status-pill--danger';
      default:
        return 'status-pill status-pill--warning';
    }
  }
}
