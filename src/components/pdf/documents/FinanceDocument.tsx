// src/components/pdf/documents/FinanceDocument.tsx
import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Transaction, Customer } from '../../../types'; // Removed Vehicle import
import { format } from 'date-fns'; // Corrected import statement
import { styles as globalStyles } from '../styles';

interface FinanceDocumentProps {
  data:
    | Transaction
    | Transaction[]
    | { transactions: Transaction[] };
  // vehicles?: Vehicle[]; // Removed vehicles prop
  companyDetails: {
    logoUrl?: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  customers: Customer[]; // Added customers prop to get badge number
}

const localStyles = StyleSheet.create({
  tableRow: {
    ...globalStyles.tableRow,
    minHeight: 24,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  tableCell: {
    ...globalStyles.tableCell,
    padding: 6,
    textAlign: 'left',
    fontSize: 9,
  },
  tableHeader: {
    ...globalStyles.tableHeader,
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  summaryCard: {
    ...globalStyles.card,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  summaryLabel: {
    ...globalStyles.text,
    fontSize: 10,
    color: '#4B5563',
    flexBasis: '30%',
  },
  summaryValue: {
    ...globalStyles.text,
    fontSize: 10,
    fontWeight: 'bold',
    flexBasis: '65%',
    flexWrap: 'wrap',
  },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    textAlign: 'center',
  },
});

const FinanceDocument: React.FC<FinanceDocumentProps> = ({
  data,
  // vehicles = [], // Removed vehicles prop
  companyDetails,
  customers, // Destructure customers prop
}) => {
  // normalize transactions array
  let transactions: Transaction[];
  if (Array.isArray(data)) {
    transactions = data;
  } else if ('transactions' in data) {
    transactions = data.transactions;
  } else {
    transactions = [data as Transaction];
  }

  // summary calculations for bulk
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  const formatCurrency = (amt: number) => `£${amt.toFixed(2)}`;
  const formatDate = (d?: Date | string) =>
    d ? format(new Date(d), 'dd/MM/yyyy') : 'N/A';

  // Function to get customer badge number
  const getCustomerBadgeNumber = (customerId?: string) => {
    if (customerId && customers) { // Added check for customers array
      const customer = customers.find((c) => c.id === customerId);
      return customer?.badgeNumber || 'N/A';
    }
    return 'N/A';
  };

  const Header = () => (
    <View style={globalStyles.header} fixed>
      <View style={globalStyles.headerLeft}>
        {companyDetails.logoUrl && (
          <Image src={companyDetails.logoUrl} style={globalStyles.logo} />
        )}
      </View>
      <View style={globalStyles.headerRight}>
        <Text style={globalStyles.companyName}>
          {companyDetails.fullName || 'AIE Skyline Limited'}
        </Text>
        <Text style={globalStyles.companyDetail}>
          United House, 39-41 North Road,
        </Text>
        <Text style={globalStyles.companyDetail}>London, N7 9DP</Text>
        <Text style={globalStyles.companyDetail}>
          Tel: {companyDetails.phone || 'N/A'}
        </Text>
        <Text style={globalStyles.companyDetail}>
          Email: {companyDetails.email || 'N/A'}
        </Text>
      </View>
    </View>
  );

  // single-transaction page
  const renderSingle = () => {
    const tx = transactions[0];
    return (
      <Page size="A4" style={globalStyles.page}>
        <Header />
        <Text style={localStyles.transactionTitle}>
          Transaction Details
        </Text>

        <View style={localStyles.summaryCard}>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Customer:</Text>
            <Text style={localStyles.summaryValue}>
              {tx.customerName || 'N/A'}
            </Text>
          </View>
          {/* Added Customer Badge Number */}
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Customer Badge No.:</Text>
            <Text style={localStyles.summaryValue}>
              {getCustomerBadgeNumber(tx.customerId)}
            </Text>
          </View>
          {/* Removed Vehicle Reg */}
          {/* <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Vehicle Reg:</Text>
            <Text style={localStyles.summaryValue}>
              {getReg(tx)}
            </Text>
          </View> */}
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Category:</Text>
            <Text style={localStyles.summaryValue}>
              {tx.category}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Date:</Text>
            <Text style={localStyles.summaryValue}>
              {formatDate(tx.date)}
            </Text>
          </View>
          {/* Description row restored to original two-column layout */}
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Description:</Text>
            <Text style={localStyles.summaryValue}>
              {tx.description || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={globalStyles.section}>
          <View
            style={{
              ...localStyles.tableRow,
              ...localStyles.tableHeader,
            }}
          >
            <Text
              style={{
                ...localStyles.tableCell,
                width: '40%',
              }}
            >
              Amount
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '30%',
              }}
            >
              Method
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '30%',
              }}
            >
              Status
            </Text>
          </View>
          <View style={localStyles.tableRow}>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '40%',
                color:
                  tx.type === 'income'
                    ? localStyles.positive.color
                    : localStyles.negative.color,
                fontWeight: 'bold',
              }}
            >
              {formatCurrency(tx.amount ?? 0)}
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '30%',
              }}
            >
              {tx.paymentMethod
                ?.replace('_', ' ')
                .toUpperCase() || 'N/A'}
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '30%',
              }}
            >
              {tx.paymentStatus
                ?.replace('_', ' ')
                .toUpperCase() || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={globalStyles.footer} fixed>
          <Text style={globalStyles.footerText}>
            LONDON TAXI ASSOCIATION | Registered in England and Wales | Company No. 11587523 Registered Office: United House, 39-41 North Road, London, N7 9DP
          </Text>
          <Text
            style={globalStyles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    );
  };

  // bulk pages renderer
  const renderTransactionsPage = (
    pageTxs: Transaction[],
    pageNum: number,
    totalPages: number
  ) => (
    <Page size="A4" style={globalStyles.page} key={pageNum}>
      <Header />
      <Text style={localStyles.transactionTitle}>
        Financial Report
      </Text>

      {pageNum === 1 && (
        <View style={localStyles.summaryCard}>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>
              Total Income:
            </Text>
            <Text
              style={{
                ...localStyles.summaryValue,
                ...localStyles.positive,
              }}
            >
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>
              Total Expenses:
            </Text>
            <Text
              style={{
                ...localStyles.summaryValue,
                ...localStyles.negative,
              }}
            >
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>
              Net Income:
            </Text>
            <Text
              style={{
                ...localStyles.summaryValue,
                ...(netIncome >= 0
                  ? localStyles.positive
                  : localStyles.negative),
              }}
            >
              {formatCurrency(netIncome)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>
              Profit Margin:
            </Text>
            <Text
              style={{
                ...localStyles.summaryValue,
                ...(profitMargin >= 0
                  ? localStyles.positive
                  : localStyles.negative),
              }}
            >
              {profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      <View
        style={{ ...globalStyles.section, breakInside: 'avoid' }}
      >
        <Text style={globalStyles.sectionTitle}>
          Transaction Details
        </Text>
        <View
          style={{
            ...localStyles.tableRow,
            ...localStyles.tableHeader,
          }}
        >
          <Text
            style={{ ...localStyles.tableCell, width: '15%' }} // Adjusted width
          >
            Type
          </Text>
          <Text
            style={{ ...localStyles.tableCell, width: '20%' }} // Adjusted width
          >
            Category
          </Text>
          <Text
            style={{ ...localStyles.tableCell, width: '25%' }} // Adjusted width
          >
            Customer
          </Text>
          <Text
            style={{
              ...localStyles.tableCell,
              width: '15%', // Adjusted width
              textAlign: 'right',
            }}
          >
            Amount
          </Text>
          <Text
            style={{ ...localStyles.tableCell, width: '10%' }} // Adjusted width
          >
            Status
          </Text>
          <Text
            style={{ ...localStyles.tableCell, width: '15%' }} // Adjusted width
          >
            Date
          </Text>
        </View>

        {pageTxs.map((tx, i) => (
          <View
            key={i}
            style={{ ...localStyles.tableRow, breakInside: 'avoid' }}
          >
            <Text
              style={{
                ...localStyles.tableCell,
                width: '15%',
                textTransform: 'capitalize',
              }}
            >
              {tx.type}
            </Text>
            <Text
              style={{ ...localStyles.tableCell, width: '20%' }}
            >
              {tx.category}
            </Text>
            <Text
              style={{ ...localStyles.tableCell, width: '25%' }} // Adjusted width
            >
              {tx.customerName || 'N/A'}
              {tx.customerId && customers.find(c => c.id === tx.customerId)?.badgeNumber && (
                <Text style={{ fontSize: 7, color: '#6B7280' }}>
                  {` (Badge: ${customers.find(c => c.id === tx.customerId)?.badgeNumber})`}
                </Text>
              )}
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '15%', // Adjusted width
                textAlign: 'right',
                color:
                  tx.type === 'income'
                    ? localStyles.positive.color
                    : localStyles.negative.color,
              }}
            >
              {formatCurrency(tx.amount ?? 0)}
            </Text>
            <Text
              style={{ ...localStyles.tableCell, width: '10%' }} // Adjusted width
            >
              {tx.paymentStatus
                ?.replace('_', ' ')
                .toUpperCase() || 'N/A'}
            </Text>
            <Text
              style={{ ...localStyles.tableCell, width: '15%' }} // Adjusted width
            >
              {formatDate(tx.date)}
            </Text>
          </View>
        ))}
      </View>

      <View style={globalStyles.footer} fixed>
        <Text style={globalStyles.footerText}>
          LONDON TAXI ASSOCIATION | Registered in England and Wales | Company No. 11587523 Registered Office: United House, 39-41 North Road, London, N7 9DP
        </Text>
        <Text
          style={globalStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );

  // bulk pages renderer
  const renderBulk = () => {
    const firstCount = 5; // Changed from 4 to 6
    const perPage = 7; // Changed from 4 to 8
    const pages: React.ReactNode[] = [];
    let rem = [...transactions];

    // first page
    pages.push(
      renderTransactionsPage(
        rem.slice(0, firstCount),
        1,
        Math.ceil((transactions.length - firstCount) / perPage) + 1
      )
    );
    rem = rem.slice(firstCount);

    // subsequent pages
    let pageNo = 2;
    const totalPages =
      Math.ceil((transactions.length - firstCount) / perPage) + 1;
    while (rem.length) {
      const batch = rem.slice(0, perPage);
      rem = rem.slice(perPage);
      pages.push(renderTransactionsPage(batch, pageNo, totalPages));
      pageNo++;
    }
    return pages;
  };

  return (
    <Document>
      {transactions.length === 1 ? renderSingle() : renderBulk()}
    </Document>
  );
};

export default FinanceDocument;
