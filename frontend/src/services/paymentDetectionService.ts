import { api } from './api';
import type { PaymentReviewReport } from '../types';

export const PaymentDetectionService = {
  getReviewReport: () => api.get<PaymentReviewReport>('/n8n/payment-review'),
  confirmReview: (body: {
    operationId: string;
    paymentDate?: string | null;
    reference?: string | null;
    receiptId?: string | null;
  }) => api.post('/n8n/payment-review/confirm', body),
};
