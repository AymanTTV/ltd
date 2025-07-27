// src/components/finance/TransactionDetails.tsx
import React from 'react';
import { Transaction, Customer, Account } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { DollarSign, Calendar, FileText, User, Mail, Phone, MapPin, List, RotateCcw } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Timestamp } from 'firebase/firestore';

interface TransactionDetailsProps {
  transaction: Transaction;
  customer?: Customer;
  accounts: Account[];
}

const TransactionDetailsModal: React.FC<TransactionDetailsProps> = ({ 
  transaction, 
  accounts,
  customer
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Timestamp ? date.toDate() : new Date(date);
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const Section = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) => (
    <div className="border-t border-gray-200 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        {Icon && <Icon className="w-5 h-5 mr-2 text-gray-500" />}
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 p-2">
      {/* Basic Information */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Type</h3>
          <div className="mt-1">
            <StatusBadge status={transaction.type} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Category</h3>
          <p className="mt-1">{transaction.category}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount</h3>
          <p className={`mt-1 text-lg font-medium ${
            transaction.type === 'income' || transaction.type === 'in-credit' ? 'text-green-600' : transaction.type === 'expense' ? 'text-red-600' : 'text-orange-600'
          }`}>
            {formatCurrency(transaction.amount)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Date</h3>
          <p className="mt-1">{formatDate(transaction.date)}</p>
        </div>
      </div>

     {/* Customer Information */}
      {(customer || transaction.customerName) && (
        <Section title="Customer Details" icon={User}>
          {customer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{customer.fullName}</p>
                  <p className="text-sm text-gray-500">
                    Badge Number: {customer.badgeNumber ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <p>{customer.mobile}</p>
              </div>
              <div className="flex items-center col-span-full">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <p>{customer.email}</p>
              </div>
              <div className="flex items-center col-span-full">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <p>{customer.address}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <p>{transaction.customerName}</p>
            </div>
          )}
        </Section>
      )}

      {/* Payment Information */}
      <Section title="Payment Details" icon={DollarSign}>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={transaction.paymentStatus} />
          </div>
          <div className="flex justify-between">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-medium">{formatCurrency(transaction.amount)}</span>
            </div>
          {transaction.paidAmount !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid / Used Amount</span>
              <span className="text-green-600 font-medium">{formatCurrency(transaction.paidAmount)}</span>
            </div>
          )}
          {transaction.remainingAmount !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining Amount</span>
              <span className="text-red-600 font-medium">{formatCurrency(transaction.remainingAmount)}</span>
            </div>
          )}
          {transaction.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">Last Payment Method</span>
              <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Payment History */}
      {transaction.payments && transaction.payments.length > 0 && (
          <Section title={transaction.type === 'in-credit' ? 'Credit Usage History' : 'Payment History'} icon={List}>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {transaction.payments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p, i) => (
                              <tr key={i}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(p.date)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatCurrency(p.amount)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 capitalize">{p.method.replace('_', ' ')}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{p.reference || 'N/A'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Section>
      )}

      {/* ADDED: Refund History Section */}
      {transaction.refunds && transaction.refunds.length > 0 && (
          <Section title="Refund History" icon={RotateCcw}>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {transaction.refunds.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p, i) => (
                              <tr key={i}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(p.date)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">{formatCurrency(p.amount)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{p.notes || 'N/A'}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{p.createdBy}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Section>
      )}

      {/* Description */}
      <Section title="Description" icon={FileText}>
        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{transaction.description}</p>
      </Section>

      {/* Creation Information */}
      <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
        <p>Created by {transaction.createdBy} at {formatDate(transaction.createdAt)}</p>
        {transaction.updatedAt && <p>Last updated by {transaction.updatedBy} at {formatDate(transaction.updatedAt)}</p>}
      </div>
    </div>
  );
};

export default TransactionDetailsModal;
