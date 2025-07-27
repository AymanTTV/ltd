// src/components/finance/InvoiceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Customer, User } from '../../types';
import { Eye, FileText, Edit, Trash2, CheckCircle, FilePlus } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';

interface InvoiceTableProps {
  invoices: Invoice[];
  customers: Customer[];
  users: User[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onDeletePayment: (invoice: Invoice, paymentId: string) => void;
  onGenerateDocument: (invoice: Invoice) => void;
  onViewDocument: (invoice: Invoice) => void;
  onApprove: (invoice: Invoice) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  customers,
  users,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
  onDeletePayment,
  onGenerateDocument,
  onViewDocument,
  onApprove,
}) => {
  const { can } = usePermissions();
  const { user: currentUser } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  /**
   * Checks if an invoice is overdue.
   * An invoice is considered overdue if its payment status is not 'paid'
   * and the current date is past the due date.
   */
  const isOverdue = (invoice: Invoice): boolean => {
    return invoice.paymentStatus !== 'paid' && new Date() > invoice.dueDate;
  };

  /**
   * Sorts invoices to display overdue ones first, then sorts by the due date.
   */
  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);

    if (aOverdue && !bOverdue) return -1; // a is overdue, b is not -> a comes first
    if (!aOverdue && bOverdue) return 1;  // b is overdue, a is not -> b comes first

    // If both have the same overdue status, sort by due date (earliest first)
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const columns = [
    {
      header: 'Customer',
      cell: ({ row }: { row: { original: Invoice }}) => {
        const customer = customers.find(c => c.id === row.original.customerId);
        return (
          <div>
            <div className="font-medium">{row.original.customerName || customer?.fullName}</div>
            <div className="text-sm text-gray-500">{row.original.customerPhone || customer?.mobile}</div>
          </div>
        );
      },
    },
    {
        header: 'Approval',
        cell: ({ row }: { row: { original: Invoice }}) => {
          const { approvalStatus } = row.original;
          let badgeColor = '';
          if (approvalStatus === 'Approved') badgeColor = 'bg-green-100 text-green-800';
          else if (approvalStatus === 'Rejected') badgeColor = 'bg-red-100 text-red-800';
          else badgeColor = 'bg-yellow-100 text-yellow-800';
          
          return <StatusBadge status={approvalStatus || 'Pending'} className={badgeColor} />;
        },
    },
    {
      header: 'Payment Status',
      cell: ({ row }: { row: { original: Invoice }}) => {
        const inv = row.original;
        const overdue = isOverdue(inv);
        return (
          <StatusBadge
            status={overdue ? 'overdue' : inv.paymentStatus}
            className={overdue ? 'bg-red-100 text-red-800' : ''}
          />
        );
      },
    },
    {
        header: 'Amount',
        cell: ({ row }: { row: { original: Invoice }}) => {
          const inv = row.original;
          return (
            <div className="text-sm space-y-1">
              <div>Total: {formatCurrency(inv.total)}</div>
              <div className="text-green-600">Paid: {formatCurrency(inv.paidAmount)}</div>
              <div className="text-amber-600">Owing: {formatCurrency(inv.remainingAmount)}</div>
            </div>
          );
        },
    },
    {
      header: 'Due Date',
      cell: ({ row }: { row: { original: Invoice }}) => format(row.original.dueDate, 'dd/MM/yyyy'),
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: { original: Invoice }}) => {
        const invoice = row.original;
        const hasVoted = invoice.approvals?.some(v => v.userId === currentUser?.id);

        return (
          <div className="flex items-center space-x-2">
            <button onClick={(e) => { e.stopPropagation(); onView(invoice); }} className="text-gray-600 hover:text-blue-600" title="View Details">
              <Eye className="h-4 w-4" />
            </button>

            {can('finance', 'update') && !hasVoted && (
              <button onClick={(e) => { e.stopPropagation(); onApprove(invoice); }} className="text-gray-600 hover:text-green-600" title="Approve/Reject Claim">
                <CheckCircle className="h-4 w-4" />
              </button>
            )}

            {can('finance', 'update') && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onEdit(invoice); }} className="text-gray-600 hover:text-blue-600" title="Edit Claim">
                  <Edit className="h-4 w-4" />
                </button>
                {invoice.approvalStatus === 'Approved' && invoice.remainingAmount > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); onRecordPayment(invoice); }} className="text-primary hover:text-primary-600" title="Record Payment">
                    <span className="font-bold text-lg">£</span>
                  </button>
                )}
              </>
            )}

            {/* Generate Document Button */}
            {can('finance', 'update') && (
              <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(invoice); }} className="text-gray-600 hover:text-green-600" title="Generate PDF">
                <FileText className="h-4 w-4" />
              </button>
            )}

            {/* View Document Button */}
            {invoice.documentUrl && (
              <button onClick={(e) => { e.stopPropagation(); onViewDocument(invoice); }} className="text-gray-600 hover:text-blue-600" title="View PDF">
                <Eye className="h-4 w-4" />
              </button>
            )}

            {can('finance', 'delete') && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(invoice); }} className="text-gray-600 hover:text-red-600" title="Delete Claim">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sortedInvoices}
      onRowClick={onView}
      rowClassName={(inv: Invoice) => (isOverdue(inv) ? 'bg-red-50/50' : '')}
    />
  );
};

export default InvoiceTable;
