// src/components/finance/InvoiceForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Customer } from '../../types/customer';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { InvoiceLineItem, Invoice } from '../../types/finance';
import { v4 as uuidv4 } from 'uuid';
import productService from '../../services/product.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import financeCategoryService from '../../services/financeCategory.service';
import { Upload, File as FileIcon, X } from 'lucide-react';

interface InvoiceFormProps {
  customers: Customer[];
  onClose: () => void;
}

interface ProductSuggestion {
  name: string;
  price: number;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ customers, onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false },
  ]);

  // State for multi-file uploads
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    customCategory: '',
    useCustomCustomer: false,
    customerId: '',
    customerName: '',
    customerPhone: '',
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
      const disc = (item.discount / 100) * gross;
      const netAfter = gross - disc;
      subTotal += netAfter;
      if (item.includeVAT) vatAmount += netAfter * 0.2;
    });
    return { subTotal, vatAmount, total: subTotal + vatAmount };
  };
  const { subTotal, vatAmount, total } = computeTotals();

  const handleLineChange = (idx: number, field: keyof Omit<InvoiceLineItem, 'id'>, value: string | boolean) => {
    setLineItems(items => {
      const copy = [...items];
      const it = { ...copy[idx] };
      if (field === 'includeVAT') it.includeVAT = value as boolean;
      else if (['quantity', 'unitPrice', 'discount'].includes(field)) it[field as 'quantity' | 'unitPrice' | 'discount'] = parseFloat(value as string) || 0;
      else it.description = value as string;
      copy[idx] = it;
      return copy;
    });
  };

  const handleDescriptionChange = (idx: number, value: string) => { handleLineChange(idx, 'description', value); setShowSuggestions(arr => arr.map((_, i) => i === idx)); };
  const handleSuggestionSelect = (prod: ProductSuggestion, idx: number) => { setLineItems(items => { const copy = [...items]; copy[idx] = { ...copy[idx], description: prod.name, unitPrice: prod.price }; return copy; }); setShowSuggestions(arr => arr.map(() => false)); };
  const handleFieldFocus = (idx: number) => { setShowSuggestions(arr => arr.map((_, i) => i === idx)); };
  const handleFieldBlur = () => { setTimeout(() => setShowSuggestions(arr => arr.map(() => false)), 150); };
  const addLineItem = () => setLineItems(prev => [...prev, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }]);
  const removeLineItem = (idx: number) => setLineItems(items => items.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    if (lineItems.every(li => li.quantity * li.unitPrice === 0)) { toast.error('Please add at least one line item with a value.'); setLoading(false); return; }
    
    const selectedCustomer = !formData.useCustomCustomer ? customers.find(c => c.id === formData.customerId) : null;

    const baseClaim: Omit<Invoice, 'id' | 'supportingDocuments'> = {
      date: new Date(formData.date),
      dueDate: new Date(formData.dueDate),
      lineItems,
      subTotal,
      vatAmount,
      total,
      amount: total,
      paidAmount: 0,
      remainingAmount: total,
      paymentStatus: 'pending',
      category: formData.category === 'Other' ? formData.customCategory : formData.category,
      // FIX: Use null instead of undefined for Firestore compatibility
      customCategory: formData.category === 'Other' ? formData.customCategory : null,
      customerId: formData.useCustomCustomer ? null : formData.customerId,
      customerName: formData.useCustomCustomer ? formData.customerName : selectedCustomer?.fullName || null,
      customerPhone: formData.useCustomCustomer ? formData.customerPhone : selectedCustomer?.mobile || null,
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: 'Pending',
      approvals: [],
    };

    try {
      const docRef = await addDoc(collection(db, 'invoices'), baseClaim);
      toast.success('Member Claim created successfully!');

      if (filesToUpload.length > 0) {
        toast.loading(`Uploading ${filesToUpload.length} document(s)...`);
        const uploadPromises = filesToUpload.map(async (file) => {
            const filePath = `invoices/${docRef.id}/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            return { name: file.name, url, path: filePath };
        });
        
        const uploadedDocuments = await Promise.all(uploadPromises);
        
        await updateDoc(doc(db, 'invoices', docRef.id), {
            supportingDocuments: uploadedDocuments
        });
        toast.dismiss();
        toast.success('Documents uploaded.');
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to create Member Claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer and Date Fields */}
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

      {/* Category Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select value={formData.category} onChange={e => setFormData(fd => ({ ...fd, category: e.target.value }))} className="form-select mt-1 w-full" required>
          <option value="">Select Category...</option>
          {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          <option value="Other">Other (Specify)</option>
        </select>
      </div>
      {formData.category === 'Other' && <FormField label="Custom Category Name" value={formData.customCategory} onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))} required />}

      {/* Line Items and Totals */}
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
        <div className="flex justify-between text-sm"><span>Net:</span><span>{formatCurrency(subTotal)}</span></div>
        <div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(vatAmount)}</span></div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total:</span><span>{formatCurrency(total)}</span></div>
      </div>

      {/* Document Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Supporting Documents</label>

        {/* List of files staged for upload */}
        {filesToUpload.length > 0 && (
            <div className="mt-2 space-y-2">
                {filesToUpload.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border border-blue-300 rounded-md bg-blue-50">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFilesToUpload(files => files.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 ml-2"
                            title="Remove file"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* The upload dropzone */}
        <label htmlFor="file-upload" className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-primary">
            <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                    <p className="relative bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                        <span>Upload files</span>
                    </p>
                    <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
            </div>
            <input
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => {
                    if (e.target.files) {
                        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                }}
                className="sr-only"
            />
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400">{loading ? 'Creating…' : 'Create Claim'}</button>
      </div>
    </form>
  );
};

export default InvoiceForm;
