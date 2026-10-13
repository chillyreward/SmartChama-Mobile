export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: string;
}

export interface ChamaMembership {
  id: string;
  profile_id: string;
  chama_id: string;
  role: 'admin' | 'chairlady' | 'treasurer' | 'secretary' | 'member';
  status: 'active' | 'pending' | 'suspended' | 'removed' | 'rejected';
  trust_score: number;
  contribution_streak: number;
  joined_at?: string;
  created_at?: string;
  profiles?: Profile;
}

export interface Chama {
  id: string;
  name: string;
  group_code: string;
  contribution_amount: number;
  contribution_frequency: 'weekly' | 'monthly';
  status: 'active' | 'suspended' | 'dissolved';
  created_by?: string;
  created_at?: string;
}

export interface Contribution {
  id: string;
  membership_id: string;
  chama_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  mpesa_checkout_request_id?: string;
  mpesa_receipt?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  chama_id: string;
  membership_id: string;
  type: 'contribution' | 'withdrawal' | 'penalty';
  amount: number;
  reference?: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface Wallet {
  id: string;
  chama_id: string;
  balance: number;
}

export interface MerryGoRoundCycle {
  id: string;
  chama_id: string;
  amount_per_member: number;
  current_round: number;
  total_rounds: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface MerryGoRoundTurn {
  id: string;
  cycle_id: string;
  round_number: number;
  recipient_membership_id: string;
  status: 'pending' | 'collecting' | 'paid_out';
  payout_date: string | null;
}

export interface WelfareFund {
  id: string;
  chama_id: string;
  balance: number;
  max_claim_amount: number;
  contribution_per_member: number;
  created_at: string;
}

export interface WelfareClaim {
  id: string;
  chama_id: string;
  membership_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  created_at: string;
}

export interface Penalty {
  id: string;
  chama_id: string;
  membership_id: string;
  amount: number;
  reason: string;
  status: 'unpaid' | 'paid' | 'waived';
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  chama_id: string;
  title: string;
  message: string;
  posted_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  chama_id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}
