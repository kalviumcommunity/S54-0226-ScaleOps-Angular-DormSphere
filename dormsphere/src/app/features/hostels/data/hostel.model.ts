export type HostelType = 'BOYS' | 'GIRLS' | 'CO-ED';

export type HostelStatus = 'AVAILABLE' | 'ALMOST FULL' | 'FULLY OCCUPIED' | 'MAINTENANCE';

export interface ApiHostel {
  id: number;
  name: string;
  location: string | null;
  total_capacity: number | null;
}

export interface Hostel {
  id: string;
  name: string;
  location: string;
  type: HostelType;
  wardenName: string;
  wardenExtension: string;
  capacity: number;
  occupiedBeds: number;
  status: HostelStatus;
}

export interface NewHostelInput {
  name: string;
  location: string;
  type: HostelType;
  wardenName: string;
  wardenExtension: string;
  capacity: number;
  occupiedBeds: number;
  status: HostelStatus;
}
