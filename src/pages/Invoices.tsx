// src/pages/Invoices.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import { useUsers } from '../hooks/useUsers';
import InvoiceTable from '../components/finance/InvoiceTable';
import InvoiceForm from '../components/finance/InvoiceForm';
import InvoiceDetails from '../components/finance/InvoiceDetails';
import InvoiceEditModal from '../components/finance/InvoiceEditModal';
import InvoiceDeleteModal from '../components/finance/InvoiceDeleteModal';
import InvoicePaymentModal from '../components/finance/InvoicePaymentModal';
import InvoiceFilters from '../components/finance/InvoiceFilters';
import ManageCategoriesModal from '../components/finance/ManageCategoriesModal';
import ClaimApprovalModal from '../components/finance/ClaimApprovalModal';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText, PoundSterling } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { Invoice, ApprovalVote } from '../types/finance';
import { deleteInvoicePayment } from '../utils/invoiceUtils';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import {
  generateBulkDocuments,
  generateAndUploadDocument,
  getCompanyDetails,
} from '../utils/documentGenerator';
import { InvoiceBulkDocument, InvoiceDocument } from '../components/pdf/documents';
import { useFormattedDisplay } from '../hooks/useFormattedDisplay';
import financeCategoryService from '../services/financeCategory.service';

const Invoices: React.FC = () => {
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { users, loading: usersLoading } = useUsers();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [categories, setCategories] = useState<string[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);

  // Corrected category fetching logic
  const fetchCategories = useCallback(() => {
    financeCategoryService.getAll()
      .then(docs => {
        const cats = docs.map(c => c.name).sort();
        setCategories(cats);
      })
      .catch(() => {
        toast.error('Failed to load categories');
      });
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDeletePayment = async (invoice: Invoice, paymentId: string) => {
    try {
      await deleteInvoicePayment(invoice, paymentId);
      toast.success('Payment deleted successfully');
    } catch (err) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to delete payment');
    }
  };

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices,
  } = useInvoiceFilters(invoices);

  const totalInvoicesAmount = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaidAmount = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOwingAmount = invoices.reduce((sum, i) => sum + i.remainingAmount, 0);

  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);

  const handleVote = async (invoiceId: string, decision: 'Approved' | 'Rejected', reason: string) => {
    if (!user) return;

    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    if (!invoiceDoc.exists()) {
      throw new Error("Invoice not found");
    }

    const currentInvoice = invoiceDoc.data() as Invoice;
    const existingVotes = currentInvoice.approvals || [];

    if (existingVotes.some(vote => vote.userId === user.id)) {
      toast.error("You have already voted on this claim.");
      return;
    }

    const newVote: ApprovalVote = {
      userId: user.id,
      userName: user.name,
      decision,
      reason,
      date: new Date(),
    };

    await updateDoc(invoiceRef, {
      approvals: arrayUnion(newVote)
    });

    const updatedVotes = [...existingVotes, newVote];
    const approvalCount = updatedVotes.filter(v => v.decision === 'Approved').length;
    const rejectionCount = updatedVotes.filter(v => v.decision === 'Rejected').length;

    let finalStatus: Invoice['approvalStatus'] = 'Pending';
    if (approvalCount > rejectionCount) finalStatus = 'Approved';
    if (rejectionCount > approvalCount) finalStatus = 'Rejected';

    await updateDoc(invoiceRef, {
      approvalStatus: finalStatus,
    });
  };

  const handleExport = () => {
    const exportData = invoices.map((inv) => ({
      'Invoice Number': `AIE-INV-${inv.id.slice(-8).toUpperCase()}`,
      'Date': inv.date.toLocaleDateString(),
      'Due Date': inv.dueDate.toLocaleDateString(),
      'Amount': `£${inv.total.toFixed(2)}`,
      'Amount Paid': `£${inv.paidAmount.toFixed(2)}`,
      'Remaining Amount': `£${inv.remainingAmount.toFixed(2)}`,
      'Payment Status': inv.paymentStatus.replace('_', ' '),
      'Approval Status': inv.approvalStatus,
      'Category': inv.category,
    }));
    exportToExcel(exportData, 'invoices');
    toast.success('Claims exported successfully');
  };

  const handleGenerateDocument = async (inv: Invoice) => {
    try {
      toast.loading('Generating claim PDF…');
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const isOverdue = inv.paymentStatus !== 'paid' && new Date() > inv.dueDate;
      const invoiceForPdf = {
        ...inv,
        paymentStatus: isOverdue ? 'overdue' : inv.paymentStatus,
      };

      await generateAndUploadDocument(
        InvoiceDocument,
        invoiceForPdf,
        'invoices',
        inv.id,
        'invoices',
        companyDetails
      );
      toast.dismiss();
      toast.success('Claim PDF generated');
    } catch (err) {
      console.error('Error generating claim PDF:', err);
      toast.dismiss();
      toast.error('Failed to generate claim PDF');
    }
  };

  const handleViewDocument = (inv: Invoice) => {
    if (inv.documentUrl) {
      window.open(inv.documentUrl, '_blank');
    } else {
      toast.error('No PDF available yet');
    }
  };

  const handleGenerateBulkPDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error('Company details not found');
      const blob = await generateBulkDocuments(
        InvoiceBulkDocument,
        filteredInvoices,
        companyDoc.data()
      );
      window.open(URL.createObjectURL(blob), '_blank');
      toast.success('Claim summary PDF generated');
    } catch (err) {
      console.error('Error generating bulk PDF:', err);
      toast.error('Failed to generate bulk PDF');
    }
  };

  if (customersLoading || invoicesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <>
              <button
                onClick={handleGenerateBulkPDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 mr-2" />
                Generate PDF
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
              <button
                onClick={() => setShowManageCategories(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Categories
              </button>
            </>
          )}
          {can('finance', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Claim
            </button>
          )}
        </div>
      </div>

      {can('finance', 'cards') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-primary mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Claims</h4>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(totalInvoicesAmount)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-green-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Paid</h4>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalPaidAmount)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-amber-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Outstanding</h4>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {formatCurrency(totalOwingAmount)}
            </p>
          </div>
        </div>
      )}

      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        categories={categories}
      />

      <InvoiceTable
        invoices={filteredInvoices}
        customers={customers}
        users={users}
        onView={setSelectedInvoice}
        onEdit={setEditingInvoice}
        onDelete={(inv) => setDeletingInvoiceId(inv.id)}
        onRecordPayment={setPayingInvoice}
        onDeletePayment={handleDeletePayment}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onApprove={(inv) => setApprovingInvoice(inv)}
      />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Claim" size="xl">
        <InvoiceForm customers={customers} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Claim Details"
        size="xl"
      >
        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            customer={customers.find((c) => c.id === selectedInvoice.customerId)}
            users={users}
            onDownload={() => handleViewDocument(selectedInvoice)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title="Edit Claim"
        size="xl"
      >
        {editingInvoice && (
          <InvoiceEditModal
            invoice={editingInvoice}
            customers={customers}
            onClose={() => setEditingInvoice(null)}
          />
        )}
      </Modal>

      <Modal isOpen={!!deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} title="Delete Claim">
        {deletingInvoiceId && (
          <InvoiceDeleteModal invoiceId={deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} />
        )}
      </Modal>

      <Modal
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title="Record Payment"
        size="xl"
      >
        {payingInvoice && (
          <InvoicePaymentModal
            invoice={payingInvoice}
            customers={customers}
            onClose={() => setPayingInvoice(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!approvingInvoice}
        onClose={() => setApprovingInvoice(null)}
        title="Approve/Reject Claim"
      >
        {approvingInvoice && (
          <ClaimApprovalModal
            invoice={approvingInvoice}
            onClose={() => setApprovingInvoice(null)}
            onVote={handleVote}
          />
        )}
      </Modal>

      <Modal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        title="Manage Claim Categories"
        size="lg"
      >
        <ManageCategoriesModal
          onClose={() => {
            setShowManageCategories(false);
            fetchCategories();
          }}
        />
      </Modal>
    </div>
  );
};

export default Invoices;