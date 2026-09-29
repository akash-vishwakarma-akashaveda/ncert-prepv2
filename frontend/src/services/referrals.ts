import { api } from './api/client';

export interface ReferralStats {
  code: string | null;
  referredThisMonth: number;
  referredTotal: number;
}

export interface ReferralRow {
  code: string;
  ownerName: string | null;
  ownerEmail: string | null;
  count: number;
}

export interface ReferralMonthBreakdown {
  month: string;
  rows: ReferralRow[];
}

export const ReferralService = {
  async getMyStats(): Promise<ReferralStats> {
    return api.get<ReferralStats>('/api/users/me/referral-stats');
  },
  async getMonthlyBreakdown(month?: string): Promise<ReferralMonthBreakdown> {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return api.get<ReferralMonthBreakdown>(`/api/users/referrals${qs}`);
  },
};
