// src/components/finance/InvoiceFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (c: string) => void;
  dateRange: { start: Date|null; end: Date|null };
  onDateRangeChange: (r: { start: Date|null; end: Date|null }) => void;
  categories: string[];
}

const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
  categories,
}) => (
  <div className="space-y-4">
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search by customer, claim # or category…"
        className="form-input pl-10 w-full"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          className="form-select mt-1 w-full"
        >
         <option value="all">All Statuses</option>
         <optgroup label="Payment Status">
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending Payment</option>
            <option value="overdue">Overdue</option>
         </optgroup>
         <optgroup label="Approval Status">
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
         </optgroup>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryFilter}
          onChange={e => onCategoryFilterChange(e.target.value)}
          className="form-select mt-1 w-full"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">From</label>
        <input
          type="date"
          value={dateRange.start?.toISOString().slice(0,10) || ''}
          onChange={e => onDateRangeChange({
            start: e.target.value ? new Date(e.target.value) : null,
            end: dateRange.end
          })}
          className="form-input mt-1 w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">To</label>
        <input
          type="date"
          min={dateRange.start?.toISOString().slice(0,10)}
          value={dateRange.end?.toISOString().slice(0,10) || ''}
          onChange={e => onDateRangeChange({
            start: dateRange.start,
            end: e.target.value ? new Date(e.target.value) : null
          })}
          className="form-input mt-1 w-full"
        />
      </div>
    </div>
  </div>
);

export default InvoiceFilters;