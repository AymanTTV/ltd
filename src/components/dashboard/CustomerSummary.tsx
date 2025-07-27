// src/components/dashboard/CustomerSummary.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Customer } from '../../types';

interface CustomerSummaryProps {
  customers: Customer[];
}

export default function CustomerSummary({ customers }: CustomerSummaryProps) {
  const customerCount = customers.length;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium text-gray-900">Customer Summary</h3>
        <p className="mt-1 text-sm text-gray-500">Total number of customers</p>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-4xl font-semibold">{customerCount}</p>
          <p className="text-sm text-gray-500">Customers</p>
        </div>
      </CardContent>
    </Card>
  );
}