export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface ApiMaintenanceRequest {
  id: number;
  room_id: number | null;
  room_number: string | null;
  hostel_id: number | null;
  hostel_name: string | null;
  description: string;
  status: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  roomId: string | null;
  roomNumber: string | null;
  hostelId: string | null;
  hostelName: string | null;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
}

export interface NewMaintenanceRequestInput {
  roomId: string | null;
  description: string;
  status: MaintenanceStatus;
}

export interface MaintenanceStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}
