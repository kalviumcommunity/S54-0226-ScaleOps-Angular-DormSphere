export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export type RoomType = 'Single' | 'Double' | 'Triple' | 'Suite';

export interface ApiRoom {
  id: number;
  hostel_id: number;
  room_number: string;
  capacity: number;
  occupied_beds: number;
}

export interface Room {
  id: string;
  hostelId: string;
  hostelName: string;
  number: string;
  name: string;
  block: string;
  floor: string;
  type: RoomType;
  capacity: number;
  occupied: number;
  status: RoomStatus;
}

export interface NewRoomInput {
  hostelId: string;
  number: string;
  capacity: number;
}

export interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  occupancyRate: number;
}
