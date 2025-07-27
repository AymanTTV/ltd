// Updated CustomerDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Customer } from '../../../types/customer';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface CustomerDocumentProps {
  data: Customer;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    vatNumber: string;
    registrationNumber: string;
    phone: string;
    email: string;
    customerTerms?: string;
    signature?: string;
  };
}

const CustomerDocument: React.FC<CustomerDocumentProps> = ({ data, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      {/* Header */}
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          {companyDetails.logoUrl && (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>{companyDetails.fullName}</Text>
          <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
          <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
          <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
        </View>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>MEMBER RECORD</Text>
      </View>

      {/* Member Photo */}
      {data.photoUrl && (
        <View style={[styles.section, { alignItems: 'center' }]}>
          <Text style={styles.sectionTitle}>Member Photo</Text>
          <Image src={data.photoUrl} style={{ width: 100, height: 100, borderRadius: 8 }} />
        </View>
      )}

      {/* Info Cards Side-by-Side */}
      <View style={styles.spaceBetweenRow} wrap={false}>
        {/* Member Info */}
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.cardTitle}>Member Information</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{data.fullName}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Nickname:</Text>
            <Text style={styles.value}>{data.nickname || '—'}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Gender:</Text>
            <Text style={styles.value}>{data.gender}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(data.dateOfBirth)}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>{data.mobile}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{data.email}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.address}</Text>
          </View>
        </View>

        {/* Membership Details */}
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.cardTitle}>Membership Details</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Badge Number:</Text>
            <Text style={styles.value}>{data.badgeNumber || '—'}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Bill Expiry:</Text>
            <Text style={styles.value}>{data.billExpiry ? formatDate(data.billExpiry) : '—'}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>License Type:</Text>
            <Text style={styles.value}>{data.licenseType}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Region:</Text>
            <Text style={styles.value}>{data.originalRegion}</Text>
          </View>
        </View>
      </View>

      {/* Signature */}
      {data.signature && (
        <View style={[styles.section, { marginBottom: 30 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Member Signature</Text>
          <Image src={data.signature} style={styles.signature} />
          <Text style={styles.signatureLine}>Signature on File</Text>
        </View>
      )}

      {/* Record Info Table */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>Member Registration</Text>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Registered At</Text>
            <Text style={styles.tableHeaderCell}>Last Updated</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>{formatDate(data.createdAt)}</Text>
            <Text style={styles.tableCell}>{formatDate(data.updatedAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.pageBreak} />

      {/* Terms & Conditions */}
      {companyDetails.customerTerms && (
        <View style={[styles.section, { breakInside: 'avoid' }]}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>{companyDetails.customerTerms}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          LONDON TAXI ASSOCIATION | Registered in England and Wales | Company No. 11587523 Registered Office: United House, 39-41 North Road, London, N7 9DP
        </Text>
        <Text
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </Page>
  </Document>
);

export default CustomerDocument;