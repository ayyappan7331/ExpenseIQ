// Phase 10 — shared DTOs for the ExpenseIQ API.
//
// As more files convert from .js to .ts, replace ad-hoc shapes with imports
// from this module so the wire contract stays in one place.

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

/** Returned by utils/httpError; the errorHandler middleware reads .statusCode. */
export interface HttpError extends Error {
  statusCode: number;
}

// ---------- Resources ----------

export interface Transaction {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  source?: string;
  date: ISODate;
  paymentMethod?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subscription {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  name: string;
  amount: number;
  cycle: 'monthly' | 'quarterly' | 'yearly';
  due: ISODate;
  category?: string;
  active?: boolean;
}

export interface Debt {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  type: 'lent' | 'borrowed';
  person: string;
  amount: number;
  note?: string;
  date: ISODate;
  settled?: boolean;
  settledDate?: ISODate | null;
}

export interface Goal {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  month: ISOMonth;
  amount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Profile type removed — multi-profile architecture deprecated.

export interface CreditCard {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  name: string;
  billDate: number;
  dueDate?: number;
  duePeriod?: number;
  limit?: number;
  color?: string;
  linkedPaymentMethod?: string;
  archived?: boolean;
}

export interface Settings {
  _id?: string;
  userId: string;
  theme?: string;
  widgets?: string[];
  widgetOrder?: string[];
}

export interface Budget {
  _id?: string;
  userId: string;
  context?: 'Personal' | 'Business';
  month: ISOMonth;
  category: string;
  amount: number;
}

// ---------- Auth (Phase 7) ----------

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
}

export type LoginRequest = RegisterRequest;

export interface LoginResponse {
  token: string;
  user: RegisterResponse;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// ---------- Ops (Phase 8) ----------

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
