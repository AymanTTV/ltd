// src/pages/members/Register.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { createMemberAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleLookup = async () => {
    try {
      const ref = doc(db, 'members', badgeNumber);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error('No member with this badge number');
        return;
      }
      setMemberData({ ...snap.data(), id: snap.id });
    } catch (err) {
      toast.error('Error looking up badge number');
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await updateDoc(doc(db, 'members', badgeNumber), {
        accountCreated: true,
        password,
      });

      await createMemberAuth(badgeNumber, password);
      toast.success('Registration successful');
      navigate('/members/dashboard');
    } catch (err) {
      toast.error('Error during registration');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h2 className="text-xl font-bold text-center">Member Registration</h2>

        {!memberData ? (
          <>
            <input
              type="text"
              placeholder="Enter Badge Number"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
            <button
              onClick={handleLookup}
              className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
            >
              Find My Info
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={memberData.fullName || ''}
              disabled
              className="w-full bg-gray-100 px-4 py-2 rounded"
            />
            <input
              type="email"
              value={memberData.email || ''}
              disabled
              className="w-full bg-gray-100 px-4 py-2 rounded"
            />
            <input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
            <button
              onClick={handleRegister}
              className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
            >
              Register
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
