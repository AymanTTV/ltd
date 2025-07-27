// src/components/finance/RefundModal.tsx
import React, { useState } from 'react';
import { doc, writeBatch, arrayUnion, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction, Payment } from '../../types';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FormField from '../ui/FormField';
import { useAuth } from '../../context/AuthContext';

interface RefundModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * A modal for processing refunds on 'in-credit' transactions.
 * It allows specifying a refund amount and reason, then updates the database accordingly.
 */
const RefundModal: React.FC<RefundModalProps> = ({ transaction, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const { formatCurrency } = useFormattedDisplay();

  const maxRefundAmount = transaction.remainingAmount ?? 0;

  /**
   * Handles the refund logic by creating a batch write to Firestore.
   * 1. Updates the original in-credit transaction (reduces remaining amount, adds refund history).
   * 2. Creates a new 'expense' transaction to log the cash outflow.
   */
  const handleRefund = async () => {
    setLoading(true);
    const amount = parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount.');
      setLoading(false);
      return;
    }

    if (amount > maxRefundAmount) {
      toast.error(`Refund cannot exceed available credit of ${formatCurrency(maxRefundAmount)}.`);
      setLoading(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      const transactionRef = doc(db, 'transactions', transaction.id);

      const newRemainingAmount = maxRefundAmount - amount;
      // 'paidAmount' tracks total credit used OR refunded.
      const newPaidAmount = (transaction.paidAmount ?? 0) + amount;
      const newPaymentStatus = newRemainingAmount <= 0 ? 'refunded' : 'partially_refunded';

      const newRefund: Payment = {
        amount,
        date: new Date(),
        method: 'refund',
        notes: refundReason,
        createdBy: user?.name || user?.email || 'System',
      };

      // 1. Update the in-credit transaction
      batch.update(transactionRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        refunds: arrayUnion(newRefund),
        updatedAt: new Date(),
        updatedBy: user?.name || user?.email || 'System',
      });

      // 2. Create a corresponding 'expense' transaction for the cash outflow
      const expenseRef = doc(collection(db, 'transactions'));
      batch.set(expenseRef, {
        type: 'refund',
        amount: amount,
        date: new Date(),
        category: 'Refund',
        description: `Refund for in-credit from ${transaction.customerName}. Reason: ${refundReason || 'N/A'}`,
        paymentStatus: 'paid',
        status: 'completed',
        paymentMethod: 'cash', // Assuming cash refund, could be a dropdown.
        customerId: transaction.customerId,
        customerName: transaction.customerName,
        createdAt: new Date(),
        createdBy: user?.name || user?.email || 'System',
      });

      await batch.commit();

      toast.success('Refund processed successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing refund: ', error);
      toast.error('Failed to process refund.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Refund In-Credit</h2>
      <div className="bg-gray-100 p-4 rounded-md mb-4 space-y-2">
        <p><strong>Customer:</strong> {transaction.customerName}</p>
        <p><strong>Available Credit:</strong> <span className="font-bold text-green-600">{formatCurrency(maxRefundAmount)}</span></p>
      </div>

      <div className="space-y-4">
        <FormField
          type="number"
          label="Refund Amount"
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          max={maxRefundAmount.toString()}
          min="0.01"
          step="0.01"
          required
        />
        <FormField
          label="Reason for Refund (Optional)"
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleRefund}
          disabled={loading || !refundAmount}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Confirm Refund'}
        </button>
      </div>
    </div>
  );
};

export default RefundModal;
