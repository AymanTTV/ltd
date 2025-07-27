// src/components/company/CompanyDetails.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import CompanyLogo from './CompanyLogo';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';

interface CompanySettings {
  logoUrl?: string;
  fullName: string;
  title: string;
  email: string;
  replyToEmail: string;
  phone: string;
  website: string;
  officialAddress: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatNumber: string;
  registrationNumber: string;
  termsAndConditions: string;
  customerTerms: string;
  privacyPolicy: string;
  dataProtectionPolicy: string;
  disclaimerText: string;
  signature: string;
}

const CompanyDetails: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanySettings>({
    fullName: '',
    title: '',
    email: '',
    replyToEmail: '',
    phone: '',
    website: '',
    officialAddress: '',
    bankName: '',
    sortCode: '',
    accountNumber: '',
    vatNumber: '',
    registrationNumber: '',
    termsAndConditions: '',
    privacyPolicy: '',
    dataProtectionPolicy: '',
    customerTerms: '',
    disclaimerText: '',
    signature: '',
  });

  // for cycling border colors
  const borderColors = ['border-red-500', 'border-green-500', 'border-blue-500'];
  const [colorIndex, setColorIndex] = useState(0);
  useEffect(() => {
    let iv: NodeJS.Timeout;
    if (editing) {
      iv = setInterval(() => {
        setColorIndex(i => (i + 1) % borderColors.length);
      }, 1000);
    }
    return () => clearInterval(iv);
  }, [editing]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const ref = doc(db, 'companySettings', 'details');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          setFormData(data);
          if (data.logoUrl) setImagePreview(data.logoUrl);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load company details');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, 'companySettings', 'details');
      await updateDoc(ref, {
        ...formData,
        updatedAt: new Date(),
        updatedBy: user.id,
      });
      toast.success('Company details updated');
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const getBorderClasses = (highlight: boolean) => {
    const base = 'mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2';
    if (!editing) return `${base} border-gray-200 cursor-not-allowed`;
    return highlight
      ? `${base} ${borderColors[colorIndex]} focus:border-primary focus:ring-primary`
      : `${base} border-gray-300 focus:border-primary focus:ring-primary`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-semibold">Company Details</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </button>
        ) : (
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Logo */}
      <CompanyLogo
        currentLogo={formData.logoUrl}
        onLogoUpdate={url => setFormData({ ...formData, logoUrl: url })}
      />

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Company Name"
          value={formData.fullName}
          onChange={e => setFormData({ ...formData, fullName: e.target.value })}
          disabled={!editing}
          required
        />
        <FormField
          label="Trading Name"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          disabled={!editing}
          required
        />
        <FormField
          label="Email"
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          disabled={!editing}
          required
        />
        <FormField
          label="Reply-to Email"
          type="email"
          value={formData.replyToEmail}
          onChange={e => setFormData({ ...formData, replyToEmail: e.target.value })}
          disabled={!editing}
        />
        <FormField
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
          disabled={!editing}
          required
        />
        <FormField
          label="Website"
          type="url"
          value={formData.website}
          onChange={e => setFormData({ ...formData, website: e.target.value })}
          disabled={!editing}
        />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Official Address</label>
          <textarea
            rows={3}
            className={getBorderClasses(false)}
            value={formData.officialAddress}
            onChange={e => setFormData({ ...formData, officialAddress: e.target.value })}
            disabled={!editing}
            required
          />
        </div>
      </div>

      {/* Bank Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Bank Name"
          value={formData.bankName}
          onChange={e => setFormData({ ...formData, bankName: e.target.value })}
          disabled={!editing}
          required
        />
        <FormField
          label="Sort Code"
          value={formData.sortCode}
          onChange={e => setFormData({ ...formData, sortCode: e.target.value })}
          disabled={!editing}
          required
          placeholder="00-00-00"
        />
        <FormField
          label="Account Number"
          value={formData.accountNumber}
          onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
          disabled={!editing}
          required
          placeholder="12345678"
        />
        <FormField
          label="VAT Number"
          value={formData.vatNumber}
          onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
          disabled={!editing}
          placeholder="GB123456789"
        />
        <FormField
          label="Registration Number"
          value={formData.registrationNumber}
          onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
          disabled={!editing}
        />
      </div>

      {/* Document Terms & Conditions */}
      <div className="space-y-8 p-6 border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-2xl font-semibold text-gray-900 border-b pb-4">
          Document Terms &amp; Conditions
        </h3>

        {/* General Terms */}
        <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
          <label className="block text-lg font-bold text-gray-800 mb-3">
            General Terms &amp; Conditions
          </label>
          <textarea
            rows={12}
            className={getBorderClasses(true)}
            value={formData.termsAndConditions}
            onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
            disabled={!editing}
            placeholder="Enter general terms and conditions..."
          />
        </div>

        {/* Customer Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Customer Documents Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Customer Terms</label>
                <textarea
                  value={formData.customerTerms}
                  onChange={(e) => setFormData({ ...formData, customerTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Customer documents..."
                />
              </div>
            </div>
          </div>

        {/* Additional Terms */}
        <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
          <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">
            Additional Terms
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Privacy Policy
              </label>
              <textarea
                rows={4}
                className={getBorderClasses(true)}
                value={formData.privacyPolicy}
                onChange={e => setFormData({ ...formData, privacyPolicy: e.target.value })}
                disabled={!editing}
                placeholder="Enter privacy policy..."
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Data Protection Policy
              </label>
              <textarea
                rows={4}
                className={getBorderClasses(true)}
                value={formData.dataProtectionPolicy}
                onChange={e => setFormData({ ...formData, dataProtectionPolicy: e.target.value })}
                disabled={!editing}
                placeholder="Enter data protection policy..."
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Disclaimer
              </label>
              <textarea
                rows={4}
                className={getBorderClasses(true)}
                value={formData.disclaimerText}
                onChange={e => setFormData({ ...formData, disclaimerText: e.target.value })}
                disabled={!editing}
                placeholder="Enter disclaimer text..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* E-Signature */}
      <div>
        <h3 className="text-lg font-semibold">Company Signature</h3>
        {editing ? (
          <SignaturePad
            value={formData.signature}
            onChange={sig => setFormData({ ...formData, signature: sig })}
          />
        ) : (
          formData.signature && (
            <img
              src={formData.signature}
              alt="Company Signature"
              className="mt-2 h-24 object-contain"
            />
          )
        )}
      </div>
    </form>
  );
};

export default CompanyDetails;
