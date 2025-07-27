// src/utils/customerHelpers.ts
import { exportToExcel } from './excel';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Customer } from '../types/customer';

/** Helper: try to parse anything into a valid JS Date */
function parseDate(val: any): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Export all Customer fields to an Excel file named “Members.xlsx”.
 */
export const handleCustomerExport = (customers: Customer[]): void => {
  try {
    const rows = customers.map(cust => ({
      ID: cust.id,
      'Full Name': cust.fullName,
      Nickname: cust.nickname || '',
      Gender: cust.gender,
      Mobile: cust.mobile,
      Email: cust.email,
      Address: cust.address,
      'Date of Birth': cust.dateOfBirth
        ? cust.dateOfBirth.toLocaleDateString()
        : '',
      'Badge Number': cust.badgeNumber || '',
      'Bill Expiry': cust.billExpiry
        ? cust.billExpiry.toLocaleDateString()
        : '',
      Status: cust.status,
      'Photo URL': cust.photoUrl || '',
      Signature: cust.signature || '',
      'Bill Document URL': cust.billDocumentUrl || '',
      'License Type': cust.licenseType,
      'Original Region': cust.originalRegion,
      'Created At': cust.createdAt.toLocaleString(),
      'Updated At': cust.updatedAt.toLocaleString(),
    }));

    // change file base name to “Members”
    exportToExcel(rows, 'Members');
    toast.success('Members exported successfully');
  } catch (error) {
    console.error('Error exporting customers:', error);
    toast.error('Failed to export members');
  }
};

/**
 * Import all Customer fields from an Excel file.
 * Only writes a field if it parses to a valid value.
 */
export const handleCustomerImport = async (file: File): Promise<void> => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    });

    let importedCount = 0;
    for (const row of rows) {
      const payload: any = {
        fullName: row['Full Name'] || '',
        gender: row['Gender'] as Customer['gender'],
        mobile: row['Mobile'] || '',
        email: row['Email'] || '',
        address: row['Address'] || '',
        status: (row['Status'] as Customer['status']) || 'ACTIVE',
        licenseType: row['License Type'] as Customer['licenseType'],
        originalRegion: row['Original Region'] as Customer['originalRegion'],
      };

      // optional strings
      if (row['Nickname'])        payload.nickname        = row['Nickname'];
      if (row['Badge Number'])    payload.badgeNumber     = row['Badge Number'];
      if (row['Photo URL'])       payload.photoUrl        = row['Photo URL'];
      if (row['Signature'])       payload.signature       = row['Signature'];
      if (row['Bill Document URL']) payload.billDocumentUrl = row['Bill Document URL'];

      // optional dates
      const dob = parseDate(row['Date of Birth']);
      if (dob) payload.dateOfBirth = dob;

      const billExp = parseDate(row['Bill Expiry']);
      if (billExp) payload.billExpiry = billExp;

      // createdAt / updatedAt: default to now if missing or invalid
      payload.createdAt = parseDate(row['Created At']) ?? new Date();
      payload.updatedAt = parseDate(row['Updated At']) ?? new Date();

      await addDoc(collection(db, 'customers'), payload);
      importedCount++;
    }

    toast.success(`${importedCount} members imported successfully`);
  } catch (error) {
    console.error('Error importing customers:', error);
    toast.error('Import failed');
    throw error;
  }
};

/**
 * Check a single customer for expired documents.
 */
export const validateCustomerDocument = (customer: Customer): string[] => {
  const errors: string[] = [];
  const now = new Date();
  if (customer.billExpiry && customer.billExpiry <= now) {
    errors.push('Bill has expired');
  }
  return errors;
};

/**
 * Is the customer “active”? (i.e. billExpiry in the future)
 */
export const isCustomerActive = (customer: Customer): boolean => {
  const now = new Date();
  return !!(customer.billExpiry && customer.billExpiry > now);
};

/**
 * Return customers whose billExpiry falls within the next `daysThreshold` days.
 */
export const getExpiringCustomers = (
  customers: Customer[],
  daysThreshold = 30
): Customer[] => {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
  return customers.filter(
    c => c.billExpiry && c.billExpiry <= threshold
  );
};
