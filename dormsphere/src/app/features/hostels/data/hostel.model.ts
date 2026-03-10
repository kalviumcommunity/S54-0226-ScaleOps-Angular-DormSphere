export type HostelType = 'BOYS' | 'GIRLS' | 'CO-ED';

export type HostelStatus = 'AVAILABLE' | 'ALMOST FULL' | 'FULLY OCCUPIED' | 'MAINTENANCE';

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
