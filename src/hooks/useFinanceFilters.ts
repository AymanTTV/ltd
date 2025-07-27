// src/hooks/useFinanceFilters.ts
import { useState, useMemo } from 'react';
import { Transaction, Account, Customer } from '../types';
import { endOfDay, startOfDay } from 'date-fns';

/**
 * A hook to manage filtering and derived financial data.
 * - Filters transactions based on various criteria.
 * - Calculates total in-credit balances per customer.
 * - Identifies customers with no transactions.
 */
export const useFinanceFilters = (
  transactions: Transaction[],
  accounts: Account[],
  customers: Customer[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  // Derived state: Calculate customers who have not been charged
  const unchargedCustomers = useMemo(() => {
    if (!transactions.length || !customers.length) {
      return customers.filter(c => c.status === 'ACTIVE');
    }
    const chargedCustomerIds = new Set(transactions.map(t => t.customerId).filter(Boolean));
    return customers.filter(c => c.status === 'ACTIVE' && !chargedCustomerIds.has(c.id));
  }, [transactions, customers]);

  // Derived state: Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by search query (including customer badge number)
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        // 1. Check for matches in standard transaction fields
        const matchesTransactionFields =
          t.description.toLowerCase().includes(lowercasedQuery) ||
          t.category.toLowerCase().includes(lowercasedQuery) ||
          t.customerName?.toLowerCase().includes(lowercasedQuery) ||
          t.id.toLowerCase().includes(lowercasedQuery);

        // 2. Find the customer and check for a match in their badge number
        const customer = customers.find(c => c.id === t.customerId);
        const matchesBadge = customer?.badgeNumber
          ? String(customer.badgeNumber).toLowerCase().includes(lowercasedQuery)
          : false;

        // 3. Return true if any field or the badge number matches
        return matchesTransactionFields || matchesBadge;
      });
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(t => t.date >= startOfDay(dateRange.start!));
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => t.date <= endOfDay(dateRange.end!));
    }
    
    // FIXED: Corrected filtering logic for transaction type.
    if (type !== 'all') {
      if (type === 'outstanding_in_credit') {
        filtered = filtered.filter(t => t.type === 'outstanding' || t.type === 'in-credit');
      } else if (type === 'income_in_credit') {
        filtered = filtered.filter(t => t.type === 'income' || t.type === 'in-credit');
      } else {
        filtered = filtered.filter(t => t.type === type);
      }
    }

    // Filter by payment status
    if (paymentStatus !== 'all') {
      filtered = filtered.filter(t => t.paymentStatus === paymentStatus);
    }

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    // Filter by customer
    if (selectedCustomerId) {
      filtered = filtered.filter(t => t.customerId === selectedCustomerId);
    }

    // Filter by group
    if (groupFilter !== 'all') {
      filtered = filtered.filter(t => t.groupId === groupFilter);
    }

    return filtered;
  }, [
    transactions,
    customers, // Add customers to dependency array
    searchQuery,
    type,
    category,
    paymentStatus,
    dateRange,
    selectedCustomerId,
    groupFilter,
  ]);

  // Derived state: Calculate in-credit balances for each customer
  const customerInCreditBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    transactions.forEach(t => {
      if (t.type === 'in-credit' && t.customerId) {
        if (!balances[t.customerId]) {
          balances[t.customerId] = 0;
        }
        balances[t.customerId] += t.remainingAmount ?? 0;
      }
    });
    return balances;
  }, [transactions]);
  
  // Derived state: Calculate total amount owing from vehicle owners
  const totalOwingFromOwners = useMemo(() => {
    return transactions
      .filter(t => t.type === 'outstanding' && t.paymentStatus !== 'paid')
      .reduce((sum, t) => sum + (t.remainingAmount ?? t.amount), 0);
  }, [transactions]);


  return {
    searchQuery, setSearchQuery,
    type, setType,
    category, setCategory,
    groupFilter, setGroupFilter,
    paymentStatus, setPaymentStatus,
    dateRange, setDateRange,
    selectedCustomerId, setSelectedCustomerId,
    accountFilter, setAccountFilter,
    filteredTransactions,
    customerInCreditBalances,
    totalOwingFromOwners,
    unchargedCustomers,
  };
};