// src/components/finance/ClaimApprovalModal.tsx
import React, { useState } from 'react';
import { Invoice } from '../../types/finance';
import { APPROVED_CLAIM_REASONS, REJECTED_CLAIM_REASONS } from '../../constants/claimReasons';
import toast from 'react-hot-toast';

interface ClaimApprovalModalProps {
  invoice: Invoice;
  onClose: () => void;
  onVote: (invoiceId: string, decision: 'Approved' | 'Rejected', reason: string) => Promise<void>;
}

const ClaimApprovalModal: React.FC<ClaimApprovalModalProps> = ({ invoice, onClose, onVote }) => {
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reasonsList = decision === 'Approved' ? APPROVED_CLAIM_REASONS : REJECTED_CLAIM_REASONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision || !reason) {
      toast.error('Please select a decision and a reason.');
      return;
    }
    setLoading(true);
    try {
      await onVote(invoice.id, decision, reason);
      toast.success(`Vote successfully recorded as ${decision}.`);
      onClose();
    } catch (err) {
      toast.error('Failed to record your vote.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium">Approve/Reject Claim</h3>
      <p>Your decision for claim: <span className="font-semibold">{`AIE-INV-${invoice.id.slice(-8).toUpperCase()}`}</span></p>

      {/* Decision Buttons */}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setDecision('Approved')}
          className={`w-full px-4 py-2 rounded-md ${decision === 'Approved' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setDecision('Rejected')}
          className={`w-full px-4 py-2 rounded-md ${decision === 'Rejected' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          Reject
        </button>
      </div>

      {/* Reasons Dropdown */}
      {decision && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason for {decision}</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="form-select mt-1 w-full"
            required
          >
            <option value="">Select a reason...</option>
            {reasonsList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !decision || !reason}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400"
        >
          {loading ? 'Submitting...' : 'Submit Vote'}
        </button>
      </div>
    </form>
  );
};

export default ClaimApprovalModal;