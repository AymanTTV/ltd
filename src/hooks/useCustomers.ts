// src/hooks/useCustomers.ts
import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer } from '../types/customer';

function parseDate(input: any): Date {
  if (!input) return new Date();
  if (typeof input.toDate === 'function') return input.toDate();
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const q = query(collection(db, 'customers'), orderBy('fullName'));
    const snap = await getDocs(q);
    const data = snap.docs.map(docSnap => {
      const d = docSnap.data() as any;
      return {
        id: docSnap.id,
        fullName: d.fullName,
        nickname: d.nickname,
        gender: d.gender,
        mobile: d.mobile,
        email: d.email,
        address: d.address,
        dateOfBirth: parseDate(d.dateOfBirth),
        billExpiry: d.billExpiry ? parseDate(d.billExpiry) : undefined,
        badgeNumber: d.badgeNumber,
        status: (d.status as Customer['status']) || 'ACTIVE',
        photoUrl: d.photoUrl,
        pendingApproval: d.pendingApproval || false,
        pendingUpdates: d.pendingUpdates || {},
        signature: d.signature,
        billDocumentUrl: d.billDocumentUrl,
        licenseType: d.licenseType,
        originalRegion: d.originalRegion,
        createdAt: parseDate(d.createdAt),
        updatedAt: parseDate(d.updatedAt),
      } as Customer;
    });
    setCustomers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { customers, loading, refetch: fetchData };
};
