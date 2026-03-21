export type StudentStatus = 'ACTIVE' | 'PENDING' | 'GRADUATED';

export interface ApiStudent {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  status: string;
  avatar_url: string | null;
  room_id: number | null;
  room_number: string | null;
  hostel_id: number | null;
  hostel_name: string | null;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  status: StudentStatus;
  avatarUrl: string;
  roomId: string | null;
  roomNumber: string | null;
  hostelId: string | null;
  hostelName: string | null;
}

export interface NewStudentInput {
  name: string;
  email: string;
  phone: string;
  department: string;
  status: StudentStatus;
  avatarUrl: string;
  roomId: string | null;
}

export interface StudentStats {
  total: number;
  assigned: number;
  waitlist: number;
  active: number;
}
