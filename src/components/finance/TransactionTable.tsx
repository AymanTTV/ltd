// src/components/finance/TransactionTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Customer, Account } from '../../types';
import { Eye, Edit2, Trash2, FileText, Share2, Printer, Award, Phone, DollarSign, CreditCard, RotateCcw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface TransactionTableProps {
  transactions: Transaction[];
  customers: Customer[];
  accounts: Account[];
  customerInCreditBalances: { [key: string]: number };
  onView: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onPayOutstanding: (tx: Transaction) => void;
  onConvertToInCredit: (tx: Transaction) => void;
  onGenerateDocument: (tx: Transaction) => void;
  onViewDocument: (url: string) => void;
  onPrintReceipt?: (tx: Transaction) => void;
  onAssign: (tx: Transaction) => void;
  onRefund: (tx: Transaction) => void; // Added for refund modal
  groups: { id: string; name: string }[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  customers,
  onView,
  onEdit,
  onDelete,
  onPayOutstanding,
  onConvertToInCredit,
  onGenerateDocument,
  onViewDocument,
  onPrintReceipt,
  onAssign,
  onRefund,
  groups,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    { header: 'Date', cell: ({ row }: any) => format(row.original.date, 'dd/MM/yyyy') },
    {
      header: 'Type & Status',
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.status || 'completed'} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    { header: 'Category', accessorKey: 'category' },
    {
      header: 'Amount',
      cell: ({ row }: any) => {
        const tx = row.original;
        const amount = (tx.type === 'outstanding' || tx.type === 'in-credit') ? (tx.remainingAmount ?? tx.amount) : tx.amount;
        return (
          // MODIFIED: Added 'refund' type to be styled in red, same as expenses.
          <span className={`font-semibold ${tx.type === 'income' || tx.type === 'in-credit' ? 'text-green-600' : tx.type === 'expense' || tx.type === 'refund' ? 'text-red-600' : 'text-orange-600'}`}>
            {formatCurrency(amount)}
          </span>
        );
      },
    },
    {
      header: 'Customer',
      cell: ({ row }: any) => {
        const tx = row.original as Transaction;
        const c = tx.customerId ? customers.find(c => c.id === tx.customerId) : null;
        return c ? (
          <div>
            <div className="font-medium">{c.fullName}</div>
            {c.badgeNumber && (
              <div className="flex items-center space-x-1 mt-1">
                <Award className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">{c.badgeNumber}</span>
              </div>
            )}
            <div className="flex items-center space-x-1 mt-1">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">{c.mobile}</span>
            </div>
          </div>
        ) : (
          <div>{tx.customerName || <span className="text-gray-400">N/A</span>}</div>
        );
      },
    },
    {
      header: 'Group',
      cell: ({ row }: any) => {
        const tx = row.original as Transaction;
        const grp = groups.find(g => g.id === tx.groupId);
        return (
          <div className="flex items-center space-x-2">
            <span>{grp?.name || '-'}</span>
            <button
              onClick={e => { e.stopPropagation(); onAssign(tx); }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Assign to group"
            >
              <Share2 size={16} />
            </button>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => {
        const tx = row.original as Transaction;
        return (
          <div className="flex space-x-1 items-center">
            {can('finance', 'view') && (
              <button onClick={e => { e.stopPropagation(); onView(tx); }} title="View">
                <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
              </button>
            )}
            {tx.type === 'outstanding' && tx.paymentStatus !== 'paid' && can('finance', 'update') && (
              <button onClick={e => { e.stopPropagation(); onPayOutstanding(tx); }} title="Pay Outstanding" className="p-1 text-green-600 hover:text-green-800">
                <DollarSign className="h-4 w-4" />
              </button>
            )}
            {tx.type === 'income' && tx.paymentStatus === 'paid' && can('finance', 'update') && (
              <button onClick={e => { e.stopPropagation(); onConvertToInCredit(tx); }} title="Convert to In-Credit" className="p-1 text-blue-600 hover:text-blue-800">
                <CreditCard className="h-4 w-4" />
              </button>
            )}
            {/* ADDED: Refund Button for In-Credit Transactions */}
            {tx.type === 'in-credit' && (tx.remainingAmount ?? 0) > 0 && can('finance', 'delete') && (
              <button onClick={e => { e.stopPropagation(); onRefund(tx); }} title="Refund Credit" className="p-1 text-red-600 hover:text-red-800">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {can('finance', 'update') && (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit(tx); }} title="Edit">
                  <Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                </button>
                <button onClick={e => { e.stopPropagation(); onGenerateDocument(tx); }} title="Generate Document">
                  <FileText className="h-4 w-4 text-green-600 hover:text-green-800" />
                </button>
              </>
            )}
            {can('finance', 'delete') && (
              <button onClick={e => { e.stopPropagation(); onDelete(tx); }} title="Delete">
                <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
              </button>
            )}
            {onPrintReceipt && (
              <button onClick={e => { e.stopPropagation(); onPrintReceipt(tx); }} className="p-1 hover:bg-gray-100 rounded" title="Print Receipt">
                <Printer className="h-4 w-4 text-gray-600" />
              </button>
            )}
            {tx.documentUrl && (
              <button onClick={e => { e.stopPropagation(); onViewDocument(tx.documentUrl!); }} title="View Document">
                <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      onRowClick={tx => can('finance', 'view') && onView(tx)}
    />
  );
};

export default TransactionTable;
