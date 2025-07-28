// src/pages/Finance.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { useCustomers } from '../hooks/useCustomers';
import { Account, Transaction, Customer } from '../types';
import FinanceHeader from '../components/finance/FinanceHeader';
import FinanceFilters from '../components/finance/FinanceFilters';
import FinancialSummary from '../components/finance/FinancialSummary';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import BulkChargeForm from '../components/finance/BulkChargeForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal';
import PayOutstandingModal from '../components/finance/PayOutstandingModal';
import ManageGroupsModal from '../components/finance/ManageGroupsModal';
import AssignGroupModal from '../components/finance/AssignGroupModal';
import NotChargedCustomersModal from '../components/finance/NotChargedCustomersModal';
import RefundModal from '../components/finance/RefundModal';
import Modal from '../components/ui/Modal';
import { generateFinancePDF } from '../utils/financePDF';
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';
import financeCategoryService from '../services/financeCategory.service';
import ManageCategoriesModal from '../components/finance/ManageCategoriesModal';

interface FinanceProps {
  filterByBadge?: string;
  memberMode?: boolean;
}

const Finance: React.FC<FinanceProps> = ({ filterByBadge, memberMode = false }) => {
  // --- Data & Context Hooks ---
  const { transactions, loading, error } = useFinances();
  const { customers } = useCustomers();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { can } = usePermissions();
  const { user } = useAuth();

  // --- Finance Groups & Categories ---
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  
const [manageOpen, setManageOpen] = useState(false);
  // --- UI State for Modals & Selection ---
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddInCredit, setShowAddInCredit] = useState(false);
  const [showBulkCharge, setShowBulkCharge] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPayOutstandingModal, setShowPayOutstandingModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [assignTxn, setAssignTxn] = useState<Transaction | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [showNotChargedModal, setShowNotChargedModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);




  
  // Load groups & categories once
  useEffect(() => {
    financeGroupService.getAll().then(setGroups).catch(() => toast.error('Failed to load groups'));
    financeCategoryService
      .getAll()
      .then(docs => setFinanceCategories(docs.map(c => c.name).sort()))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load accounts
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'accounts')),
      snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
      () => toast.error('Failed to load accounts')
    );
    return () => unsub();
  }, []);

  // Finance filters
  const {
    searchQuery, setSearchQuery,
    type, setType,
    category, setCategory,
    groupFilter, setGroupFilter,
    paymentStatus, setPaymentStatus,
    dateRange, setDateRange,
    selectedCustomerId, setSelectedCustomerId,
    filteredTransactions,
    customerInCreditBalances,
    totalOwingFromOwners,
    unchargedCustomers,
  } = useFinanceFilters(transactions, accounts, customers);

  // If filtering by badge, find that member’s customer record
  const memberCustomer = filterByBadge
    ? customers.find(c => c.badgeNumber === filterByBadge)
    : null;

  // Decide which transactions to show
  const visibleTransactions = memberMode && memberCustomer
    ? filteredTransactions.filter(t => t.customerId === memberCustomer.id)
    : filteredTransactions;

  // --- Handlers (all original logic intact) ---

  const handleConvertToInCredit = async (tx: Transaction) => {
    if (!tx.id || tx.type !== 'income' || tx.paymentStatus !== 'paid') {
      toast.error("Only paid income transactions can be converted to in-credit.");
      return;
    }
    toast((t) => (
      <div className="flex flex-col items-center p-2">
        <p className="text-center mb-4">
          Are you sure you want to convert this income transaction to in-credit? This action cannot be undone.
        </p>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                toast.loading("Converting to in-credit...");
                const txRef = doc(db, 'transactions', tx.id!);
                await updateDoc(txRef, {
                  type: 'in-credit',
                  remainingAmount: tx.amount,
                  paidAmount: 0,
                  paymentStatus: 'unpaid',
                  category: 'In-Credit',
                  description: `Converted from income transaction: ${tx.description}`,
                  updatedAt: new Date()
                });
                toast.dismiss();
                toast.success("Transaction converted to in-credit.");
              } catch (err) {
                toast.dismiss();
                toast.error("Failed to convert transaction.");
                console.error(err);
              }
            }}
          >
            Confirm
          </button>
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleGeneratePDF = useCallback(async () => {
    try {
      toast.loading('Generating report…');
      const company = await getCompanyDetails();
      const totalIncome = visibleTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = visibleTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpenses;
      const blob = await generateFinancePDF(
        visibleTransactions,
        customers,
        accounts,
        totalIncome,
        totalExpenses,
        balance,
        0,
        totalOwingFromOwners,
        dateRange.start,
        dateRange.end,
        company!
      );
      saveAs(blob, 'finance_report.pdf');
      toast.dismiss();
      toast.success('PDF ready');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
      console.error(err);
    }
  }, [
    visibleTransactions,
    customers,
    accounts,
    totalOwingFromOwners,
    dateRange,
  ]);

  const handleGenerateDocument = useCallback(async (tx: Transaction) => {
    if (!user) return toast.error('Login required');
    try {
      toast.loading('Generating document…');
      const company = await getCompanyDetails();
      const url = await generateAndUploadDocument(
        FinanceDocument,
        tx,
        'finance',
        tx.id!,
        'transactions',
        company!,
        { customers }
      );
      await updateDoc(doc(db, 'transactions', tx.id!), { documentUrl: url });
      toast.dismiss();
      toast.success('Document generated');
      window.open(url, '_blank');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate document');
      console.error(err);
    }
  }, [user, customers]);

  const handlePrintReceipt = useCallback(async (tx: Transaction) => {
    if (!user) return toast.error('Login required');
    try {
      toast.loading('Generating receipt…');
      const company = await getCompanyDetails();
      const customerForReceipt = customers.find(c => c.id === tx.customerId);
      const url = await generateAndUploadDocument(
        ReceiptDocument,
        tx,
        'finance',
        tx.id!,
        'transactions',
        company!,
        { customer: customerForReceipt }
      );
      await updateDoc(doc(db, 'transactions', tx.id!), { receiptUrl: url });
      toast.dismiss();
      toast.success('Receipt generated');
      window.open(url, '_blank');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate receipt');
      console.error(err);
    }
  }, [user, customers]);

  const handleExport = useCallback(() => {
    try {
      toast.loading("Generating Excel file...");
      const data = visibleTransactions.map(tx => ({
        'Date': tx.date.toLocaleDateString(),
        'Type': tx.type,
        'Category': tx.category,
        'Description': tx.description,
        'Amount': tx.amount,
        'Paid Amount': tx.paidAmount ?? 0,
        'Remaining Amount': tx.remainingAmount ?? tx.amount,
        'Payment Status': tx.paymentStatus,
        'Customer Name': customers.find(c => c.id === tx.customerId)?.fullName || tx.customerName || 'N/A',
        'Payment Method': tx.paymentMethod || 'N/A',
        'Payment Reference': tx.paymentReference || 'N/A',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, 'transactions_export.xlsx');
      toast.dismiss();
      toast.success('Excel export successful!');
    } catch (err) {
      toast.dismiss();
      toast.error('Export failed.');
      console.error(err);
    }
  }, [visibleTransactions, customers]);

  const handleImport = useCallback(async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to import transactions.");
      return;
    }
    toast.loading("Processing imported file...");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          toast.dismiss();
          toast.error("The imported file is empty or in the wrong format.");
          return;
        }

        const batch = writeBatch(db);
        json.forEach((row) => {
          const newTransaction = {
            type: row['Type'] || 'income',
            date: row['Date'] ? new Date(row['Date']) : new Date(),
            amount: parseFloat(row['Amount'] || '0'),
            category: row['Category'] || 'Uncategorized',
            description: row['Description'] || '',
            paymentStatus: row['Payment Status'] || 'paid',
            customerName: row['Customer Name'] || '',
            createdAt: new Date(),
            createdBy: user.name || user.email || 'Import',
          };

          if (newTransaction.amount > 0) {
            const newDocRef = doc(collection(db, "transactions"));
            batch.set(newDocRef, newTransaction);
          }
        });

        await batch.commit();
        toast.dismiss();
        toast.success(`${json.length} transactions imported successfully!`);
      } catch (err) {
        toast.dismiss();
        toast.error("Failed to process the file. Please check the format and try again.");
        console.error(err);
      }
    };
    reader.onerror = () => {
      toast.dismiss();
      toast.error("Failed to read the file.");
    };
    reader.readAsBinaryString(file);
  }, [user]);

  // --- Loading / Error States ---
  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (error)   return <div className="text-red-500 py-8 text-center">{error}</div>;

  // --- Customers & Filter Props for FinanceFilters ---
  const customerOptions = memberMode && memberCustomer ? [memberCustomer] : customers;
  const customerValue   = memberMode && memberCustomer ? memberCustomer.id : selectedCustomerId;
  const onCustomerChange = memberMode ? undefined : setSelectedCustomerId;

  return (
    <div className="space-y-6 p-4">

      {/* Summary */}
      <FinancialSummary transactions={visibleTransactions} />

      {/* Header */}
      <FinanceHeader
        onSearch={setSearchQuery}
        onImport={memberMode ? () => {} : handleImport}
        onExport={handleExport}
        onAddIncome={memberMode ? undefined : () => setShowAddIncome(true)}
        onAddExpense={memberMode ? undefined : () => setShowAddExpense(true)}
        onAddInCredit={memberMode ? undefined : () => setShowAddInCredit(true)}
        onBulkCharge={memberMode ? undefined : () => setShowBulkCharge(true)}
        onGeneratePDF={handleGeneratePDF}
        period="month"
        onPeriodChange={() => {}}
        type={type as any}
        onTypeChange={setType as any}
        onManageGroups={memberMode ? undefined : () => setManageOpen(true)}
        onManageCategories={memberMode ? undefined : () => setShowCategoryModal(true)}
      />

      {/* Filters */}
      <FinanceFilters
        type={type as any}
        onTypeChange={setType as any}
        statusFilter={paymentStatus}
        onStatusFilterChange={setPaymentStatus}
        categoryFilter={category}
        onCategoryFilterChange={setCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customers={customerOptions}
        selectedCustomerId={customerValue}
        onCustomerChange={onCustomerChange}
        categories={financeCategories}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groupOptions={groups.map(g => ({ id: g.id, name: g.name }))}
        onShowUncharged={memberMode ? undefined : () => setShowNotChargedModal(true)}
      />

      {/* Table */}
      <TransactionTable
        transactions={visibleTransactions}
        customers={customers}
        accounts={accounts}
        customerInCreditBalances={customerInCreditBalances}
        onView={tx => { setSelectedTransaction(tx); setShowDetailsModal(true); }}
        onEdit={memberMode ? undefined : tx => { setSelectedTransaction(tx); setShowEditModal(true); }}
        onDelete={memberMode ? undefined : tx => { setSelectedTransaction(tx); setShowDeleteModal(true); }}
        onPayOutstanding={memberMode ? undefined : tx => { setSelectedTransaction(tx); setShowPayOutstandingModal(true); }}
        onConvertToInCredit={memberMode ? undefined : handleConvertToInCredit}
        onGenerateDocument={memberMode ? undefined : handleGenerateDocument}
        onViewDocument={url => window.open(url, '_blank')}
        onPrintReceipt={memberMode ? undefined : handlePrintReceipt}
        onAssign={memberMode ? undefined : tx => { setAssignTxn(tx); setAssignOpen(true); }}
        onRefund={memberMode ? undefined : tx => { setSelectedTransaction(tx); setShowRefundModal(true); }}
        groups={groups.map(g => ({ id: g.id, name: g.name }))}
      />

      {/* Admin-only Modals */}
      {!memberMode && <>
        <Modal isOpen={showAddIncome || showAddExpense} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} title={`Add ${showAddIncome ? 'Income' : 'Expense'}`} size="xl">
          <TransactionForm type={showAddIncome ? 'income' : 'expense'} accounts={accounts} customers={customers} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} />
        </Modal>

        <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} title="Edit Transaction" size="xl">
          {selectedTransaction && (
            <TransactionForm type={selectedTransaction.type as any} transaction={selectedTransaction} accounts={accounts} customers={customers} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} />
          )}
        </Modal>

        <Modal isOpen={showAddInCredit} onClose={() => setShowAddInCredit(false)} title="Add In-Credit to Customer" size="xl">
          <TransactionForm type="in-credit" accounts={accounts} customers={customers} onClose={() => setShowAddInCredit(false)} />
        </Modal>

        {can('finance','create') && (
          <Modal isOpen={showBulkCharge} onClose={() => setShowBulkCharge(false)} title="Bulk Customer Charge" size="xl">
            <BulkChargeForm accounts={accounts} customers={customers.filter(c => c.status==='ACTIVE')} onClose={() => setShowBulkCharge(false)} />
          </Modal>
        )}

        {selectedTransaction && showPayOutstandingModal && (
          <Modal isOpen={showPayOutstandingModal} onClose={() => setShowPayOutstandingModal(false)} title="Pay Outstanding" size="lg">
            <PayOutstandingModal
              transaction={selectedTransaction}
              customerInCreditBalance={customerInCreditBalances[selectedTransaction.customerId||'']||0}
              onClose={() => setShowPayOutstandingModal(false)}
              onSuccess={() => { setShowPayOutstandingModal(false); setSelectedTransaction(null); }}
            />
          </Modal>
        )}

        <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }} title="Transaction Details" size="2xl">
          {selectedTransaction && (
            <TransactionDetails transaction={selectedTransaction} customer={customers.find(c => c.id === selectedTransaction.customerId)} accounts={accounts} />
          )}
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} title="Delete Transaction" size="md">
          {selectedTransaction && (
            <TransactionDeleteModal transactionId={selectedTransaction.id!} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} />
          )}
        </Modal>

        <ManageGroupsModal open={manageOpen} onClose={() => { setManageOpen(false); financeGroupService.getAll().then(setGroups); }} />
        {assignTxn && <AssignGroupModal open={assignOpen} txn={assignTxn} groups={groups} onClose={() => setAssignOpen(false)} onAssigned={() => setAssignOpen(false)} />}
        <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Manage Categories" size="lg">
          <ManageCategoriesModal onClose={() => { setShowCategoryModal(false); financeCategoryService.getAll().then(docs => setFinanceCategories(docs.map(c => c.name).sort())); }} />
        </Modal>

        <Modal isOpen={showNotChargedModal} onClose={() => setShowNotChargedModal(false)} title="Active Customers with No Charges" size="2xl">
          <NotChargedCustomersModal customers={unchargedCustomers} onClose={() => setShowNotChargedModal(false)} />
        </Modal>

        {selectedTransaction && showRefundModal && (
          <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Refund In-Credit" size="lg">
            <RefundModal 
              transaction={selectedTransaction} 
              onClose={() => setShowRefundModal(false)} 
              onSuccess={() => { setShowRefundModal(false); setSelectedTransaction(null); }} 
            />
          </Modal>
        )}
      </>}

    </div>
  );
};

export default Finance;
