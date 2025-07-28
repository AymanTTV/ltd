// src/types/customer.ts
export type Gender = 'male' | 'female' | 'other';
export type Status =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'INEED'
  | 'DICEASED'
  | 'COMMITTEE'
  | 'UNDER REVIEW'
  | 'AWAY'
  | 'KOL';

export interface Customer {
  id: string;
  fullName: string;
  nickname?: string;
  gender: Gender;
  mobile: string;
  email: string;
  address: string;
  dateOfBirth: Date;
  badgeNumber?: string;
  billExpiry?: Date;
  status: Status;          // ← newly required
  photoUrl?: string;       // ← newly read/written
  signature?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  billDocumentUrl?: string;
  pendingApproval?: boolean;
  pendingUpdates?: Partial<Omit<Customer, 'id' | 'pendingApproval'>>;
  licenseType: 'Green' | 'Yellow';
  originalRegion:
    | 'NORTH LONDON'
    | 'NORTH WEST'
    | 'EAST LONDON'
    | 'SOUTH EAST'
    | 'SOUTH WEST'
    | 'WEST LONDON'
    | 'CENTRAL'
    | 'UNKNOWN';
  createdAt: Date;
  updatedAt: Date;
}
