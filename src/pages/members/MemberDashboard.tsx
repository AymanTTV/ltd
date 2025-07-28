// src/pages/members/MemberDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useFinances } from '../../hooks/useFinances';
import { useInvoices } from '../../hooks/useInvoices';
import {
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  Filter,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Transaction } from '../../types';

// Utility to format GBP
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);

// Claim status badge styles (you can drop this if you don't need badges here)
const claimStatusStyles: { [key in Invoice['paymentStatus']]: { text: string; color: string; bg: string } } = {
  paid:           { text: 'Paid',           color: 'text-green-700',   bg: 'bg-green-100' },
  overdue:        { text: 'Overdue',        color: 'text-red-700',     bg: 'bg-red-100' },
  partially_paid: { text: 'Partial',        color: 'text-orange-700',  bg: 'bg-orange-100' },
  pending:        { text: 'Pending',        color: 'text-gray-700',    bg: 'bg-gray-100' },
};

const MemberDashboard: React.FC = () => {
  // session must exist (RequireMember ensures this)
  const sessionStr = localStorage.getItem('memberSession');
  if (!sessionStr) return null;
  const { customerId } = JSON.parse(sessionStr);

  // fetch all, then scope to this member
  const { transactions: allTransactions, loading: finLoading } = useFinances();
  const { invoices:    allClaims,       loading: clLoading  } = useInvoices();
  const loading = finLoading || clLoading;

  // only this member’s records
  const myTransactions: Transaction[] = allTransactions.filter(t => t.customerId === customerId);
  const myClaims:       Invoice[]     = allClaims.filter(c => c.customerId   === customerId);

  // filter UI state
  const [filterState, setFilterState] = useState({
    startDate: '',
    endDate:   '',
    status:    'all' as string,
  });

  // displayed after filtering
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredClaims,       setFilteredClaims]       = useState<Invoice[]>([]);

  // init filtered lists
  useEffect(() => {
    setFilteredTransactions(myTransactions);
    setFilteredClaims(myClaims);
  }, [myTransactions, myClaims]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilterState(s => ({ ...s, [name]: value }));
  };

  const handleApplyFilters = () => {
    let txs = [...myTransactions];
    let cls = [...myClaims];
    const { startDate, endDate, status } = filterState;

    if (startDate) {
      const s = new Date(startDate);
      txs = txs.filter(t => t.date >= s);
      cls = cls.filter(c => c.date >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59,999);
      txs = txs.filter(t => t.date <= e);
      cls = cls.filter(c => c.date <= e);
    }
    if (status !== 'all') {
      txs = txs.filter(t =>
        status === 'unpaid'
          ? (t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid')
          : t.paymentStatus === status
      );
      cls = cls.filter(c => c.paymentStatus === status as Invoice['paymentStatus']);
    }

    setFilteredTransactions(txs);
    setFilteredClaims(cls);
  };

  const handleResetFilters = () => {
    setFilterState({ startDate: '', endDate: '', status: 'all' });
    setFilteredTransactions(myTransactions);
    setFilteredClaims(myClaims);
  };

  // KPI calculations on **filtered** data
  const totalIncome      = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalOutstanding = filteredTransactions
    .filter(t => t.type === 'outstanding' && t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.remainingAmount ?? t.amount), 0);
  const totalPaidClaims  = filteredClaims.filter(c => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.total, 0);

  // “recent” lists
  const recentTransactions = [...filteredTransactions]
    .sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,5);
  const recentClaims = [...filteredClaims]
    .sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filterState.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filterState.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={filterState.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid/Partial</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md"
            >
              <Filter className="mr-2 h-5 w-5" />
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white border rounded-md"
            >
              <X className="mr-2 h-5 w-5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard icon={<TrendingUp />} title="Total Income" value={formatCurrency(totalIncome)} color="green" />
        <KpiCard icon={<AlertTriangle />} title="Outstanding" value={formatCurrency(totalOutstanding)} color="orange" />
        <KpiCard icon={<FileText />} title="Paid Claims" value={formatCurrency(totalPaidClaims)} color="blue" />
        <KpiCard icon={<Users />} title="Total Records" value={(filteredTransactions.length + filteredClaims.length).toString()} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <InfoCard title="Recent Transactions">
          <ul className="divide-y">
            {recentTransactions.length ? recentTransactions.map(tx => (
              <li key={tx.id} className="p-3 flex justify-between text-sm">
                <span>{format(tx.date, 'dd MMM, yyyy')}</span>
                <span className="truncate">{tx.category}</span>
                <span>{formatCurrency(tx.amount)}</span>
              </li>
            )) : (
              <li className="p-3 text-center text-gray-500">No transactions found.</li>
            )}
          </ul>
        </InfoCard>

        {/* Recent Claims */}
        <InfoCard title="Recent Claims">
          <ul className="divide-y">
            {recentClaims.length ? recentClaims.map(c => {
              const style = claimStatusStyles[c.paymentStatus] || claimStatusStyles.pending;
              return (
                <li key={c.id} className="p-3 flex justify-between items-center text-sm">
                  <div>
                    <p>{format(c.date, 'dd MMM, yyyy')}</p>
                    <p className="text-gray-500">{c.category}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(c.total)}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${style.bg} ${style.color}`}>
                      {style.text}
                    </span>
                  </div>
                </li>
              );
            }) : (
              <li className="p-3 text-center text-gray-500">No claims found.</li>
            )}
          </ul>
        </InfoCard>
      </div>
    </div>
  );
};

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: 'green'|'orange'|'blue'|'indigo';
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, title, value, color }) => {
  const bg = {
    green:  'bg-green-50',
    orange: 'bg-orange-50',
    blue:   'bg-blue-50',
    indigo: 'bg-indigo-50',
  }[color];
  return (
    <div className={`${bg} p-4 rounded shadow flex items-center space-x-3`}>
      <div className={`p-2 rounded-full text-${color}-500 bg-white`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
};

interface InfoCardProps { title: string; children: React.ReactNode; }
const InfoCard: React.FC<InfoCardProps> = ({ title, children }) => (
  <div className="bg-white rounded shadow-sm">
    <h2 className="px-4 py-2 font-semibold text-gray-800">{title}</h2>
    <div className="px-4 pb-4">{children}</div>
  </div>
);

export default MemberDashboard;
