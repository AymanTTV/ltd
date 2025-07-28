import React, { useEffect, useState } from 'react';
import Finance from '../Finance'; // reuses your main finance page
import { useNavigate } from 'react-router-dom';

const MemberFinance = () => {
  const [badgeNumber, setBadgeNumber] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('memberSession');
    if (!session) return navigate('/members/login');
    const { badgeNumber } = JSON.parse(session);
    setBadgeNumber(badgeNumber);
  }, [navigate]);

  if (!badgeNumber) return null;

  return <Finance filterByBadge={badgeNumber} memberMode />;
};

export default MemberFinance;