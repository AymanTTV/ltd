// src/components/finance/FinanceHeader.tsx
import React from 'react';
import { Download, Upload, Plus, Search, FileText, Users, DollarSign } from 'lucide-react'; // Corrected import statement
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface FinanceHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddInCredit: () => void; // New prop for adding in-credit
  onBulkCharge: () => void; // New prop for bulk charge
  onGeneratePDF: () => void;
  period: 'week' | 'month' | 'year' | 'all';
  onPeriodChange: (period: 'week' | 'month' | 'year' | 'all') => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onManageCategories: () => void;
  onManageGroups: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAddIncome,
  onAddExpense,
  onAddInCredit, // Destructure new prop
  onBulkCharge,
  onGeneratePDF,
  period,
  onPeriodChange,
  type,
  onTypeChange,
  onManageGroups,
  onManageCategories,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const { can } = usePermissions();
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <div className="relative flex-grow sm:flex-grow-1 mb-4 sm:mb-0 w-full sm:w-auto sm:mr-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search category, ref, customer, description…"
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
         
        <div className="flex items-center space-x-2 flex-wrap">
          {user?.role === 'manager' && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {user?.role === 'manager' && (
            <button
              onClick={onGeneratePDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate PDF
            </button>
          )}
          {can('finance', 'create') && (
            <button
              onClick={onAddIncome}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Income
            </button>
          )}
          {can('finance', 'create') && (
            <button
              onClick={onAddExpense}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </button>
          )}
          {/* Add In-Credit Button */}
          {can('finance', 'create') && (
            <button
              onClick={onAddInCredit}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600"
            >
              <DollarSign className="h-5 w-5 mr-2" /> {/* Using DollarSign icon */}
              Add In-Credit
            </button>
          )}
          {/* --- NEW BULK CHARGE BUTTON --- */}
          {user?.role === 'manager' && (
            <button
              onClick={onBulkCharge}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <Users className="h-5 w-5 mr-2" />
              Bulk Charge
            </button>
          )}
          {user?.role === 'manager' && (
            <button
              onClick={onManageGroups}
              className="inline-flex items-center px-4 py-2 border text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded"
            >
              <FileText className="h-5 w-5 mr-2" />
              Manage Groups
            </button>
          )}
          {user?.role === 'manager' && (
            <button
              onClick={onManageCategories}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-2" />
              Manage Categories
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceHeader;