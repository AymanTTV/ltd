// src/pages/Customers.tsx
import React, { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerFilters, STATUSES } from '../hooks/useCustomerFilters';
import CustomerTable from '../components/customers/CustomerTable';
import CustomerFilters from '../components/customers/CustomerFilters';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerDetails from '../components/customers/CustomerDetails';
import Modal from '../components/ui/Modal';
import { Customer } from '../types/customer';
import {
  handleCustomerExport,
  handleCustomerImport
} from '../utils/customerHelpers';
import { Plus, Download, Upload } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  generateAndUploadDocument,
  getCompanyDetails
} from '../utils/documentGenerator';
import { CustomerDocument } from '../components/pdf/documents';

const Customers: React.FC = () => {
  const { customers, loading, refetch } = useCustomers(); // ✅ add refetch
  const { user } = useAuth();
  const { can } = usePermissions();

  const {
    searchQuery,
    setSearchQuery,
    filterExpired,
    setFilterExpired,
    filterSoonExpiring,
    setFilterSoonExpiring,
    ageRange,
    setAgeRange,
    filterLicenseType,
    setFilterLicenseType,
    filterOriginalRegion,
    setFilterOriginalRegion,
    filterStatus,
    setFilterStatus,
    filteredCustomers,
  } = useCustomerFilters(customers);

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const handleDelete = async (c: Customer) => {
    try {
      await deleteDoc(doc(db, 'customers', c.id));
      toast.success('Member deleted successfully');
      setDeletingCustomer(null);
      await refetch(); // optional refresh after delete
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete member');
    }
  };

  const handleGenerateDocument = async (c: Customer) => {
  try {
    const companyDetails = await getCompanyDetails();
    const url = await generateAndUploadDocument(
      CustomerDocument,
      c,
      'customers',
      c.id,
      'customers',
      companyDetails
    );
    toast.success('Document generated successfully');

    if (url) {
      window.open(url, '_blank'); // 👈 auto-open the generated document
    }

    await refetch(); // ✅ refresh to ensure documentUrl appears in table if needed
  } catch (err) {
    console.error(err);
    toast.error('Failed to generate document');
  }
};


  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await handleCustomerImport(file);
      toast.success('Import completed! Refresh to see new members');
    } catch (err) {
      console.error(err);
      toast.error('Import failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <button
              onClick={() => handleCustomerExport(customers)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {can('customers', 'create') && (
            <>
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Import
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={onImport}
                />
              </label>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={filterStatus}
        onStatusChange={setFilterStatus}
        filterLicenseType={filterLicenseType}
        onLicenseTypeChange={setFilterLicenseType}
        filterOriginalRegion={filterOriginalRegion}
        onRegionChange={setFilterOriginalRegion}
        ageRange={ageRange || [0, 0]}
        onAgeRangeFilter={setAgeRange}
        filterExpired={filterExpired}
        onFilterExpired={setFilterExpired}
        filterSoonExpiring={filterSoonExpiring}
        onFilterSoonExpiring={setFilterSoonExpiring}
      />

      {/* Table */}
      <CustomerTable
        customers={filteredCustomers}
        onView={setSelectedCustomer}
        onEdit={setEditingCustomer}
        onDelete={setDeletingCustomer}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Member"
        size="xl"
      >
        <CustomerForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Member Details"
        size="lg"
      >
        {selectedCustomer && <CustomerDetails customer={selectedCustomer} />}
      </Modal>

      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Edit Member"
        size="xl"
      >
        {editingCustomer && (
          <CustomerForm
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        title="Delete Member"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this member? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingCustomer(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingCustomer && handleDelete(deletingCustomer)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
