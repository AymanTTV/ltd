// src/components/finance/TransactionForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Customer, Account, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import financeCategoryService from '../../services/financeCategory.service';

interface TransactionFormProps {
  type: 'income' | 'expense' | 'in-credit';
  transaction?: Transaction;
  accounts: Account[];
  customers: Customer[];
  onClose: () => void;
  onUpdateTransaction?: (transaction: Transaction) => Promise<void>;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType,
  transaction,
  accounts,
  customers,
  onClose,
  onUpdateTransaction,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<Date | Timestamp | null>(null);

  const [formData, setFormData] = useState({
    date: transaction?.date ? (transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: transaction?.amount ? Math.abs(transaction.amount).toString() : '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    paymentMethod: transaction?.paymentMethod || 'cash',
    paymentReference: transaction?.paymentReference || '',
    paymentStatus: transaction?.paymentStatus || 'pending',
    status: transaction?.status || 'completed',
    customerId: transaction?.customerId || '',
    customerName: transaction?.customerName || '',
  });

  useEffect(() => {
    financeCategoryService.getAll().then(docs => setFinanceCategories(docs.map(c => c.name).sort())).catch(() => toast.error('Could not load categories'));
  }, []);

  useEffect(() => {
    if (transaction) {
      setOriginalCreatedAt(transaction.createdAt);
      setManualEntry(!!transaction.customerName && !transaction.customerId);
    }
    
    // Set defaults based on the type of form
    if (initialType === 'in-credit') {
      setFormData(prev => ({
        ...prev,
        category: transaction?.category || 'In-Credit',
        description: transaction?.description || 'Customer In-Credit',
        // FIXED: The initial status of an in-credit record should be 'unpaid',
        // meaning the credit has not been paid out/used by the customer yet.
        paymentStatus: transaction?.paymentStatus || 'unpaid',
        paymentMethod: transaction?.paymentMethod || 'cash',
      }));
      setManualEntry(false);
    } else {
        setFormData(prev => ({
            ...prev,
            category: transaction?.category || '',
            description: transaction?.description || '',
            paymentStatus: transaction?.paymentStatus || 'pending',
            paymentMethod: transaction?.paymentMethod || 'cash',
        }));
    }
  }, [initialType, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('User not authenticated');
    setLoading(true);

    try {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      const newAmount = Math.abs(parseFloat(formData.amount || '0'));
      if (isNaN(newAmount) || newAmount <= 0) {
        toast.error('Please enter a valid positive amount.');
        setLoading(false);
        return;
      }

      if (initialType === 'in-credit' && !formData.customerId) {
        toast.error('Please select a customer for an in-credit transaction.');
        setLoading(false);
        return;
      }

      const basePayload: any = {
        type: initialType,
        date: new Date(formData.date),
        amount: newAmount,
        category: formData.category,
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference || null,
        status: formData.status,
        customerId: manualEntry ? null : formData.customerId || null,
        customerName: manualEntry ? formData.customerName : selectedCustomer?.fullName || null,
      };

      if (initialType === 'in-credit') {
        basePayload.paymentStatus = 'unpaid'; // Credit is available but not yet used.
        basePayload.paidAmount = 0;
        basePayload.remainingAmount = newAmount;
      } else {
        basePayload.paymentStatus = formData.paymentStatus;
        if (basePayload.paymentStatus === 'paid') {
          basePayload.paidAmount = newAmount;
          basePayload.remainingAmount = 0;
        } else {
          basePayload.paidAmount = 0;
          basePayload.remainingAmount = newAmount;
        }
      }

      if (transaction?.id) {
        const updatedPayload = {
          ...basePayload,
          createdAt: originalCreatedAt || new Date(),
          updatedAt: new Date(),
          updatedBy: user.name || user.email || '',
        };
        await updateDoc(doc(db, 'transactions', transaction.id), updatedPayload);
        toast.success('Transaction updated successfully');
      } else {
        const createPayload = {
          ...basePayload,
          createdAt: new Date(),
          createdBy: user.name || user.email || '',
        };
        await addDoc(collection(db, 'transactions'), createPayload);
        toast.success('Transaction created successfully');
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save transaction: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField type="date" label="Date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
        <FormField type="number" label="Amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} min="0.01" step="0.01" required />
      </div>

      <SearchableSelect
        label="Category"
        options={financeCategories.map(name => ({ id: name, label: name }))}
        value={formData.category}
        onChange={value => setFormData({ ...formData, category: value as string })}
        placeholder="Search or select a category…"
        required
        disabled={initialType === 'in-credit'}
      />

      {initialType !== 'in-credit' && (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={manualEntry} onChange={e => setManualEntry(e.target.checked)} className="rounded" />
          <span>Enter Customer Manually</span>
        </label>
      )}

      {manualEntry && initialType !== 'in-credit' ? (
        <FormField label="Customer Name" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
      ) : (
        <SearchableSelect
          label="Select Customer"
          options={customers.map(c => ({ id: c.id, label: c.fullName, subLabel: c.badgeNumber ? `Badge #${c.badgeNumber}` : '' }))}
          value={formData.customerId}
          onChange={id => setFormData({ ...formData, customerId: id as string, customerName: customers.find(c => c.id === id)?.fullName || '' })}
          placeholder="Search customers..."
          required={initialType === 'in-credit'}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Method</label>
          <select className="mt-1 block w-full rounded-md border-gray-300" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} required>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="other">Other</option>
          </select>
        </div>
        <FormField label="Payment Reference (Optional)" value={formData.paymentReference} onChange={e => setFormData({ ...formData, paymentReference: e.target.value })} />
      </div>

      {initialType !== 'in-credit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select className="mt-1 block w-full rounded-md border-gray-300" value={formData.paymentStatus} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })} required>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Transaction Status</label>
        <select className="mt-1 block w-full rounded-md border-gray-300" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} required>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium bg-white border rounded-md">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md">{loading ? 'Saving…' : 'Save Transaction'}</button>
      </div>
    </form>
  );
};

export default TransactionForm;
