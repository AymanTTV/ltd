// src/components/finance/PayOutstandingModal.tsx
import React, { useState, useEffect } from 'react';
import { doc, writeBatch, arrayUnion, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction, Payment } from '../../types';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FormField from '../ui/FormField';
import { useAuth } from '../../context/AuthContext';

interface PayOutstandingModalProps {
  transaction: Transaction;
  customerInCreditBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PayOutstandingModal: React.FC<PayOutstandingModalProps> = ({
  transaction,
  customerInCreditBalance,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>(
    (transaction.remainingAmount ?? transaction.amount).toString()
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [useInCredit, setUseInCredit] = useState(false);
  const { formatCurrency } = useFormattedDisplay();

  const remainingAmount = transaction.remainingAmount ?? transaction.amount;

  useEffect(() => {
    if (useInCredit) {
      const amountToPay = Math.min(remainingAmount, customerInCreditBalance);
      setPaymentAmount(amountToPay.toString());
      setPaymentMethod('in-credit');
    } else {
      setPaymentAmount(remainingAmount.toString());
      setPaymentMethod('cash');
    }
  }, [useInCredit, remainingAmount, customerInCreditBalance]);

  const handlePayment = async () => {
    setLoading(true);
    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount.');
      setLoading(false);
      return;
    }

    if (amount > remainingAmount) {
      toast.error(`Payment cannot exceed remaining amount of ${formatCurrency(remainingAmount)}.`);
      setLoading(false);
      return;
    }

    if (useInCredit && amount > customerInCreditBalance) {
      toast.error('Payment amount exceeds available in-credit balance.');
      setLoading(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      const transactionRef = doc(db, 'transactions', transaction.id);

      const newPaidAmount = (transaction.paidAmount || 0) + amount;
      const newRemainingAmount = transaction.amount - newPaidAmount;
      const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'partially_paid';

      const newPayment: Payment = {
        amount,
        date: new Date(),
        method: paymentMethod,
        reference: paymentReference,
        createdBy: user?.name || user?.email || 'System',
      };

      // 1. Update the outstanding transaction
      batch.update(transactionRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: arrayUnion(newPayment),
        ...(newPaymentStatus === 'paid' && { status: 'completed' }),
        updatedAt: new Date(),
      });
      
      // 2. Create a corresponding 'income' transaction
      const incomeRef = doc(collection(db, 'transactions'));
      batch.set(incomeRef, {
        type: 'income',
        amount: amount,
        date: new Date(),
        category: transaction.category, // Inherit category from outstanding charge
        description: `Payment for: ${transaction.description}`,
        paymentStatus: 'paid',
        status: 'completed',
        paymentMethod: paymentMethod,
        paymentReference: paymentReference,
        customerId: transaction.customerId,
        customerName: transaction.customerName,
        createdAt: new Date(),
        createdBy: user?.name || user?.email || 'System',
      });
      
      // 3. If using in-credit balance, deduct it from the source 'in-credit' transactions
      if (useInCredit && amount > 0) {
          const inCreditTransactionsQuery = query(
              collection(db, 'transactions'),
              where('customerId', '==', transaction.customerId),
              where('type', '==', 'in-credit'),
              where('remainingAmount', '>', 0)
          );
          const querySnapshot = await getDocs(inCreditTransactionsQuery);
          let amountToDeduct = amount;

          for (const docSnap of querySnapshot.docs) {
              if (amountToDeduct <= 0) break;
              const inCreditTx = docSnap.data() as Transaction;
              const available = inCreditTx.remainingAmount || inCreditTx.amount;
              const deduction = Math.min(amountToDeduct, available);

              const inCreditTxRef = doc(db, 'transactions', docSnap.id);
              const newInCreditRemaining = available - deduction;
              const newInCreditPaid = (inCreditTx.paidAmount || 0) + deduction;
              
              batch.update(inCreditTxRef, {
                  remainingAmount: newInCreditRemaining,
                  paidAmount: newInCreditPaid,
                  paymentStatus: newInCreditRemaining <= 0 ? 'paid' : 'partially_paid'
              });

              amountToDeduct -= deduction;
          }
      }

      await batch.commit();

      toast.success('Payment recorded successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing payment: ', error);
      toast.error('Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Pay Outstanding Charge</h2>
      <div className="bg-gray-100 p-4 rounded-md mb-4 space-y-2">
        <p><strong>Customer:</strong> {transaction.customerName}</p>
        <p><strong>Total Amount:</strong> {formatCurrency(transaction.amount)}</p>
        <p><strong>Amount Remaining:</strong> <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span></p>
        <p><strong>Description:</strong> {transaction.description}</p>
      </div>

      {customerInCreditBalance > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={useInCredit}
                    onChange={(e) => setUseInCredit(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-blue-800">
                    Use available in-credit balance ({formatCurrency(customerInCreditBalance)})
                </span>
            </label>
        </div>
      )}

      <div className="space-y-4">
        <FormField
          type="number"
          label="Payment Amount"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          max={remainingAmount.toString()}
          min="0.01"
          step="0.01"
          required
          disabled={useInCredit}
        />
        {!useInCredit && (
            <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
                </select>
            </div>
        )}
        <FormField
          label="Payment Reference (Optional)"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
      </div>

      {transaction.payments && transaction.payments.length > 0 && (
          <div className="mt-6">
              <h3 className="text-md font-medium text-gray-800 mb-2">Payment History</h3>
              <div className="border rounded-md max-h-40 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {transaction.payments.map((p, i) => (
                              <tr key={i}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{(p.date as any instanceof Timestamp ? (p.date as any).toDate() : new Date(p.date)).toLocaleDateString()}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(p.amount)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{p.method}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
};

export default PayOutstandingModal;