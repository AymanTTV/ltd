import React, { useState, useEffect } from 'react';
import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Customer, Account, Transaction, Payment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import financeCategoryService from '../../services/financeCategory.service';
import { Users } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect';

interface BulkChargeFormProps {
  accounts: Account[];
  customers: Customer[]; // Expects pre-filtered active customers
  onClose: () => void;
}

const BulkChargeForm: React.FC<BulkChargeFormProps> = ({
  customers,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [chargeType, setChargeType] = useState<'all' | 'selected'>('all');

  // State for finance categories dropdown
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  useEffect(() => {
    financeCategoryService.getAll().then(docs => {
      setFinanceCategories(docs.map(c => c.name).sort());
    }).catch(() => toast.error('Could not load categories'));
  }, []);

  // Form state for the bulk charge details
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentStatus: 'unpaid' as const,
  });

  const getCustomersToCharge = () => {
    if (chargeType === 'all') {
      return customers;
    }
    return customers.filter(c => selectedCustomerIds.includes(c.id));
  };
  
  const customersToCharge = getCustomersToCharge();
  
  const customerOptions = customers.map(c => ({ 
    id: c.id, 
    label: c.fullName,
    subLabel: c.badgeNumber ? `Badge #${c.badgeNumber}` : undefined
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('User not authenticated');
    
    const finalCustomersToCharge = getCustomersToCharge();
    if (finalCustomersToCharge.length === 0) {
      return toast.error('Please select at least one customer to charge.');
    }

    setLoading(true);
    toast.loading('Creating charges...');
    try {
      const chargeAmount = Math.abs(parseFloat(formData.amount || '0'));
      if (isNaN(chargeAmount) || chargeAmount <= 0) {
        toast.error('Please enter a valid, positive amount.');
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);

      for (const customer of finalCustomersToCharge) {
        // 1. Check for customer's in-credit balance
        const inCreditQuery = query(
          collection(db, 'transactions'),
          where('customerId', '==', customer.id),
          where('type', '==', 'in-credit'),
          where('remainingAmount', '>', 0)
        );
        const inCreditSnap = await getDocs(inCreditQuery);
        let availableCredit = 0;
        inCreditSnap.docs.forEach(doc => {
            availableCredit += (doc.data().remainingAmount || 0);
        });

        let amountToPayFromCredit = Math.min(chargeAmount, availableCredit);
        let remainingChargeAmount = chargeAmount - amountToPayFromCredit;

        let paymentForOutstanding: Payment | null = null;

        // 2. If credit is used, create income transaction and update credit sources
        if (amountToPayFromCredit > 0) {
          // Create income record
          const incomeRef = doc(collection(db, 'transactions'));
          batch.set(incomeRef, {
              type: 'income',
              amount: amountToPayFromCredit,
              date: new Date(formData.date),
              category: formData.category,
              description: `In-credit payment for: ${formData.description}`,
              paymentStatus: 'paid',
              status: 'completed',
              paymentMethod: 'in-credit',
              customerId: customer.id,
              customerName: customer.fullName,
              createdAt: new Date(),
              createdBy: user.name || user.email || '',
          });

          // Create payment record for the outstanding transaction
          paymentForOutstanding = {
              amount: amountToPayFromCredit,
              date: new Date(),
              method: 'in-credit',
              reference: 'Automatic deduction from credit balance',
              createdBy: user.name || user.email || 'System'
          };

          // Update source in-credit transactions
          let creditToDeduct = amountToPayFromCredit;
          for (const docSnap of inCreditSnap.docs) {
              if (creditToDeduct <= 0) break;
              const inCreditTx = docSnap.data() as Transaction;
              const available = inCreditTx.remainingAmount || inCreditTx.amount;
              const deduction = Math.min(creditToDeduct, available);
              const inCreditTxRef = doc(db, 'transactions', docSnap.id);
              
              batch.update(inCreditTxRef, {
                  remainingAmount: available - deduction,
                  paidAmount: (inCreditTx.paidAmount || 0) + deduction,
                  paymentStatus: (available - deduction) <= 0 ? 'paid' : 'partially_paid'
              });
              creditToDeduct -= deduction;
          }
        }

        // 3. Create the outstanding transaction
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, {
          type: 'outstanding' as const,
          date: new Date(formData.date),
          amount: chargeAmount, // Original full amount
          paidAmount: amountToPayFromCredit,
          remainingAmount: remainingChargeAmount,
          paymentStatus: remainingChargeAmount <= 0 ? 'paid' : 'partially_paid',
          category: formData.category,
          description: formData.description,
          status: 'completed' as const,
          customerId: customer.id,
          customerName: customer.fullName,
          createdAt: new Date(),
          createdBy: user.name || user.email || '',
          ...(paymentForOutstanding && { payments: [paymentForOutstanding] })
        });
      }

      await batch.commit();
      toast.dismiss();
      toast.success(`Successfully processed ${finalCustomersToCharge.length} charges.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.dismiss();
      toast.error(`Failed to save transactions: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      {/* Charge Type Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Charge Target</label>
        <div className="flex space-x-4 rounded-md bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setChargeType('all'); setSelectedCustomerIds([]); }}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium ${
              chargeType === 'all' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            All Active Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setChargeType('selected')}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium ${
              chargeType === 'selected' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            Select Customers
          </button>
        </div>
      </div>
      
      {/* Customer Selection */}
      {chargeType === 'selected' && (
        <SearchableSelect
          label="Select Customers"
          options={customerOptions}
          value={selectedCustomerIds}
          onChange={setSelectedCustomerIds}
          placeholder="Search and select customers by name or badge number..."
          isMulti
        />
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField type="date" label="Date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
        <FormField type="number" label="Amount (per customer)" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} min="0.01" step="0.01" required />
      </div>

      <SearchableSelect
        label="Category"
        options={financeCategories.map(name => ({ id: name, label: name }))}
        value={formData.category}
        onChange={value => setFormData({ ...formData, category: value as string })}
        placeholder="Search or select a category…"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Monthly Service Fee"
          required
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-5 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || customersToCharge.length === 0}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : `Create ${customersToCharge.length} Charges`}
        </button>
      </div>
    </form>
  );
};

export default BulkChargeForm;