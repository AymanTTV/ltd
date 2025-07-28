// src/components/customers/CustomerTable.tsx

import React from 'react'
import { DataTable } from '../DataTable/DataTable'
import { Customer } from '../../types/customer'
import {
  Eye,
  Edit,
  Trash2,
  FileText,
  FileCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  INEED: 'bg-yellow-100 text-yellow-800',
  DICEASED: 'bg-gray-200 text-gray-800',
  COMMITTEE: 'bg-blue-100 text-blue-800',
  'UNDER REVIEW': 'bg-purple-100 text-purple-800',
  AWAY: 'bg-indigo-100 text-indigo-800',
  KOL: 'bg-pink-100 text-pink-800',
}

interface CustomerTableProps {
  customers: Customer[]
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
  onGenerateDocument: (customer: Customer) => void
  onViewDocument: (url: string) => void
  onApprove: (customer: Customer) => void
  onReject: (customer: Customer) => void
}

export default function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onApprove,
  onReject,
}: CustomerTableProps) {
  const { can } = usePermissions()
  const { user } = useAuth();
  const canApprove = user?.role === 'manager'; // managers only

  // build your columns
  const columns: any[] = [
    {
      header: 'Full Name',
      accessorKey: 'fullName',
      cell: ({ row }: any) => (
        <div>
          <div>{row.original.fullName}</div>
          {row.original.badgeNumber && (
            <div className="text-xs text-gray-500">
              Badge #{row.original.badgeNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Nickname',
      accessorKey: 'nickname',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const s: string = row.original.status
        return (
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
              STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {s}
          </span>
        )
      },
    },
    {
      header: 'Phone',
      accessorKey: 'mobile',
      cell: ({ row }: any) => (
        <a
          href={`tel:${row.original.mobile}`}
          className="text-primary underline"
        >
          {row.original.mobile}
        </a>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: ({ row }: any) => (
        <a
          href={`mailto:${row.original.email}`}
          className="text-primary underline"
        >
          {row.original.email}
        </a>
      ),
    },
    {
      header: 'Joined',
      accessorKey: 'createdAt',
      cell: ({ row }: any) =>
        format(row.original.createdAt, 'dd/MM/yyyy'),
    },
    {
      header: 'License Type',
      accessorKey: 'licenseType',
    },
    {
      header: 'Region',
      accessorKey: 'originalRegion',
    },
    {
      header: 'Bill Expiry',
      accessorKey: 'billExpiry',
      cell: ({ row }: any) => {
        const d: Date | undefined = row.original.billExpiry
        const isExpired = d ? d < new Date() : false
        return (
          <span className={isExpired ? 'text-red-600' : ''}>
            {d ? format(d, 'dd/MM/yyyy') : '—'}
          </span>
        )
      },
    },
  ]

  // only push the Approval column for managers
  if (canApprove) {
    columns.push({
      header: 'Approval',
      cell: ({ row }: any) => {
        const c: Customer = row.original
        return c.pendingApproval ? (
          <>
            <button
              onClick={() => onApprove(c)}
              title="Approve"
              className="text-green-600 hover:underline mr-2"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(c)}
              title="Reject"
              className="text-red-600 hover:underline"
            >
              Reject
            </button>
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )
      },
    })
  }

  // Actions column always last
  columns.push({
    header: 'Actions',
    cell: ({ row }: any) => (
      <div className="flex space-x-2">
        {can('customers', 'view') && (
          <button
            onClick={() => onView(row.original)}
            title="View Member"
          >
            <Eye className="h-4 w-4 text-gray-600 hover:text-primary" />
          </button>
        )}
        {can('customers', 'update') && (
          <button
            onClick={() => onEdit(row.original)}
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-600 hover:text-primary" />
          </button>
        )}
        {can('customers', 'delete') && (
          <button
            onClick={() => onDelete(row.original)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
          </button>
        )}
        {can('customers', 'update') && (
          <button
            onClick={() => onGenerateDocument(row.original)}
            title="Generate Document"
          >
            <FileText className="h-4 w-4 text-green-600 hover:text-green-800" />
          </button>
        )}
        {row.original.documentUrl && (
          <button
            onClick={() => onViewDocument(row.original.documentUrl!)}
            title="View Document"
          >
            <FileCheck className="h-4 w-4 text-blue-600 hover:text-blue-800" />
          </button>
        )}
      </div>
    ),
  })

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={customer =>
        can('customers', 'view') && onView(customer as Customer)
      }
    />
  )
}
