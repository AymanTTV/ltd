// src/components/finance/InvoiceEditModal.tsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { InvoiceLineItem, Invoice } from '../../types/finance';
import { Customer } from '../../types/customer';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import productService from '../../services/product.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import financeCategoryService from '../../services/financeCategory.service';
import { File as FileIcon, X, Trash2, Upload } from 'lucide-react';

interface InvoiceEditModalProps {
  invoice: Invoice;
  customers: Customer[];
  onClose: () => void;
}

interface ProductSuggestion {
  name: string;
  price: number;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({ invoice, customers, onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => invoice.lineItems.map(li => ({ ...li, id: li.id || uuidv4() })));

  // State for document management
  const [existingDocuments, setExistingDocuments] = useState(invoice.supportingDocuments || []);
  const [newlyAddedFiles, setNewlyAddedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    date: (invoice.date.toDate ? invoice.date.toDate() : invoice.date).toISOString().slice(0, 10),
    dueDate: (invoice.dueDate.toDate ? invoice.dueDate.toDate() : invoice.dueDate).toISOString().slice(0, 10),
    category: invoice.category,
    customCategory: invoice.customCategory ?? '',
    useCustomCustomer: !!invoice.customerName && !invoice.customerId,
    customerId: invoice.customerId ?? '',
    customerName: invoice.customerName ?? '',
    customerPhone: invoice.customerPhone ?? '',
    isAddingPayment: false,
    amountToPay: invoice.remainingAmount.toFixed(2),
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const fetchedCategories = await financeCategoryService.getAll();
        const categoryNames = fetchedCategories.map(c => c.name).sort((a, b) => a.localeCompare(b));
        setCategories(categoryNames);
      } catch {
        toast.error('Failed to load invoice categories.');
      }
    })();
    (async () => {
      try {
        const prods = await productService.getAll();
        setProductSuggestions(prods.map(p => ({ name: p.name, price: p.price })));
      } catch {
        console.error('Failed to load product suggestions.');
      }
    })();
  }, []);

  useEffect(() => { setShowSuggestions(new Array(lineItems.length).fill(false)); }, [lineItems.length]);
  
  const computeTotals = () => {
    let subTotal = 0, vatAmount = 0;
    lineItems.forEach(item => {
      const gross = item.quantity * item.unitPrice;
      const net = gross - ((item.discount / 100) * gross);
      subTotal += net;
      if (item.includeVAT) vatAmount += net * 0.2;
    });
    return { subTotal, vatAmount, total: subTotal + vatAmount };
  };
  const { subTotal, vatAmount, total } = computeTotals();
  const payNow = formData.isAddingPayment ? parseFloat(formData.amountToPay) || 0 : 0;
  const newRemaining = total - (invoice.paidAmount + payNow);

  const handleLineChange = (idx: number, field: keyof Omit<InvoiceLineItem, 'id'>, value: string | boolean) => {
    setLineItems(li => {
      const copy = [...li];
      const itm = { ...copy[idx] };
      if (typeof value === 'boolean') { itm[field as 'includeVAT'] = value; }
      else if (field === 'description') { itm.description = value; }
      else { itm[field as 'quantity' | 'unitPrice' | 'discount'] = parseFloat(value as string) || 0; }
      copy[idx] = itm;
      return copy;
    });
  };

  const handleDescriptionChange = (idx: number, v: string) => { handleLineChange(idx, 'description', v); setShowSuggestions(s => s.map((_, i) => i === idx)); };
  const handleSuggestionSelect = (prod: ProductSuggestion, idx: number) => { setLineItems(li => { const c = [...li]; c[idx] = { ...c[idx], description: prod.name, unitPrice: prod.price }; return c; }); setShowSuggestions(s => s.map(() => false)); };
  const handleFieldFocus = (idx: number) => setShowSuggestions(s => s.map((_, i) => i === idx));
  const handleFieldBlur = () => setTimeout(() => setShowSuggestions(s => s.map(() => false)), 150);
  const addLineItem = () => setLineItems(li => [...li, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }]);
  const removeLineItem = (idx: number) => setLineItems(li => li.filter((_, i) => i !== idx));

  const handleRemoveExistingDocument = async (docToRemove: { name: string; path: string; }) => {
      if (!window.confirm(`Are you sure you want to permanently delete "${docToRemove.name}"?`)) return;
      
      setLoading(true);
      try {
          const fileRef = ref(storage, docToRemove.path);
          await deleteObject(fileRef);

          await updateDoc(doc(db, 'invoices', invoice.id), {
              supportingDocuments: arrayRemove(existingDocuments.find(d => d.path === docToRemove.path))
          });

          setExistingDocuments(docs => docs.filter(d => d.path !== docToRemove.path));
          toast.success('Document deleted.');
      } catch (error) {
          console.error("Error deleting document:", error);
          toast.error('Failed to delete document.');
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      if (formData.isAddingPayment && payNow > invoice.remainingAmount + 0.01) { toast.error('Payment cannot exceed the remaining amount.'); setLoading(false); return; }

      const totalPaid = invoice.paidAmount + (formData.isAddingPayment ? payNow : 0);
      const newStatus: Invoice['paymentStatus'] = total - totalPaid <= 0.01 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'pending';

      const updatedPayments = [...(invoice.payments || [])];
      if (formData.isAddingPayment && payNow > 0) {
        updatedPayments.push({ id: uuidv4(), date: new Date(), amount: payNow, method: formData.paymentMethod, reference: formData.paymentReference, notes: formData.paymentNotes, createdAt: new Date(), createdBy: user.id, document: null });
      }

      const selectedCustomer = !formData.useCustomCustomer ? customers.find(c => c.id === formData.customerId) : null;

      const updateData: Partial<Omit<Invoice, 'id'>> = {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        lineItems,
        subTotal,
        vatAmount,
        total,
        amount: total,
        paidAmount: totalPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        category: formData.category === 'Other' ? formData.customCategory : formData.category,
        // FIX: Ensure undefined is replaced with null
        customCategory: formData.category === 'Other' ? formData.customCategory : null,
        payments: updatedPayments,
        updatedAt: new Date(),
        customerName: formData.useCustomCustomer ? formData.customerName : selectedCustomer?.fullName || null,
        customerPhone: formData.useCustomCustomer ? formData.customerPhone : selectedCustomer?.mobile || null,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
      };
      
      await updateDoc(doc(db, 'invoices', invoice.id), updateData);
      
      if (newlyAddedFiles.length > 0) {
          toast.loading(`Uploading ${newlyAddedFiles.length} new document(s)...`);
          const uploadPromises = newlyAddedFiles.map(async (file) => {
              const filePath = `invoices/${invoice.id}/${Date.now()}_${file.name}`;
              const fileRef = ref(storage, filePath);
              await uploadBytes(fileRef, file);
              const url = await getDownloadURL(fileRef);
              return { name: file.name, url, path: filePath };
          });
          
          const newDocsData = await Promise.all(uploadPromises);
          await updateDoc(doc(db, 'invoices', invoice.id), {
              supportingDocuments: arrayUnion(...newDocsData)
          });
          toast.dismiss();
          toast.success('New documents added.');
      }
      
      if (formData.isAddingPayment && payNow > 0) {
        await createFinanceTransaction({ type: 'income', category: updateData.category!, amount: payNow, description: `Payment for Claim ${invoice.id}`, date: new Date(), referenceId: invoice.id, customerId: updateData.customerId, customerName: updateData.customerName, paymentMethod: formData.paymentMethod, paymentReference: formData.paymentReference, paymentStatus: 'paid', createdBy: user.id, createdAt: new Date() });
      }
      
      onClose();
      toast.success('Claim updated successfully!');

    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to update claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer, Dates, Category fields */}
      <div className="space-y-4">
        <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.useCustomCustomer} onChange={e => setFormData(fd => ({ ...fd, useCustomCustomer: e.target.checked, customerId: '', customerName: '' }))} className="rounded border-gray-300 text-primary focus:ring-primary" /><span>Enter Customer Manually</span></label>
        {formData.useCustomCustomer ? (
          <><FormField label="Customer Name" value={formData.customerName} onChange={e => setFormData(fd => ({ ...fd, customerName: e.target.value }))} required /><FormField type="tel" label="Phone Number" value={formData.customerPhone} onChange={e => setFormData(fd => ({ ...fd, customerPhone: e.target.value }))} /></>
        ) : (
          <SearchableSelect label="Select Customer" options={customers.map(c => ({ id: c.id, label: c.fullName, subLabel: `${c.mobile} • ${c.email}` }))} value={formData.customerId} onChange={id => { const c = customers.find(x => x.id === id)!; setFormData(fd => ({ ...fd, customerId: id, customerName: c.fullName, customerPhone: c.mobile })); }} placeholder="Search by name, phone, or email..." required />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField type="date" label="Claim Date" value={formData.date} onChange={e => setFormData(fd => ({ ...fd, date: e.target.value }))} required />
        <FormField type="date" label="Due Date" value={formData.dueDate} onChange={e => setFormData(fd => ({ ...fd, dueDate: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select value={formData.category} onChange={e => setFormData(fd => ({ ...fd, category: e.target.value }))} className="form-select mt-1 w-full" required>
          <option value="">Select Category...</option>
          {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          <option value="Other">Other (Specify)</option>
        </select>
      </div>
      {formData.category === 'Other' && <FormField label="Custom Category Name" value={formData.customCategory} onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))} required />}
      
      {/* Line Items and Totals fields */}
      <div>
        <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-medium">Line Items</h3><button type="button" onClick={addLineItem} className="text-sm text-primary hover:text-primary-600 font-semibold">+ Add Line</button></div>
        <div className="space-y-3">{lineItems.map((item, idx) => (
          <div key={item.id} className="relative grid grid-cols-1 sm:grid-cols-6 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50/50">
            <div className="sm:col-span-2">
              <FormField label="Description" value={item.description} onChange={e => handleDescriptionChange(idx, e.target.value)} onFocus={() => handleFieldFocus(idx)} onBlur={handleFieldBlur} required />
              {showSuggestions[idx] && item.description && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">{productSuggestions.filter(p => p.name.toLowerCase().includes(item.description.toLowerCase())).map((prod, i) => (<li key={i} className="px-4 py-2 cursor-pointer hover:bg-gray-100" onMouseDown={() => handleSuggestionSelect(prod, idx)}>{prod.name} <span className="text-gray-500 text-sm">({formatCurrency(prod.price)})</span></li>))}</ul>
              )}
            </div>
            <FormField type="number" label="Qty" value={item.quantity} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} inputClassName="w-full" required min="1" />
            <FormField type="number" label="Unit Price" value={item.unitPrice} onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)} inputClassName="w-full" required step="0.01" min="0" />
            <FormField type="number" label="Discount (%)" value={item.discount} onChange={e => handleLineChange(idx, 'discount', e.target.value)} inputClassName="w-full" step="0.1" min="0" max="100" />
            <div className="flex items-center space-x-4"><label className="flex items-center space-x-2"><input type="checkbox" checked={item.includeVAT} onChange={e => handleLineChange(idx, 'includeVAT', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /><span className="text-sm text-gray-600">+ VAT</span></label><button type="button" onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 font-semibold" title="Remove Line Item">Remove</button></div>
          </div>
        ))}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-lg font-bold"><span>New Total:</span><span>{formatCurrency(total)}</span></div>
        <div className="flex justify-between text-sm"><span>Already Paid:</span><span>{formatCurrency(invoice.paidAmount)}</span></div>
        <div className="flex justify-between text-sm text-blue-600"><span>New Payment:</span><span>{formatCurrency(payNow)}</span></div>
        <div className="flex justify-between text-sm font-semibold"><span>New Balance:</span><span>{formatCurrency(newRemaining)}</span></div>
      </div>

      {/* Payment Section */}
      {invoice.approvalStatus === 'Approved' && invoice.remainingAmount > 0 && (
          <div className="border-t pt-4">
            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.isAddingPayment} onChange={e => setFormData(fd => ({ ...fd, isAddingPayment: e.target.checked, amountToPay: e.target.checked ? invoice.remainingAmount.toFixed(2) : '0' }))} className="rounded border-gray-300 text-primary focus:ring-primary" /><span className="font-semibold text-gray-700">Add a payment to this claim?</span></label>
            {formData.isAddingPayment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField type="number" label="Amount to Pay" value={formData.amountToPay} onChange={e => setFormData(fd => ({ ...fd, amountToPay: e.target.value }))} min="0.01" max={invoice.remainingAmount.toFixed(2)} step="0.01" required />
                <div><label className="block text-sm font-medium text-gray-700">Payment Method</label><select value={formData.paymentMethod} onChange={e => setFormData(fd => ({ ...fd, paymentMethod: e.target.value as any }))} className="form-select mt-1 w-full" required><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option></select></div>
                <FormField label="Payment Reference" value={formData.paymentReference} onChange={e => setFormData(fd => ({ ...fd, paymentReference: e.target.value }))} />
                <div><label className="block text-sm font-medium text-gray-700">Payment Notes</label><textarea rows={2} className="form-input mt-1 w-full" placeholder="Optional notes about the payment" value={formData.paymentNotes} onChange={e => setFormData(fd => ({ ...fd, paymentNotes: e.target.value }))} /></div>
              </div>
            )}
          </div>
      )}

      {/* Document Upload and Management Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Supporting Documents</label>

        {existingDocuments.length > 0 && (
            <div className="mt-2 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500">Current Documents</h4>
                {existingDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 pl-3 border border-gray-300 rounded-md bg-gray-50">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline truncate">
                            <FileIcon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm truncate">{doc.name}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingDocument(doc)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="Delete document permanently"
                          disabled={loading}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        
        {invoice.documentUrl && !invoice.supportingDocuments?.length && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-center p-2 bg-yellow-50 text-yellow-700 rounded-md">
                This claim has a legacy document. To manage it, please re-upload it using the tool below.
            </p>
          </div>
        )}

        {newlyAddedFiles.length > 0 && (
             <div className="mt-4 space-y-2">
                 <h4 className="text-xs font-semibold text-gray-500">New Documents to Add</h4>
                {newlyAddedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border border-blue-300 rounded-md bg-blue-50">
                        <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-gray-500" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNewlyAddedFiles(docs => docs.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                            title="Remove file from upload list"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        
        <label htmlFor="file-upload-edit" className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-primary">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600"><p className="relative bg-white rounded-md font-medium text-primary hover:text-primary-dark"><span>Add more files</span></p><p className="pl-1">or drag and drop</p></div>
            <input id="file-upload-edit" name="file-upload-edit" type="file" accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={e => {
                  if (e.target.files) {
                    setNewlyAddedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
              }}
              className="sr-only" />
          </div>
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400">{loading ? 'Updating…' : 'Update Claim'}</button>
      </div>
    </form>
  );
};

export default InvoiceEditModal;
