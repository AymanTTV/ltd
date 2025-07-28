// src/pages/members/Register.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface MemberSession {
  badgeNumber: number | string;
  customerId: string;
  email: string;
  fullName: string;
}

const Register: React.FC = () => {
  const [badgeNumber, setBadgeNumber]         = useState('');
  const [memberData, setMemberData]           = useState<any>(null);
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleLookup = async () => {
    const raw = badgeNumber.trim();
    if (!raw) {
      toast.error('Please enter your badge number');
      return;
    }
    const badgeNum = parseInt(raw, 10);
    if (isNaN(badgeNum)) {
      toast.error('Badge number must be numeric');
      return;
    }

    try {
      // 1) numeric match
      let snap = await getDocs(
        query(collection(db, 'customers'), where('badgeNumber', '==', badgeNum))
      );
      // 2) fallback to string match
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, 'customers'), where('badgeNumber', '==', raw))
        );
      }

      if (snap.empty) {
        toast.error('No member with this badge number');
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data() as any;
      if (data.status !== 'ACTIVE') {
        toast.error('Member is not active. Please contact the admin.');
        return;
      }

      setMemberData({ id: docSnap.id, ...data });
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Error looking up badge number');
    }
  };

  const handleRegister = async () => {
    if (!memberData) {
      toast.error('Please look up your badge number first');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // 1) Create Auth user (this auto‐signs you in)
      await createUserWithEmailAndPassword(
        auth,
        memberData.email,
        password
      );

      // immediately sign out so the admin AuthContext doesn’t fire its “profile not found” toast
      await signOut(auth);
    } catch (err: any) {
      console.error('Auth creation error:', err);
      if (err.code === 'auth/email-already-in-use') {
        toast('Email already registered—please log in', { icon: 'ℹ️' });
        navigate('/members/login');
      } else {
        toast.error(`Registration failed: ${err.message}`);
      }
      return;
    }

    try {
      // 2) Update Firestore record (now authenticated at the customer level)
      await updateDoc(
        doc(db, 'customers', memberData.id),
        { accountCreated: true }
      );

      // 3) Build and store session for RequireMember
      const session: MemberSession = {
        badgeNumber,
        customerId: memberData.id,
        email: memberData.email,
        fullName: memberData.fullName,
      };
      localStorage.setItem('memberSession', JSON.stringify(session));

      toast.success('Registration successful!');
      navigate('/members/dashboard');
    } catch (err: any) {
      console.error('Firestore update error:', err);
      toast.error(`Error saving profile: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg space-y-6">
        {/* ← Back link */}
        <div>
          <Link
            to="/members/auth"
            className="text-sm text-primary hover:underline"
            onClick={() => setMemberData(null)}
          >
            ← Back to login/register
          </Link>
        </div>

        <h2 className="text-xl font-bold text-center">Member Registration</h2>

        {!memberData ? (
          <>
            <input
              type="text"
              placeholder="Enter Badge Number"
              value={badgeNumber}
              onChange={e => setBadgeNumber(e.target.value)}
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={memberData.fullName}
                disabled
                className="w-full bg-gray-100 px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={memberData.email}
                disabled
                className="w-full bg-gray-100 px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Create Password
              </label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border px-4 py-2 rounded"
              />
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
