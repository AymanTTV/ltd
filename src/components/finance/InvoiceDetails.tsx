// src/components/finance/InvoiceDetails.tsx
import React from 'react';
import { Invoice, Customer, User } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import { FileText, User as UserIcon, Calendar, Users, ThumbsUp, ThumbsDown, Download } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface InvoiceDetailsProps {
  invoice: Invoice;
  customer?: Customer;
  users: User[];
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  customer,
  users,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : date;
    return format(d, 'dd/MM/yyyy HH:mm');
  };

  const totalDiscount = invoice.lineItems.reduce((sum, li) => {
    const gross = li.quantity * li.unitPrice;
    return sum + (li.discount / 100) * gross;
  }, 0);

  const lineTotals = (item: Invoice['lineItems'][0]) => {
    const gross = item.quantity * item.unitPrice;
    const discountAmt = (item.discount / 100) * gross;
    const netAfterDiscount = gross - discountAmt;
    const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
    return {
      netAfterDiscount,
      vatAmt,
      totalLine: netAfterDiscount + vatAmt
    };
  };

  const hasDocuments = (invoice.supportingDocuments && invoice.supportingDocuments.length > 0) || invoice.documentUrl;

  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <StatusBadge status={invoice.approvalStatus || 'Pending'} />
            <StatusBadge status={invoice.paymentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Claim Date</h3>
          <p className="mt-1 flex items-center"><Calendar className="h-4 w-4 text-gray-400 mr-2" />{formatDate(invoice.date)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
          <p className="mt-1 flex items-center"><Calendar className="h-4 w-4 text-gray-400 mr-2" />{formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
        <div className="mt-1 flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <p className="font-medium">{invoice.customerName || customer?.fullName}</p>
            <p className="text-sm text-gray-500">{invoice.customerPhone || customer?.mobile}</p>
          </div>
        </div>
      </div>
      
       <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
        <div className="flex justify-between text-sm"><span>Sub-Total (Net):</span><span>{formatCurrency(invoice.subTotal)}</span></div>
        <div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(invoice.vatAmount)}</span></div>
        {totalDiscount > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-600">-{formatCurrency(totalDiscount)}</span></div>}
        <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total:</span><span>{formatCurrency(invoice.total)}</span></div>
        <div className="flex justify-between text-sm"><span>Paid:</span><span className="text-green-600">{formatCurrency(invoice.paidAmount)}</span></div>
        <div className="flex justify-between text-sm font-semibold"><span>Owing:</span><span className="text-amber-600">{formatCurrency(invoice.remainingAmount)}</span></div>
      </div>

      {/* NEW: Display list of supporting documents */}
      {hasDocuments && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center"><FileText className="h-4 w-4 mr-2" />Supporting Documents</h3>
          <div className="border border-gray-200 rounded-md p-3 space-y-2 bg-gray-50">
            {invoice.supportingDocuments?.map((doc, index) => (
              <a
                key={index}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-primary hover:underline bg-white p-2 rounded-md border"
              >
                <span className="truncate">{doc.name}</span>
                <Download className="h-4 w-4 ml-2 flex-shrink-0" />
              </a>
            ))}
            {/* Handle legacy documentUrl for older invoices */}
            {invoice.documentUrl && !invoice.supportingDocuments && (
               <a
                href={invoice.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-primary hover:underline bg-white p-2 rounded-md border"
              >
                <span className="truncate">Uploaded Document</span>
                <Download className="h-4 w-4 ml-2 flex-shrink-0" />
              </a>
            )}
          </div>
        </div>
      )}

      {(invoice.approvals?.length > 0) && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center"><Users className="h-4 w-4 mr-2" />Approval History</h3>
          <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
            {invoice.approvals.map(vote => (
              <div key={vote.userId} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{vote.userName || users.find(u => u.id === vote.userId)?.name || 'Unknown User'}</span>
                  {vote.decision === 'Approved' ? (
                    <span className="flex items-center text-green-600 font-medium"><ThumbsUp className="h-4 w-4 mr-1" /> Approved</span>
                  ) : (
                    <span className="flex items-center text-red-600 font-medium"><ThumbsDown className="h-4 w-4 mr-1" /> Rejected</span>
                  )}
                </div>
                <p className="text-gray-600 mt-1 italic">"{vote.reason}"</p>
                <p className="text-xs text-gray-400 text-right">{formatDate(vote.date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.approvalStatus === 'Approved' && invoice.payments?.length > 0 && (
        <InvoicePaymentHistory payments={invoice.payments} onDownloadDocument={(url) => window.open(url, '_blank')} />
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Line Items</h3>
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-6 bg-gray-100 text-xs font-semibold text-gray-600 px-3 py-2">
            <div className="col-span-2">Description</div><div className="text-right">Qty</div><div className="text-right">Unit Price</div><div className="text-right">Discount</div><div className="text-center">VAT?</div><div className="text-right">Total</div>
          </div>
          {invoice.lineItems.map((item, idx) => {
            const { totalLine } = lineTotals(item);
            return (
              <div key={item.id || idx} className={`grid grid-cols-6 text-sm border-t border-gray-100 px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="col-span-2">{item.description}</div>
                <div className="text-right">{item.quantity}</div>
                <div className="text-right">{formatCurrency(item.unitPrice)}</div>
                <div className="text-right">{item.discount.toFixed(1)}%</div>
                <div className="text-center">{item.includeVAT ? '✓' : '-'}</div>
                <div className="text-right font-medium">{formatCurrency(totalLine)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-gray-400 border-t pt-4 text-center">
        <p>Claim ID: {invoice.id}</p>
        <p>Created: {formatDate(invoice.createdAt)} | Last Updated: {formatDate(invoice.updatedAt)}</p>
      </div>
    </div>
  );
};

export default InvoiceDetails;