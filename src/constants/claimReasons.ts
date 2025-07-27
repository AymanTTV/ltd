// src/constants/claimReasons.ts

export const APPROVED_CLAIM_REASONS = [
  "Unable to work for 3 weeks or more due to medical illness (with valid report)",
  "Licence suspended or revoked (not due to criminal activity)",
  "Has completed 90 days (3 months) continuous membership",
  "Claim form fully completed and all supporting documents uploaded",
  "No outstanding payments or rule breaches at time of claim",
];

export const REJECTED_CLAIM_REASONS = [
  "No valid medical report or DVLA letter provided",
  "Licence revoked due to criminal offence or misconduct",
  "Less than 90 days active membership",
  "False or tampered documents submitted",
  "Claim submitted after recovery or return to work",
  "Member has already received maximum support limit this year",
  "Member has unpaid fees or suspended status",
];