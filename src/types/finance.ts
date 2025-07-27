// src/types/finance.ts

export interface InvoicePayment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'in-credit';
  reference?: string;
  document?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

// NEW: Interface for an individual user's approval decision
export interface ApprovalVote {
  userId: string;
  userName: string; // Storing name for easier display
  decision: 'Approved' | 'Rejected';
  reason: string;
  date: Date;
}

export interface Payment {
  amount: number;
  date: Date;
  method: string;
  reference?: string;
  createdBy: string;
  notes?: string; // Added for refund reason
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'outstanding' | 'in-credit' | 'refund';
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  vehicleName?: string;
  groupId?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  customCategory?: string;
  // UPDATED: 'failed' is now 'refunded'. Added 'partially_refunded'.
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid' | 'pending' | 'refunded' | 'partially_refunded';
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'in-credit' | 'other';
  paymentReference?: string;
  // UPDATED: 'failed' is now 'refunded'.
  status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  accountFrom?: string;
  accountTo?: string;
  customerId?: string;
  customerName?: string;
  payments?: Payment[]; // To store payment history for partial payments
  refunds?: Payment[]; // To store refund history for in-credit txns
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferHistory {
  id:string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  includeVAT: boolean;
}

export interface Invoice {
  id: string;
  date: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  subTotal: number;
  vatAmount: number;
  total: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  category: string;
  customCategory?: string;
  vehicleId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  documentUrl?: string; // Kept for backward compatibility
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;

  // NEW: Fields for claim approval workflow
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvals: ApprovalVote[];
  approvalReason?: string; // The majority-voted reason

  // MODIFIED: Replaced single documentUrl with an array for multiple documents
  supportingDocuments?: Array<{ name: string; url: string; path: string; }>;
}