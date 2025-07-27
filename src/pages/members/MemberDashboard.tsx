// src/pages/members/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MemberDashboard: React.FC = () => {
  const [member, setMember] = useState<{ badgeNumber: string; fullName: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('memberSession');
    if (!session) {
      navigate('/members/login');
      return;
    }
    setMember(JSON.parse(session));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('memberSession');
    navigate('/members/login');
  };

  if (!member) return null;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {member.fullName}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/members/profile')}
            className="bg-primary text-white py-2 px-4 rounded hover:bg-primary-600 w-full"
          >
            Profile
          </button>
          <button
            onClick={() => navigate('/members/finance')}
            className="bg-primary text-white py-2 px-4 rounded hover:bg-primary-600 w-full"
          >
            Finance
          </button>
          <button
            onClick={() => navigate('/members/claims')}
            className="bg-primary text-white py-2 px-4 rounded hover:bg-primary-600 w-full"
          >
            Claims
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:underline mt-4"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default MemberDashboard;
