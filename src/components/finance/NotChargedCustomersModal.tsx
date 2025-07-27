// src/components/finance/NotChargedCustomersModal.tsx
import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import { X, Search } from 'lucide-react';
import { DataTable } from '../DataTable/DataTable';
import StatusBadge from '../ui/StatusBadge';

interface NotChargedCustomersModalProps {
  onClose: () => void;
  customers: Customer[];
}

const NotChargedCustomersModal: React.FC<NotChargedCustomersModalProps> = ({ onClose, customers }) => {
  const [search, setSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const lowercasedSearch = search.toLowerCase();
    return customers.filter(c => 
      c.fullName.toLowerCase().includes(lowercasedSearch) ||
      c.badgeNumber?.toLowerCase().includes(lowercasedSearch) ||
      c.mobile?.includes(search)
    );
  }, [customers, search]);

  const columns = [
    { 
      header: 'Full Name', 
      accessorKey: 'fullName',
      cell: ({ row }: any) => <div className="font-medium">{row.original.fullName}</div>
    },
    { header: 'Badge No.', accessorKey: 'badgeNumber' },
    { header: 'Mobile', accessorKey: 'mobile' },
    { 
      header: 'Status', 
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />
    },
  ];

  return (
    // FIXED: Removed max-width class to allow parent Modal to control sizing
    <div className="p-1">
        <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
            type="text"
            placeholder="Search by name, badge, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-focus focus:border-primary-focus"
            />
        </div>

        <p className="text-sm text-gray-600 mb-4">
            Found <span className="font-bold text-primary">{filteredCustomers.length}</span> active customers who have not been associated with any financial transaction.
        </p>

        <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
            <DataTable columns={columns} data={filteredCustomers} />
        </div>
    </div>
  );
};

export default NotChargedCustomersModal;
