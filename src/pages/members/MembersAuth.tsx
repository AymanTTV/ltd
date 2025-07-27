import React from 'react';
import { Link } from 'react-router-dom';

const MembersAuth: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">Member Portal</h2>

        <Link
          to="/members/login"
          className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors"
        >
          Login
        </Link>

        <Link
          to="/members/register"
          className="block w-full text-center border border-primary text-primary py-2 px-4 rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          Register
        </Link>

        <Link
          to="/login"
          className="block w-full text-center text-gray-600 py-2 px-4 rounded-lg hover:underline"
        >
          ← Back to Admin Portal
        </Link>
      </div>
    </div>
  );
};

export default MembersAuth;
