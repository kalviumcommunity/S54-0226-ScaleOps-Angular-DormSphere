import { Component, Input } from '@angular/core';
import { RoomStats } from '../../data/room.model';

@Component({
  selector: 'app-room-stats-grid',
  imports: [],
  templateUrl: './room-stats-grid.html',
  styleUrl: './room-stats-grid.css',
})
export class RoomStatsGrid {
  @Input({ required: true }) stats!: RoomStats;
  @Input() loading = false;
}
