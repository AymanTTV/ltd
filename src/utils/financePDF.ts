import { pdf } from '@react-pdf/renderer';
import { Transaction, Customer, Account } from '../types'; // Import Customer and Account
import { createElement } from 'react';
import { FinanceDocument } from '../components/pdf/documents';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
// Removed: import { getCompanyDetails } from './companyDetails';

export const generateFinancePDF = async (
  transactions: Transaction[],
  customers: Customer[], // Add customers parameter here
  accounts: Account[], // Add accounts parameter here if needed by FinanceDocument for summary, etc.
  totalIncome: number,
  totalExpenses: number,
  balance: number,
  someOtherValue: number, // Keep this if it's a real parameter in your Finance.tsx call
  outstanding: number,
  startDate: Date | null,
  endDate: Date | null,
  companyDetailsFromCaller: any // Renamed to avoid conflict with local fetch
): Promise<Blob> => {
  try {
    // Using the companyDetails passed from the caller (companyDetailsFromCaller)
    // as Finance.tsx already fetches it from documentGenerator.ts
    const companyDetails = companyDetailsFromCaller;


    // Prepare summary data as FinanceDocument expects it
    const summary = {
      totalIncome,
      totalExpenses,
      netIncome: balance, // Assuming 'balance' from Finance.tsx is netIncome
      profitMargin: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
      outstanding,
      dateRange: { start: startDate, end: endDate }
    };

    // Generate PDF
    return pdf(createElement(FinanceDocument, {
      data: { transactions: transactions, summary: summary }, // Pass transactions and summary
      companyDetails: companyDetails,
      customers: customers, // Pass customers here
      // You can pass accounts here too if FinanceDocument needs them for display
      accounts: accounts
    })).toBlob();
  } catch (error) {
    console.error('Error generating finance PDF:', error);
    throw new Error('Failed to generate finance PDF');
  }
};
