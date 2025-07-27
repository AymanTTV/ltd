// src/components/dashboard/FiltersCard.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface FiltersCardProps {
  pages: ('finance' | 'invoices' | 'customers')[];
  onFilterChange?: (filters: { page: string; startDate: string; endDate: string }) => void;
}

export default function FiltersCard({ pages, onFilterChange }: FiltersCardProps) {
  const [page, setPage] = React.useState(pages[0]);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const applyFilters = () => {
    if (onFilterChange) onFilterChange({ page, startDate, endDate });
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Filters</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Page</label>
          <select
            value={page}
            onChange={e => setPage(e.target.value)}
            className="w-full border rounded p-2"
          >
            {pages.map(p => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <button
          onClick={applyFilters}
          className="w-full bg-primary text-white py-2 rounded"
        >
          Apply
        </button>
      </CardContent>
    </Card>
  );
}
