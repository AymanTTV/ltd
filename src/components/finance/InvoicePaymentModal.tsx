// src/components/finance/InvoicePaymentModal.tsx
import React, { useState } from 'react';
import { Invoice } from '../../types/finance';
import { Vehicle, Customer } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { Upload, File, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoicePaymentModalProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customers: Customer[];
  onClose: () => void;
}

const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  vehicle,
  customers,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amountToPay: invoice.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: '',
    document: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const paymentAmount = parseFloat(formData.amountToPay);
    if (paymentAmount <= 0 || paymentAmount > invoice.remainingAmount + 0.01) { // Allow for small float inaccuracies
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);

    try {
      // upload optional document
      let documentUrl: string | undefined;
      if (formData.document) {
        toast.loading('Uploading document...');
        const storageRef = ref(
          storage,
          `invoices/${invoice.id}/payments/${Date.now()}_${formData.document.name}`
        );
        const snapshot = await uploadBytes(storageRef, formData.document);
        documentUrl = await getDownloadURL(snapshot.ref);
        toast.dismiss();
      }

      // build new payment record
      const payment = {
        id: Date.now().toString(),
        date: new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference,
        notes: formData.notes,
        document: documentUrl || null,
        createdAt: new Date(),
        createdBy: user.id,
      };

      // compute new totals
      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newRemainingAmount = invoice.amount - newPaidAmount;
      const newPaymentStatus =
        newRemainingAmount <= 0.01 ? 'paid' : 'partially_paid';

      // update Firestore
      await updateDoc(doc(db, 'invoices', invoice.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: [...(invoice.payments || []), payment],
        updatedAt: new Date(),
      });

      // create finance transaction
      const paymentCustomer = customers.find(
        (c) => c.id === invoice.customerId
      );
      const vehicleOwner = vehicle?.owner
        ? {
            name: vehicle.owner.name,
            isDefault: vehicle.owner.isDefault ?? false,
          }
        : undefined;

      await createFinanceTransaction({
        type: 'expense',
        category: invoice.category,
        amount: paymentAmount,
        description: formData.notes,
        referenceId: invoice.id,
        vehicleId: invoice.vehicleId,
        vehicleName: vehicle
          ? `${vehicle.make} ${vehicle.model}`
          : undefined,
        vehicleOwner,
        customerId: invoice.customerId,
        customerName: paymentCustomer?.fullName, // Corrected from .name
        paymentMethod: formData.method,
        paymentReference: formData.reference,
        paymentStatus: 'paid', // The transaction itself is paid
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
      toast.dismiss();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Totals Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between text-sm">
          <span>Invoice Total:</span>
          <span className="font-medium">
            £{invoice.amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">
            £{invoice.paidAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">
            £{invoice.remainingAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) =>
          setFormData({ ...formData, amountToPay: e.target.value })
        }
        required
        min="0.01"
        max={invoice.remainingAmount.toFixed(2)}
        step="0.01"
      />

      {/* Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <select
          value={formData.method}
          onChange={(e) =>
            setFormData({ ...formData, method: e.target.value as any })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      {/* Reference */}
      <FormField
        label="Payment Reference"
        value={formData.reference}
        onChange={(e) =>
          setFormData({ ...formData, reference: e.target.value })
        }
        placeholder="Enter payment reference or transaction ID"
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add any notes about this payment"
        />
      </div>

      {/* NEW: Improved File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Document (Optional)
        </label>
        {formData.document ? (
          <div className="flex items-center justify-between p-2 pl-3 border border-gray-300 rounded-md bg-gray-50">
            <div className="flex items-center gap-2 overflow-hidden">
              <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{formData.document.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, document: null })}
              className="text-red-500 hover:text-red-700 ml-2"
              title="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <label htmlFor="payment-doc-upload" className="relative cursor-pointer mt-1 flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-md hover:border-primary">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <span className="relative bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                  <span>Click to upload</span>
                </span>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF or image up to 10MB
              </p>
              <input
                id="payment-doc-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    document: e.target.files?.[0] || null,
                  })
                }
              />
            </div>
          </label>
        )}
      </div>


      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default InvoicePaymentModal;