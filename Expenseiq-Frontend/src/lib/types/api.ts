// Frontend mirror of the backend's types/api.ts. Two intentional differences:
//   1. `_id` is normalized to `id` by the API client before reaching this app
//      (matches the legacy SPA's `norm()` helper at line 2172). The rest of
//      the code touches only `id`.
//   2. Date-shaped fields cross the wire as YYYY-MM-DD strings (the Phase 6
//      schema transform on the backend serialises them that way) and the
//      `createdAt`/`updatedAt` Mongo timestamps cross as ISO strings.
//
// Keep field names byte-identical to what the backend emits.

// ---------- Primitives ----------

export type ProfileId = string;

/** YYYY-MM-DD */
export type ISODate = string;

/** YYYY-MM */
export type ISOMonth = string;

// ---------- Common responses ----------

export interface ErrorResponse {
  error: string;
}

export interface MessageResponse {
  message: string;
}

// ---------- Resource shapes (post-normalization) ----------

export interface Transaction {
  id: string;
  profileId: ProfileId;
  type: 'income' | 'expense';
  /** Optional classification within the type.
   *  Income subtypes: payment, refund, cashback, reimbursement, transfer_in, other
   *  Expense subtypes: purchase, fee, interest, transfer_out, emi, other
   *  Absent on transactions created before this field was introduced. */
  subtype?: TransactionSubtype;
  amount: number;
  category?: string;
  subcategory?: string;
  source?: string;
  date: ISODate;
  /** HH:MM (24-hour) — optional time of transaction */
  time?: string;
  paymentMethod?: string;
  /** Payment app used (e.g. GPay, PhonePe, Paytm) */
  paymentApp?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- Transaction subtype classification ----------

/** Subtypes for income transactions. */
export type IncomeSubtype =
  | 'payment'        // credit card / loan bill payment
  | 'refund'         // merchant refund
  | 'cashback'       // cashback or reward credit
  | 'reimbursement'  // expense reimbursement
  | 'transfer_in'    // money transferred in from another account
  | 'other';         // unclassified income

/** Subtypes for expense transactions. */
export type ExpenseSubtype =
  | 'purchase'       // regular purchase (default)
  | 'fee'            // bank or service fee
  | 'interest'       // interest charge
  | 'transfer_out'   // money transferred out to another account
  | 'emi'            // EMI / installment payment
  | 'other';         // unclassified expense

/** Union of all valid subtype values. */
export type TransactionSubtype = IncomeSubtype | ExpenseSubtype;

/** Subtype options keyed by transaction type — used to populate UI selects. */
export const INCOME_SUBTYPES: { value: IncomeSubtype; label: string }[] = [
  { value: 'payment',       label: 'Bill Payment' },
  { value: 'refund',        label: 'Refund' },
  { value: 'cashback',      label: 'Cashback' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'transfer_in',   label: 'Transfer In' },
  { value: 'other',         label: 'Other' },
];

export const EXPENSE_SUBTYPES: { value: ExpenseSubtype; label: string }[] = [
  { value: 'purchase',     label: 'Purchase' },
  { value: 'fee',          label: 'Fee' },
  { value: 'interest',     label: 'Interest' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'emi',          label: 'EMI / Installment' },
  { value: 'other',        label: 'Other' },
];

/** Set of valid subtypes for each transaction type — single source of truth. */
const INCOME_SUBTYPE_SET = new Set<string>(INCOME_SUBTYPES.map((s) => s.value));
const EXPENSE_SUBTYPE_SET = new Set<string>(EXPENSE_SUBTYPES.map((s) => s.value));

/**
 * Returns true when subtype is valid for the given type.
 * A missing/undefined subtype is always valid (field is optional).
 */
export function isValidSubtype(
  type: 'income' | 'expense',
  subtype: string | undefined
): boolean {
  if (!subtype) return true;
  return type === 'income' ? INCOME_SUBTYPE_SET.has(subtype) : EXPENSE_SUBTYPE_SET.has(subtype);
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
export type TransactionUpdate = Partial<NewTransaction>;

export interface Subscription {
  id: string;
  profileId: ProfileId;
  name: string;
  amount: number;
  cycle: 'monthly' | 'quarterly' | 'yearly';
  due: ISODate;
  category?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type NewSubscription = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;
export type SubscriptionUpdate = Partial<NewSubscription>;

export interface Debt {
  id: string;
  profileId: ProfileId;
  type: 'lent' | 'borrowed';
  person: string;
  amount: number;
  note?: string;
  date: ISODate;
  settled?: boolean;
  settledDate?: ISODate | null;
  createdAt?: string;
  updatedAt?: string;
}

export type NewDebt = Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>;
export type DebtUpdate = Partial<NewDebt>;

export interface Goal {
  id: string;
  profileId: ProfileId;
  month: ISOMonth;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export type NewGoal = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;

export interface Profile {
  id: string;
  profileId: ProfileId;
  name: string;
  icon?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type NewProfile = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;

export interface CreditCard {
  id: string;
  profileId: ProfileId;
  name: string;
  billDate: number;
  /** Legacy: day-of-month due date. Superseded by duePeriod. */
  dueDate?: number;
  /** Days after statement generation until payment is due (e.g. 20). */
  duePeriod?: number;
  limit?: number;
  /** Minimum payment percentage (0–100). Formula: max(200, outstanding × pct/100). */
  minimumPaymentPct?: number;
  /** Annual interest rate % (e.g. 36). Monthly cost = outstanding × rate / 12 / 100. */
  interestRateAnnual?: number;
  /** Opening balance (₹) at the time the user started tracking this card.
   *  Added to lifetime spend so outstanding is correct when history is incomplete.
   *  Defaults to 0 on the backend — existing cards are unaffected. */
  openingBalance?: number;
  color?: string;
  linkedPaymentMethod?: string;
  /** Soft-deleted cards are hidden from main view but recoverable. */
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type NewCreditCard = Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>;
export type CreditCardUpdate = Partial<NewCreditCard>;

export interface Settings {
  id?: string;
  profileId: ProfileId;
  theme?: string;
  widgets?: string[];
  widgetOrder?: string[];
  /** Persisted sidebar nav item order — array of NavItem hrefs. */
  navOrder?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type SettingsUpdate = Partial<Settings> & { profileId: ProfileId };

// ---------- E4.4 Domain separation types (additive, no breaking changes) ----------

/**
 * Financial configuration fields within Settings.
 * These are the fields that belong to a future FinancialConfig domain entity.
 * Currently stored flat in Settings; will be split in a future backend migration.
 * Also used as the response type for GET/PUT /api/financial-config.
 */
export interface FinancialConfig {
  id?: string;
  profileId: ProfileId;
  customExpenseCategories?: string[];
  customIncomeCategories?: string[];
  customPaymentMethods?: string[];
  customPaymentApps?: string[];
  subcategoryMap?: Record<string, string[]>;
  transactionTemplates?: TransactionTemplate[];
  favoriteTransactions?: FavoriteTransaction[];
  pinnedTransactionIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Transaction template stored in FinancialConfig (E4.8). */
export interface TransactionTemplate {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subtype?: TransactionSubtype;
  category: string;
  subcategory?: string;
  paymentMethod?: string;
  paymentApp?: string;
  notes?: string;
  amount?: number;
  createdAt?: string;
}

/** Favorite transaction stored in FinancialConfig (E4.9). */
export interface FavoriteTransaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subtype?: TransactionSubtype;
  category: string;
  subcategory?: string;
  paymentMethod?: string;
  paymentApp?: string;
  notes?: string;
  amount?: number;
  createdAt?: string;
  usageCount: number;
  lastUsed: string;
}

/**
 * User preference fields within Settings.
 * These are the fields that belong to a future UserPreferences domain entity.
 * Low-sync-priority: theme and widgets can remain localStorage-backed until
 * cross-device sync is needed.
 */
export interface UserPreferences {
  profileId: ProfileId;
  theme?: string;
  widgets?: string[];
  widgetOrder?: string[];
}

export interface Budget {
  id: string;
  profileId: ProfileId;
  month: ISOMonth;
  category: string;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export type NewBudget = Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>;

// ---------- Auth (Phase 7 + Auth Enhancement) ----------

export interface RegisterRequest {
  /** At least one of email / mobile is required. */
  email?: string;
  mobile?: string;
  password: string;
  name?: string;
  dob?: string;
  purpose?: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  mobile: string;
  name: string;
}

/** Login accepts either an email address or a mobile number as the identifier. */
export interface LoginRequest {
  identifier: string;  // email OR mobile number
  password: string;
}

export interface LoginResponse {
  token: string;
  user: RegisterResponse & { dob?: string; purpose?: string };
}

// ---------- OTP / Forgot-password ----------

export interface SendOtpRequest {
  identifier: string;   // email or mobile
  purpose: 'verify' | 'reset' | 'login';
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpRequest {
  identifier: string;
  code: string;         // 6-digit numeric string
  purpose: 'verify' | 'reset' | 'login';
}

// ---------- OTP Login (passwordless) ----------

/** Step 1 uses SendOtpRequest with purpose='login'. Step 2 is below. */
export interface LoginOtpRequest {
  identifier: string;  // email or mobile
  code: string;        // 6-digit OTP
}

/** Same shape as LoginResponse — drop-in replacement so afterLogin() works unchanged. */
export type LoginOtpResponse = LoginResponse;

export interface VerifyOtpResponse {
  valid: boolean;
  /** Only present when purpose==='reset'. Short-lived JWT (5 min). */
  resetToken?: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// ---------- Ops (Phase 8 backend) ----------

export interface HealthResponse {
  status: 'ok' | 'down';
  timestamp: string;
}

export interface VersionResponse {
  version: string;
  gitSha: string;
  nodeEnv: string;
}

export interface DbStatsResponse {
  dataSize: number;
  indexSize: number;
  storageSize: number;
  usedBytes: number;
  limitBytes: number;
  collections: number;
  objects: number;
  db: string;
}
