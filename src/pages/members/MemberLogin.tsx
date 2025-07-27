// src/pages/members/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

const MemberLogin: React.FC = () => {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!badgeNumber || !password) {
      toast.error('Please enter both badge number and password');
      return;
    }

    try {
      const ref = doc(db, 'members', badgeNumber);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        toast.error('Member not found');
        return;
      }

      const member = snap.data();
      if (member.password !== password) {
        toast.error('Incorrect password');
        return;
      }

      // Save to localStorage
      localStorage.setItem('memberSession', JSON.stringify({ badgeNumber, fullName: member.fullName }));
      toast.success('Login successful');
      navigate('/members/dashboard');
    } catch (err) {
      toast.error('Error during login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h2 className="text-2xl font-bold text-center">Member Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Badge Number"
            value={badgeNumber}
            onChange={(e) => setBadgeNumber(e.target.value)}
            className="w-full border px-4 py-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-4 py-2 rounded"
          />
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
          >
            Login
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Not registered?{' '}
          <a href="/members/register" className="text-primary hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
};

export default MemberLogin;
