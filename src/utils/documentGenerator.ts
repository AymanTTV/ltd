// src/utils/documentGenerator.ts
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';


// Helper to fetch company details
export const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }

  return docSnap.data();
};

// Generic document generation function
export const generateAndUploadDocument = async (
  Component: React.ComponentType<any>,
  data: any,
  path: string,
  recordId: string,
  collectionName: string,
  companyDetails: any,
  extraProps: Record<string, any> = {}
): Promise<string> => {
  try {
    const pdfBlob = await pdf(
      createElement(Component, {
        data,
        companyDetails,
        ...extraProps,
      })
    ).toBlob();

    const storageRef = ref(storage, `${path}/${recordId}/document.pdf`);
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=7200',
      },
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    await updateDoc(doc(db, collectionName, recordId), {
      documentUrl: downloadURL,
      updatedAt: new Date(),
    });

    return downloadURL;
  } catch (error) {
    console.error('Error generating document:', error);
    toast.error('Failed to generate document');
    throw error;
  }
};

// Bulk document generation
export const generateBulkDocuments = async (
  Component: React.ComponentType<any>,
  records: any[],
  companyDetails: any,
  extraProps: Record<string, any> = {}
): Promise<Blob> => {
  try {
    const pdfBlob = await pdf(
      createElement(Component, {
        records,
        companyDetails,
        title: 'Records Summary',
        ...extraProps,
      })
    ).toBlob();
    return pdfBlob;
  } catch (error) {
    console.error('Error generating bulk documents:', error);
    toast.error('Failed to generate documents');
    throw error;
  }
};

// Specific document generator example
export const generateAccidentDocument = async (record: any) => {
  const companyDetails = await getCompanyDetails();
  return generateAndUploadDocument(
    AccidentDocument,
    record,
    'accidents',
    record.id,
    'accidents',
    companyDetails
  );
};
