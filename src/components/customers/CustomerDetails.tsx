// src/components/customers/CustomerDetails.tsx
import React from 'react';
import { Customer } from '../../types/customer';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  INEED: 'bg-yellow-100 text-yellow-800',
  DICEASED: 'bg-gray-200 text-gray-800',
  COMMITTEE: 'bg-blue-100 text-blue-800',
  'UNDER REVIEW': 'bg-purple-100 text-purple-800',
  AWAY: 'bg-indigo-100 text-indigo-800',
  KOL: 'bg-pink-100 text-pink-800',
};

interface Props {
  customer: Customer;
}

export default function CustomerDetails({ customer }: Props) {
  const view = (url?: string) => url && window.open(url, '_blank');
  const age = Math.floor(
    (Date.now() - customer.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  return (
    <div className="space-y-6">
      {/* Header + Photo */}
      <div className="flex items-center space-x-4">
        {customer.photoUrl ? (
          <img
            src={customer.photoUrl}
            alt={`${customer.fullName} photo`}
            className="h-20 w-20 rounded-full object-cover border"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            No Photo
          </div>
        )}
        <h2 className="text-2xl font-bold">Member Details</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="form-label">Full Name</h3>
          <p>{customer.fullName}</p>
        </div>
        <div>
          <h3 className="form-label">Nickname</h3>
          <p>{customer.nickname || '—'}</p>
        </div>
        <div>
          <h3 className="form-label">Status</h3>
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
              STATUS_COLORS[customer.status] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {customer.status}
          </span>
        </div>
        <div>
          <h3 className="form-label">Age</h3>
          <p>{age} years</p>
        </div>
        <div>
          <h3 className="form-label">Phone</h3>
          <p>
            <a href={`tel:${customer.mobile}`} className="text-primary underline">
              {customer.mobile}
            </a>
          </p>
        </div>
        <div>
          <h3 className="form-label">Email</h3>
          <p>
            <a href={`mailto:${customer.email}`} className="text-primary underline">
              {customer.email}
            </a>
          </p>
        </div>
        <div className="col-span-2">
          <h3 className="form-label">Address</h3>
          <p>{customer.address}</p>
        </div>
        <div>
          <h3 className="form-label">Date of Birth</h3>
          <p>{format(customer.dateOfBirth, 'dd/MM/yyyy')}</p>
        </div>
        <div>
          <h3 className="form-label">Joined</h3>
          <p>{format(customer.createdAt, 'dd/MM/yyyy')}</p>
        </div>
        <div>
          <h3 className="form-label">License Type</h3>
          <p>{customer.licenseType}</p>
        </div>
        <div>
          <h3 className="form-label">Original Region</h3>
          <p>{customer.originalRegion}</p>
        </div>
        <div>
          <h3 className="form-label">Badge Number</h3>
          <p>{customer.badgeNumber || '—'}</p>
        </div>
        <div>
          <h3 className="form-label">Bill Expiry</h3>
          <p className={customer.billExpiry && customer.billExpiry < new Date() ? 'text-red-600' : ''}>
            {customer.billExpiry ? format(customer.billExpiry, 'dd/MM/yyyy') : '—'}
          </p>
        </div>
        {customer.signature && (
          <div className="col-span-2">
            <h3 className="form-label">Member Signature</h3>
            <img
              src={customer.signature}
              alt="signature"
              className="h-24 w-48 object-contain border rounded-md"
            />
          </div>
        )}
      </div>

      <h3 className="text-lg font-medium">Documents</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {customer.licenseFrontUrl && (
          <div className="relative border p-2 rounded-md">
            <img
              src={customer.licenseFrontUrl}
              alt="License Front"
              className="w-full h-32 object-cover rounded"
            />
            <button
              onClick={() => view(customer.licenseFrontUrl)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )}
        {customer.licenseBackUrl && (
          <div className="relative border p-2 rounded-md">
            <img
              src={customer.licenseBackUrl}
              alt="License Back"
              className="w-full h-32 object-cover rounded"
            />
            <button
              onClick={() => view(customer.licenseBackUrl)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )}
        {customer.billDocumentUrl && (
          <div className="relative border p-2 rounded-md">
            <img
              src={customer.billDocumentUrl}
              alt="Bill Document"
              className="w-full h-32 object-cover rounded"
            />
            <button
              onClick={() => view(customer.billDocumentUrl)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
