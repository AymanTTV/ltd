// src/components/customers/CustomerForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Customer, Gender, Status } from '../../types/customer';
import { Upload } from 'lucide-react';
import CustomerSignature from './CustomerSignature';
import toast from 'react-hot-toast';

const STATUSES: Status[] = [
  'ACTIVE',
  'SUSPENDED',
  'INEED',
  'DICEASED',
  'COMMITTEE',
  'UNDER REVIEW',
  'AWAY',
  'KOL',
];


// new originalRegion options
const REGIONS: Customer['originalRegion'][] = [
  'NORTH LONDON',
  'NORTH WEST',
  'EAST LONDON',
  'SOUTH EAST',
  'SOUTH WEST',
  'WEST LONDON',
  'CENTRAL',
  'UNKNOWN',
];

interface Props {
  customer?: Customer;
  onClose: () => void;
}

export default function CustomerForm({ customer, onClose }: Props) {
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    gender: 'male' as Gender,
    mobile: '',
    email: '',
    address: '',
    dateOfBirth: '',
    badgeNumber: '',
    billExpiry: '',
    licenseType: 'Green' as Customer['licenseType'],
    originalRegion: 'UNKNOWN' as Customer['originalRegion'],
    status: 'ACTIVE' as Status,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [signatureData, setSignatureData] = useState<string>('');
  const [docs, setDocs] = useState<{
    licenseFront: File | null;
    licenseBack: File | null;
    billDocument: File | null;
  }>({ licenseFront: null, licenseBack: null, billDocument: null });
  const [previews, setPreviews] = useState<{
    licenseFront?: string;
    licenseBack?: string;
    billDocument?: string;
  }>({});

  useEffect(() => {
    if (!customer) return;
    setFormData({
      fullName: customer.fullName,
      nickname: customer.nickname || '',
      gender: customer.gender,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      dateOfBirth: customer.dateOfBirth.toISOString().slice(0, 10),
      badgeNumber: customer.badgeNumber || '',
      billExpiry: customer.billExpiry?.toISOString().slice(0, 10) || '',
      licenseType: customer.licenseType,
      originalRegion: customer.originalRegion,
      status: customer.status ?? 'ACTIVE',
    });
    setPhotoPreview(customer.photoUrl);
    setSignatureData(customer.signature || '');
    setPreviews({
      licenseFront: customer.licenseFrontUrl,
      licenseBack: customer.licenseBackUrl,
      billDocument: customer.billDocumentUrl,
    });
  }, [customer]);

  const handleFile = (key: keyof typeof docs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocs(prev => ({ ...prev, [key]: f }));
    const reader = new FileReader();
    reader.onload = () => setPreviews(prev => ({ ...prev, [key]: reader.result as string }));
    reader.readAsDataURL(f);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const uploadIf = async (file: File | null, path: string) => {
    if (!file) return null;
    const snap = await uploadBytes(ref(storage, path), file);
    return getDownloadURL(snap.ref);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // photo
      const photoUrl = photoFile
        ? await uploadIf(photoFile, `customers/${Date.now()}/photo`)
        : customer?.photoUrl ?? null;
      // docs
      const frontUrl = docs.licenseFront
        ? await uploadIf(docs.licenseFront, `customers/${Date.now()}/front`)
        : customer?.licenseFrontUrl ?? null;
      const backUrl = docs.licenseBack
        ? await uploadIf(docs.licenseBack, `customers/${Date.now()}/back`)
        : customer?.licenseBackUrl ?? null;
      const billUrl = docs.billDocument
        ? await uploadIf(docs.billDocument, `customers/${Date.now()}/bill`)
        : customer?.billDocumentUrl ?? null;

      // payload
      const payload: any = {
        fullName: formData.fullName,
        nickname: formData.nickname || null,
        gender: formData.gender,
        mobile: formData.mobile,
        email: formData.email,
        address: formData.address,
        dateOfBirth: new Date(formData.dateOfBirth),
        badgeNumber: formData.badgeNumber || null,
        billExpiry: formData.billExpiry ? new Date(formData.billExpiry) : null,
        licenseType: formData.licenseType,
        originalRegion: formData.originalRegion,
        status: formData.status,
        signature: signatureData || null,
        updatedAt: new Date(),
        createdAt: customer?.createdAt || new Date(),
      };
      if (photoUrl) payload.photoUrl = photoUrl;
      if (frontUrl) payload.licenseFrontUrl = frontUrl;
      if (backUrl) payload.licenseBackUrl = backUrl;
      if (billUrl) payload.billDocumentUrl = billUrl;

      if (customer) {
        await updateDoc(doc(db, 'customers', customer.id), payload);
        toast.success('Member updated');
      } else {
        await addDoc(collection(db, 'customers'), payload);
        toast.success('Member added');
      }
      onClose();
    } catch (err) {
      console.error('Save failed', err);
      toast.error('Save failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="form-label">Full Name *</label>
          <input
            className="form-input"
            value={formData.fullName}
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        </div>
        {/* Nickname */}
        <div>
          <label className="form-label">Nickname</label>
          <input
            className="form-input"
            value={formData.nickname}
            onChange={e => setFormData({ ...formData, nickname: e.target.value })}
          />
        </div>
        {/* Gender */}
        <div>
          <label className="form-label">Gender *</label>
          <select
            className="form-select"
            value={formData.gender}
            onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        {/* Mobile */}
        <div>
          <label className="form-label">Mobile *</label>
          <input
            className="form-input"
            value={formData.mobile}
            onChange={e => setFormData({ ...formData, mobile: e.target.value })}
            required
          />
        </div>
        {/* Email */}
        <div>
          <label className="form-label">Email </label>
          <input
            className="form-input"
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            
          />
        </div>
        {/* Date of Birth */}
        <div>
          <label className="form-label">Date of Birth </label>
          <input
            className="form-input"
            type="date"
            value={formData.dateOfBirth}
            onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
            
          />
        </div>
        {/* Joined Date */}
        <div>
          <label className="form-label">Joined Date *</label>
          <input
            className="form-input"
            type="date"
            value={formData.dateOfBirth}
            onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
            required
          />
        </div>
        {/* License Type */}
        <div>
          <label className="form-label">License Type *</label>
          <select
            className="form-select"
            value={formData.licenseType}
            onChange={e => setFormData({ ...formData, licenseType: e.target.value as any })}
            required
          >
            <option value="Green">Green</option>
            <option value="Yellow">Yellow</option>
          </select>
        </div>
       {/* Original Region */}
        <div>
          <label className="form-label">Original Region *</label>
          <select
            className="form-select"
            value={formData.originalRegion}
            onChange={e => setFormData({ ...formData, originalRegion: e.target.value as any })}
            required
          >
            {REGIONS.map(region => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        {/* Badge Number */}
        <div>
          <label className="form-label">Badge Number</label>
          <input
            className="form-input"
            value={formData.badgeNumber}
            onChange={e => setFormData({ ...formData, badgeNumber: e.target.value })}
          />
        </div>
        {/* Bill Expiry */}
        <div>
          <label className="form-label">Bill Expiry</label>
          <input
            className="form-input"
            type="date"
            value={formData.billExpiry}
            onChange={e => setFormData({ ...formData, billExpiry: e.target.value })}
          />
        </div>
        {/* Status */}
        <div>
          <label className="form-label">Status *</label>
          <select
            className="form-select"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
            required
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* Address */}
        <div className="md:col-span-2">
          <label className="form-label">Address *</label>
          <textarea
            className="form-textarea"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="form-label">Photo Upload</label>
        <div className="flex items-center space-x-4">
          {photoPreview && <img src={photoPreview} className="h-16 w-16 rounded-full" />}
          <label className="btn btn-outline inline-flex items-center">
            <Upload className="mr-2" /> Photo
            <input type="file" accept="image/*" hidden onChange={handlePhoto} />
          </label>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>
        {(['licenseFront','licenseBack','billDocument'] as const).map(key => (
          <div key={key}>
            <label className="form-label">
              {key === 'licenseFront'
                ? 'License Front'
                : key === 'licenseBack'
                ? 'License Back'
                : 'Bill Document'}
            </label>
            <div className="mt-1 flex items-center space-x-4">
              {previews[key] && (
                <img src={previews[key]} className="h-20 w-32 object-cover rounded-md" />
              )}
              <label className="btn btn-outline inline-flex items-center">
                <Upload className="mr-2" /> Upload
                <input
                  type="file"
                  accept="image/*,.pdf"
                  hidden
                  onChange={handleFile(key)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Signature */}
      <CustomerSignature
        value={signatureData}
        onChange={setSignatureData}
      />

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {customer ? 'Update Member' : 'Add Member'}
        </button>
      </div>
    </form>
  );
}
