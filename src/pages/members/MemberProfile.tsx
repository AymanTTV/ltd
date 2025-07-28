// src/pages/members/MemberProfile.tsx
import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SignaturePad from '../../components/ui/SignaturePad';

interface MemberSession {
  badgeNumber: number | string;
  customerId: string;
  email: string;
  fullName: string;
}

const MemberProfile: React.FC = () => {
  const navigate = useNavigate();

  // 1) Read the session exactly once:
  const [session] = useState<MemberSession | null>(() => {
    const s = localStorage.getItem('memberSession');
    return s ? JSON.parse(s) : null;
  });

  const [member, setMember] = useState<any>(null);
  const [form, setForm] = useState({
    fullName: '',
    nickname: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
  });
  const [reason, setReason] = useState('');
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [signature, setSignature]       = useState<string>('');

  // 2) Fetch the “live” profile only once on mount:
  useEffect(() => {
    if (!session) {
      toast.error('Please log in first');
      navigate('/members/login');
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'customers', session.customerId));
        if (!snap.exists()) {
          toast.error('Profile not found');
          return navigate('/members/dashboard');
        }
        const data = snap.data() as any;
        setMember(data);
        setForm({
          fullName: data.fullName,
          nickname: data.nickname || '',
          phone:    data.mobile   || '',
          email:    data.email    || '',
          address:  data.address  || '',
          dob:      data.dateOfBirth
                      ? data.dateOfBirth.toDate().toISOString().slice(0,10)
                      : '',
        });
        setPhotoPreview(data.photoUrl);
        setSignature(data.signature || '');
      } catch (err) {
        console.error(err);
        toast.error('Error loading profile');
      }
    })();
  }, [navigate /* no session here */]);

  // helper to upload a file and get its URL
  const uploadIf = async (file: File, path: string) => {
    const snap = await uploadBytes(ref(storage, path), file);
    return getDownloadURL(snap.ref);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return toast.error('Please provide a reason for update');
    }
    if (!session) {
      toast.error('Session expired');
      return navigate('/members/login');
    }

    // build pendingUpdates only
    const pending: any = {
      fullName:     form.fullName,
      nickname:     form.nickname || null,
      mobile:       form.phone,
      email:        form.email,
      address:      form.address,
      dateOfBirth:  form.dob ? new Date(form.dob) : null,
      signature,
      reason,
    };

    // if they picked a new photo, stick the URL in pendingUpdates too
    if (photoFile) {
      pending.photoUrl = await uploadIf(
        photoFile,
        `customers/${session.customerId}/pending-photo-${Date.now()}`
      );
    }

    try {
      await updateDoc(
        doc(db, 'customers', session.customerId),
        {
          pendingUpdates:   pending,
          pendingApproval:  true,
        }
      );
      toast.success('Your changes have been submitted for approval');
      navigate('/members/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Error submitting update');
    }
  };

  if (!member) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Link to="/members/dashboard" className="text-primary hover:underline">
            ← Back
          </Link>
          <h2 className="text-xl font-bold">Edit Profile</h2>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Photo</label>
          <div className="mt-1 flex items-center space-x-4">
            {photoPreview
              ? <img src={photoPreview} className="h-16 w-16 rounded-full object-cover" />
              : <div className="h-16 w-16 rounded-full bg-gray-200" />}
            <label className="px-4 py-2 bg-white border rounded cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setPhotoFile(f);
                  const reader = new FileReader();
                  reader.onload = () => setPhotoPreview(reader.result as string);
                  reader.readAsDataURL(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['fullName','nickname','phone','email','address','dob'] as const).map(field => (
            <div key={field} className={field==='address'?'md:col-span-2':''}>
              <label className="block text-sm font-medium text-gray-700">
                {field==='dob' ? 'Date of Birth' : field.replace(/([A-Z])/g,' $1').trim()}
              </label>
              {field==='address' ? (
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="form-textarea w-full"
                />
              ) : (
                <input
                  type={field==='dob'?'date':'text'}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="form-input w-full"
                />
              )}
            </div>
          ))}
        </div>

        {/* Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Signature</label>
          <SignaturePad value={signature} onChange={setSignature} className="border" />
        </div>

        {/* Reason & Submit */}
        <textarea
          placeholder="Reason for update"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full border px-4 py-2 rounded min-h-[80px]"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
        >
          Submit for Approval
        </button>
      </div>
    </div>
  );
};

export default MemberProfile;
