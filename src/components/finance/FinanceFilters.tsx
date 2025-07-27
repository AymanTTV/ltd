// src/components/finance/FinanceFilters.tsx
import React from 'react';
import { Customer } from '../../types';
import { Users } from 'lucide-react';

type TransactionType = 'all' | 'income' | 'expense' | 'outstanding' | 'in-credit' | 'refund' | 'outstanding_in_credit' | 'income_in_credit';

interface FinanceFiltersProps {
  statusFilter: string;
  type: TransactionType;
  onTypeChange: (t: TransactionType) => void;
  onStatusFilterChange: (s: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (c: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  customers?: Customer[];
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  categories: string[];
  groupFilter: string;
  onGroupFilterChange: (groupId: string) => void;
  groupOptions: { id: string; name: string }[];
  onShowUncharged: () => void; // New prop to handle modal opening
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  type,
  onTypeChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  customers = [],
  selectedCustomerId,
  onCustomerChange,
  groupFilter,
  onGroupFilterChange,
  groupOptions,
  categories,
  onShowUncharged,
}) => {
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().slice(0, 10) : ''}
            onChange={e =>
              onDateRangeChange({
                start: e.target.value ? new Date(e.target.value) : null,
                end: dateRange.end,
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>
        {/* To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            min={dateRange.start ? dateRange.start.toISOString().slice(0, 10) : undefined}
            value={dateRange.end ? dateRange.end.toISOString().slice(0, 10) : ''}
            onChange={e =>
              onDateRangeChange({
                start: dateRange.start,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value as any)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="outstanding">Outstanding</option>
            <option value="in-credit">In-Credit</option>
            <option value="refund">Refund </option>
            <option value="outstanding_in_credit">Outstanding & In-Credit</option>
            <option value="income_in_credit">Income & In-Credit</option>
          </select>
        </div>
        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </select>
        </div>
        {/* Customer */}
        {onCustomerChange && (
          <div className="xl:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={e => onCustomerChange(e.target.value)}
              className="form-select mt-1 w-full"
            >
              <option value="">All Customers</option>
              {customers && customers.map(c => (
                <option key={c.id} value={c.id}>
                 {c.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {/* --- Second Row of Filters --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4 border-t">
        {/* Category Filter - RESTORED */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        
        {/* Group Filter - RESTORED */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <select
            value={groupFilter}
            onChange={e => onGroupFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Groups</option>
            {groupOptions.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between pt-4 border-t gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onShowUncharged}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Show Not Charged Customers
            </button>
          </div>
      </div>
    </div>
  );
};

export default FinanceFilters;