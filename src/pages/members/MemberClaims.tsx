import React, { useEffect, useState } from 'react';
import Invoices from '../Invoices'; // reuses your main claims page
import { useNavigate } from 'react-router-dom';

const MemberClaims = () => {
  const [badgeNumber, setBadgeNumber] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('memberSession');
    if (!session) return navigate('/members/login');
    const { badgeNumber } = JSON.parse(session);
    setBadgeNumber(badgeNumber);
  }, [navigate]);

  if (!badgeNumber) return null;

  return <Invoices filterByBadge={badgeNumber} memberMode />;
};

export default MemberClaims;
