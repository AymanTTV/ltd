// src/hooks/useInvoiceFilters.ts

import { useState, useMemo } from 'react';
import { Invoice, Customer } from '../types';
import { isWithinInterval, isAfter } from 'date-fns';

export const useInvoiceFilters = (invoices: Invoice[], customers?: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredInvoices = useMemo(() => {
    const paymentStatuses = ['paid', 'partially_paid', 'pending', 'overdue'];
    const approvalStatuses = ['Pending', 'Approved', 'Rejected'];

    return invoices.filter(invoice => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" ||
        (invoice.customerName?.toLowerCase().includes(searchLower)) ||
        (invoice.id.toLowerCase().includes(searchLower)) ||
        (invoice.category.toLowerCase().includes(searchLower)) ||
        (invoice.customCategory?.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategoryFilter = categoryFilter === 'all' || invoice.category === categoryFilter;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(invoice.date, { start: dateRange.start, end: dateRange.end });
      }

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (paymentStatuses.includes(statusFilter)) {
          // Handle special 'overdue' case
          if (statusFilter === 'overdue') {
            matchesStatus = invoice.paymentStatus !== 'paid' && isAfter(new Date(), invoice.dueDate);
          } else {
            matchesStatus = invoice.paymentStatus === statusFilter;
          }
        } else if (approvalStatuses.includes(statusFilter)) {
          matchesStatus = invoice.approvalStatus === statusFilter;
        }
      }

      return matchesSearch && matchesStatus && matchesCategoryFilter && matchesDateRange;
    });
  }, [invoices, customers, searchQuery, statusFilter, categoryFilter, dateRange]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices
  };
};