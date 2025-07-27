// src/components/dashboard/InvoiceSummary.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Invoice } from '../../types';

interface InvoiceSummaryProps {
  invoices: Invoice[];
}

export default function InvoiceSummary({ invoices }: InvoiceSummaryProps) {
  const invoiceCount = invoices.length;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium text-gray-900">
          Invoice Summary
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Number and value of invoices
        </p>
      </CardHeader>

      <CardContent>
        <div className="flex space-x-8">
          <div className="text-center">
            <p className="text-3xl font-semibold">{invoiceCount}</p>
            <p className="text-sm text-gray-500">Invoices</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-semibold">
              ${totalInvoiced.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Invoiced</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
