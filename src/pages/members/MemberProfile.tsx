// src/pages/members/Profile.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

const MemberProfile: React.FC = () => {
  const navigate = useNavigate();
  const session = localStorage.getItem('memberSession');
  const [member, setMember] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!session) {
      navigate('/members/login');
      return;
    }
    const { badgeNumber } = JSON.parse(session);

    const fetchMember = async () => {
      const ref = doc(db, 'members', badgeNumber);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setMember(data);
        setForm({
          fullName: data.fullName || '',
          nickname: data.nickname || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          dob: data.dateOfBirth || '',
        });
      }
    };

    fetchMember();
  }, [navigate, session]);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for update');
      return;
    }

    const { badgeNumber } = JSON.parse(session!);

    try {
      await updateDoc(doc(db, 'members', badgeNumber), {
        pendingUpdates: { ...form, reason },
        pendingApproval: true,
      });
      toast.success('Update request submitted for approval');
    } catch (err) {
      toast.error('Error submitting update');
    }
  };

  if (!member) return null;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-bold">Edit Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Nickname"
            value={form.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="date"
            placeholder="Date of Birth"
            value={form.dob}
            onChange={(e) => handleChange('dob', e.target.value)}
            className="border px-4 py-2 rounded"
          />
        </div>

        <textarea
          placeholder="Reason for update"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border px-4 py-2 rounded min-h-[80px]"
        />

        <button
          onClick={handleSubmit}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-600"
        >
          Submit for Approval
        </button>
      </div>
    </div>
  );
};

export default MemberProfile;
