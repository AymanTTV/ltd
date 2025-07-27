// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useInvoices } from '../hooks/useInvoices';
import { useCustomers } from '../hooks/useCustomers';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import {
  Users,
  Building,
  TrendingUp,
  FileText,
  AlertTriangle,
  UserPlus,
  Filter,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Transaction } from '../types';

// A simple utility to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

// Helper for claim status styles
const claimStatusStyles: { [key in Invoice['paymentStatus']]: { text: string; color: string; bg: string } } = {
  paid: { text: 'Paid', color: 'text-green-700', bg: 'bg-green-100' },
  overdue: { text: 'Overdue', color: 'text-red-700', bg: 'bg-red-100' },
  partially_paid: { text: 'Partial', color: 'text-orange-700', bg: 'bg-orange-100' },
  pending: { text: 'Pending', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const Dashboard: React.FC = () => {
  // Original data from hooks
  const { transactions: allTransactions, loading: finLoading } = useFinances();
  const { invoices: allClaims, loading: claimsLoading } = useInvoices();
  const { customers: members, loading: memLoading } = useCustomers();
  const { companyDetails, loading: compLoading } = useCompanyDetails();
  
  // State for filters
  const [filterState, setFilterState] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
  });
  
  // State for data that gets displayed after filtering
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Invoice[]>([]);

  const loading = finLoading || claimsLoading || memLoading || compLoading;

  // Effect to initialize/update filtered data when original data loads
  useEffect(() => {
    setFilteredTransactions(allTransactions);
    setFilteredClaims(allClaims);
  }, [allTransactions, allClaims]);

  // Filtering Logic
  const handleApplyFilters = () => {
    let tempTransactions = [...allTransactions];
    let tempClaims = [...allClaims];

    const { startDate, endDate, status } = filterState;

    if (startDate) {
      const start = new Date(startDate);
      tempTransactions = tempTransactions.filter(t => t.date >= start);
      tempClaims = tempClaims.filter(c => c.date >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      tempTransactions = tempTransactions.filter(t => t.date <= end);
      tempClaims = tempClaims.filter(c => c.date <= end);
    }

    if (status !== 'all') {
      if (status === 'unpaid') {
        tempTransactions = tempTransactions.filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid');
      } else {
        tempTransactions = tempTransactions.filter(t => t.paymentStatus === status);
      }
      tempClaims = tempClaims.filter(c => c.paymentStatus === status as Invoice['paymentStatus']);
    }
    
    setFilteredTransactions(tempTransactions);
    setFilteredClaims(tempClaims);
  };
  
  const handleResetFilters = () => {
    setFilterState({ startDate: '', endDate: '', status: 'all' });
    setFilteredTransactions(allTransactions);
    setFilteredClaims(allClaims);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilterState(prev => ({ ...prev, [name]: value }));
  };

  // Data Calculations: Now based on FILTERED data
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutstanding = filteredTransactions
    .filter(t => t.type === 'outstanding' && t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.remainingAmount || t.amount), 0);
  
  const totalPaidClaims = filteredClaims
    .filter(c => c.paymentStatus === 'paid')
    .reduce((sum, c) => sum + c.total, 0);

  const activeMembers = members.filter(m => m.status === 'ACTIVE');
  const memberBadgeMap = new Map(members.map(m => [m.id, m.badgeNumber]));
  
  const recentMembers = [...members]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);
    
  const recentClaims = [...filteredClaims]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">System Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's a summary of your operations.</p>
        </div>

        {/* Filter UI */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" name="startDate" id="startDate" value={filterState.startDate} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" name="endDate" id="endDate" value={filterState.endDate} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select id="status" name="status" value={filterState.status} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid/Partial</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleApplyFilters} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Filter className="-ml-1 mr-2 h-5 w-5" />
                Apply
              </button>
              <button onClick={handleResetFilters} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <X className="-ml-1 mr-2 h-5 w-5" />
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard icon={<TrendingUp className="text-green-500" />} title="Total Income" value={formatCurrency(totalIncome)} color="green" />
          <KpiCard icon={<AlertTriangle className="text-orange-500" />} title="Outstanding Payments" value={formatCurrency(totalOutstanding)} color="orange" />
          <KpiCard icon={<FileText className="text-blue-500" />} title="Paid Claims (Total)" value={formatCurrency(totalPaidClaims)} color="blue" />
          <KpiCard icon={<Users className="text-indigo-500" />} title="Active Members" value={activeMembers.length.toString()} color="indigo" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <InfoCard title="Filtered Transactions">
               <ul className="divide-y divide-gray-200">
                <li className="py-2 flex items-center font-semibold text-xs text-gray-500 uppercase tracking-wider">
                  <span className="w-[20%]">Date</span>
                  <span className="w-[20%]">Category</span>
                  <span className="flex-1">Customer</span>
                  <span className="w-[15%]">Badge No.</span>
                  <span className="w-[20%] text-right">Amount</span>
                </li>
                {recentTransactions.length > 0 ? recentTransactions.map(tx => (
                  <li key={tx.id} className="py-3 flex items-center text-sm text-gray-800">
                    <span className="w-[20%]">{format(tx.date, 'dd MMM, yyyy')}</span>
                    <span className="w-[20%] truncate pr-2">{tx.category}</span>
                    <span className="flex-1 truncate pr-2">{tx.customerName || 'N/A'}</span>
                    <span className="w-[15%]">{tx.customerId ? memberBadgeMap.get(tx.customerId) || 'N/A' : 'N/A'}</span>
                    <span className={`w-[20%] text-right font-semibold ${tx.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(tx.amount)}
                    </span>
                  </li>
                )) : (<p className="text-center text-gray-500 py-4">No transactions match the current filters.</p>)}
              </ul>
            </InfoCard>

            <InfoCard title="Filtered Claims">
               <ul className="divide-y divide-gray-200">
                {recentClaims.length > 0 ? recentClaims.map(claim => {
                  const statusStyle = claimStatusStyles[claim.paymentStatus] || claimStatusStyles.pending;
                  return (
                    <li key={claim.id} className="py-3 flex justify-between items-center text-sm">
                      <div className="flex-1 space-y-1 pr-4">
                        <p className="font-medium text-gray-800">{claim.customerName || 'N/A'}<span className="ml-2 text-gray-500 font-normal">(Badge: {claim.customerId ? memberBadgeMap.get(claim.customerId) || 'N/A' : 'N/A'})</span></p>
                        <p className="text-gray-500"><span className="font-medium">Category:</span> {claim.category} | <span className="font-medium">Date:</span> {format(claim.date, 'dd MMM, yyyy')}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={`font-semibold ${statusStyle.color}`}>{formatCurrency(claim.total)}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.color}`}>{statusStyle.text}</span>
                      </div>
                    </li>
                  )
                }) : (<p className="text-center text-gray-500 py-4">No claims match the current filters.</p>)}
              </ul>
            </InfoCard>
          </div>

          <div className="space-y-8">
             <InfoCard title="Company Information">
                <div className="flex items-center space-x-4">
                    {companyDetails?.logoUrl ? (<img src={companyDetails.logoUrl} alt="Company Logo" className="h-16 w-16 rounded-full object-cover"/>) : (<div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center"><Building className="h-8 w-8 text-blue-600"/></div>)}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{companyDetails?.name || 'London Taxi Association'}</h3>
                        <p className="text-sm text-gray-500">{companyDetails?.email}</p>
                        <p className="text-sm text-gray-500">{companyDetails?.phone}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">{companyDetails?.address}</p>
            </InfoCard>

            <InfoCard title="Newest Members">
              <ul className="divide-y divide-gray-100">
                  {recentMembers.map(member => (
                    <li key={member.id} className="py-3 flex items-center space-x-3 text-sm">
                      <UserPlus size={18} className="text-indigo-500"/>
                      <div>
                        <p className="font-medium text-gray-700">{member.fullName}</p>
                        <p className="text-gray-500">Joined: {format(member.createdAt, 'dd MMM, yyyy')}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Reusable Components (FIXED) ---

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: 'green' | 'orange' | 'blue' | 'indigo';
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, title, value, color }) => {
  const colorClasses = {
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    blue: 'bg-blue-50',
    indigo: 'bg-indigo-50',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center space-x-4 transition-all hover:shadow-md hover:-translate-y-1">
      <div className={`p-3 rounded-full ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};


interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
    <div>{children}</div>
  </div>
);

export default Dashboard;