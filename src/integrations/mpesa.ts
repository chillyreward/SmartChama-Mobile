import { endpoints } from '../lib/api';
import { features } from '../config/features';
import type { MobileMoney } from './types';

// M-Pesa via the SmartChama web API. The app never talks to Safaricom
// directly: Daraja credentials live only on the server, and the server
// verifies every payment with Daraja before crediting the wallet.
export const mpesa: MobileMoney = {
  id: 'mpesa',
  label: 'M-Pesa',
  enabled: features.mpesaPayments,
  async requestPayment({ phone, amount, chamaId, membershipId, reference, loanId }) {
    const res = await endpoints.stkPush({
      phone,
      amount,
      chama_id: chamaId,
      membership_id: membershipId,
      account_ref: reference,
      loan_id: loanId,
    });
    return { contributionId: res.contributionId, checkoutRequestId: res.checkoutRequestId };
  },
};
