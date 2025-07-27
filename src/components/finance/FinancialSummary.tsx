// src/components/finance/FinancialSummary.tsx

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, RotateCcw } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Transaction } from '../../types';

interface FinancialSummaryProps {
  transactions: Transaction[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();

  if (!can('finance', 'cards')) return null;

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalOutstanding = transactions
    .filter(t => t.type === 'outstanding' && t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.remainingAmount ?? t.amount ?? 0), 0);

  const totalInCredit = transactions
    .filter(t => t.type === 'in-credit')
    .reduce((sum, t) => sum + (t.remainingAmount ?? 0), 0);

  // NEW: sum up all refund transactions
  const totalRefunds = transactions
    .filter(t => t.type === 'refund')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balance = totalIncome - totalExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {/* In-Credit */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <CreditCard className="w-8 h-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">In-Credit</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalInCredit)}
            </p>
          </div>
        </div>
      </div>

      {/* Outstanding */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Wallet className="w-8 h-8 text-orange-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Outstanding</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Income */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-green-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <TrendingDown className="w-8 h-8 text-red-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-indigo-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Balance</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Refunds */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <RotateCcw className="w-8 h-8 text-red-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Refunds</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalRefunds)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
