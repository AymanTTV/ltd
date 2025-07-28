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

interface InvoicesProps {
  filterByBadge?: string;
  memberMode?: boolean;
}

const Invoices: React.FC<InvoicesProps> = ({ filterByBadge, memberMode = false }) => {
  // ── Data Hooks ──
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { users, loading: usersLoading } = useUsers();
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  const { user } = useAuth();

  // ── Category Management ──
  const [categories, setCategories] = useState<string[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const fetchCategories = useCallback(() => {
    financeCategoryService.getAll()
      .then(docs => setCategories(docs.map(c => c.name).sort()))
      .catch(() => toast.error('Failed to load categories'));
  }, []);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Filters ──
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    dateRange, setDateRange,
    filteredInvoices,
  } = useInvoiceFilters(invoices);

  // ── Summary Totals ── (use filtered if memberMode)
  const sourceInvoices = memberMode
    ? filteredInvoices.filter(inv => {
        const cust = customers.find(c => c.badgeNumber === filterByBadge);
        return cust ? inv.customerId === cust.id : false;
      })
    : filteredInvoices;

  const totalInvoicesAmount = sourceInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaidAmount     = sourceInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOwingAmount    = sourceInvoices.reduce((sum, i) => sum + i.remainingAmount, 0);

  // ── UI State ──
  const [showForm, setShowForm]             = useState(false);
  const [selectedInvoice, setSelectedInvoice]   = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice]     = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice]       = useState<Invoice | null>(null);
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);

  // ── Invoice Approvals ──
  const handleVote = async (
    invoiceId: string,
    decision: 'Approved' | 'Rejected',
    reason: string
  ) => {
    if (!user) return;
    const ref = doc(db, 'invoices', invoiceId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return toast.error('Invoice not found');
    const inv = snap.data() as Invoice;
    const votes = inv.approvals || [];
    if (votes.some(v => v.userId === user.id)) {
      return toast.error('You have already voted');
    }
    const vote: ApprovalVote = {
      userId: user.id,
      userName: user.name,
      decision,
      reason,
      date: new Date(),
    };
    await updateDoc(ref, { approvals: arrayUnion(vote) });
    const all = [...votes, vote];
    const approvedCount = all.filter(v => v.decision === 'Approved').length;
    const rejectedCount = all.filter(v => v.decision === 'Rejected').length;
    let finalStatus: Invoice['approvalStatus'] = 'Pending';
    if (approvedCount > rejectedCount) finalStatus = 'Approved';
    if (rejectedCount > approvedCount) finalStatus = 'Rejected';
    await updateDoc(ref, { approvalStatus: finalStatus });
  };

  // ── Delete Payment ──
  const handleDeletePayment = async (invoice: Invoice, paymentId: string) => {
    try {
      await deleteInvoicePayment(invoice, paymentId);
      toast.success('Payment deleted');
    } catch {
      toast.error('Failed to delete payment');
    }
  };

  // ── Export to Excel ──
  const handleExport = () => {
    const data = sourceInvoices.map(inv => ({
      'Invoice #': `AIE-INV-${inv.id.slice(-8).toUpperCase()}`,
      Date: inv.date.toLocaleDateString(),
      'Due Date': inv.dueDate.toLocaleDateString(),
      Amount: `£${inv.total.toFixed(2)}`,
      'Paid Amount': `£${inv.paidAmount.toFixed(2)}`,
      'Remaining Amount': `£${inv.remainingAmount.toFixed(2)}`,
      'Payment Status': inv.paymentStatus.replace('_',' '),
      'Approval Status': inv.approvalStatus,
      Category: inv.category,
    }));
    exportToExcel(data, 'claims');
    toast.success('Exported to Excel');
  };

  // ── Generate Bulk PDF ──
  const handleGenerateBulkPDF = async () => {
    try {
      const compSnap = await getDoc(doc(db, 'companySettings', 'details'));
      if (!compSnap.exists()) throw new Error();
      const blob = await generateBulkDocuments(
        InvoiceBulkDocument,
        sourceInvoices,
        compSnap.data()
      );
      window.open(URL.createObjectURL(blob), '_blank');
      toast.success('Bulk PDF generated');
    } catch {
      toast.error('Failed to generate bulk PDF');
    }
  };

  // ── Generate Single PDF ──
  const handleGenerateDocument = async (inv: Invoice) => {
    try {
      toast.loading('Generating PDF…');
      const company = await getCompanyDetails();
      if (!company) throw new Error('Company details missing');
      await generateAndUploadDocument(
        InvoiceDocument,
        inv,
        'invoices',
        inv.id,
        'invoices',
        company
      );
      toast.dismiss();
      toast.success('PDF generated');
    } catch {
      toast.dismiss();
      toast.error('PDF generation failed');
    }
  };

  // ── View PDF ──
  const handleViewDocument = (inv: Invoice) => {
    if (inv.documentUrl) window.open(inv.documentUrl, '_blank');
    else toast.error('No document available');
  };

  // ── Loading States ──
  if (customersLoading || invoicesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Member Filtering ──
  const memberCustomers = filterByBadge
    ? customers.filter(c => c.badgeNumber === filterByBadge)
    : customers;

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Claims</h1>
        <div className="flex space-x-2">
          {/* Manager Bulk PDF & Export & Manage Categories */}
          {!memberMode && user?.role === 'manager' && (
            <>
              <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50">
                <FileText className="h-5 w-5 mr-2" /> Generate PDF
              </button>
              <button onClick={handleExport} className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50">
                <Download className="h-5 w-5 mr-2" /> Export
              </button>
              <button onClick={() => setShowManageCategories(true)} className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50">
                Manage Categories
              </button>
            </>
          )}
          {/* Create Claim */}
          {!memberMode && can('finance','create') && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-600">
              <Plus className="h-5 w-5 mr-2" /> Create Claim
            </button>
          )}
          {/* Member Export */}
          {memberMode && (
            <button onClick={handleExport} className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50">
              <Download className="h-5 w-5 mr-2" /> Export
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards (admin only) */}
      {!memberMode && can('finance','cards') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-primary mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Claims</h4>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalInvoicesAmount)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-green-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Paid</h4>
            </div>
            <p className="mt-2 text-2xl font-semibold text-green-600">{formatCurrency(totalPaidAmount)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <PoundSterling className="h-6 w-6 text-amber-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-600">Total Owing</h4>
            </div>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{formatCurrency(totalOwingAmount)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
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

      {/* Invoice Table */}
      <InvoiceTable
        invoices={sourceInvoices}
        customers={customers}
        users={users}
        onView={inv => setSelectedInvoice(inv)}
        onGenerateDocument={memberMode ? undefined : handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onApprove={memberMode ? undefined : inv => setApprovingInvoice(inv)}
        onEdit={memberMode ? undefined : inv => setEditingInvoice(inv)}
        onDelete={memberMode ? undefined : inv => setDeletingInvoiceId(inv.id)}
        onRecordPayment={memberMode ? undefined : inv => setPayingInvoice(inv)}
        onDeletePayment={memberMode ? undefined : handleDeletePayment}
      />

      {/* Create Claim Modal */}
      {!memberMode && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Claim" size="xl">
          <InvoiceForm customers={customers} onClose={() => setShowForm(false)} />
        </Modal>
      )}

      {/* Claim Details Modal */}
      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Claim Details" size="xl">
        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            customer={customers.find(c => c.id === selectedInvoice.customerId)!}
            users={users}
            onDownload={() => handleViewDocument(selectedInvoice)}
          />
        )}
      </Modal>

      {/* Edit Claim Modal */}
      {!memberMode && (
        <Modal isOpen={!!editingInvoice} onClose={() => setEditingInvoice(null)} title="Edit Claim" size="xl">
          {editingInvoice && (
            <InvoiceEditModal invoice={editingInvoice} customers={customers} onClose={() => setEditingInvoice(null)} />
          )}
        </Modal>
      )}

      {/* Delete Claim Modal */}
      {!memberMode && (
        <Modal isOpen={!!deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} title="Delete Claim">
          {deletingInvoiceId && (
            <InvoiceDeleteModal invoiceId={deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} />
          )}
        </Modal>
      )}

      {/* Record Payment Modal */}
      {!memberMode && (
        <Modal isOpen={!!payingInvoice} onClose={() => setPayingInvoice(null)} title="Record Payment" size="xl">
          {payingInvoice && (
            <InvoicePaymentModal invoice={payingInvoice} customers={customers} onClose={() => setPayingInvoice(null)} />
          )}
        </Modal>
      )}

      {/* Approve/Reject Modal */}
      {!memberMode && (
        <Modal isOpen={!!approvingInvoice} onClose={() => setApprovingInvoice(null)} title="Approve/Reject Claim">
          {approvingInvoice && (
            <ClaimApprovalModal invoice={approvingInvoice} onClose={() => setApprovingInvoice(null)} onVote={handleVote} />
          )}
        </Modal>
      )}

      {/* Manage Categories Modal */}
      {!memberMode && (
        <Modal isOpen={showManageCategories} onClose={() => setShowManageCategories(false)} title="Manage Claim Categories" size="lg">
          <ManageCategoriesModal
            onClose={() => { setShowManageCategories(false); fetchCategories(); }}
          />
        </Modal>
      )}
    </div>
  );
};

export default Invoices;
