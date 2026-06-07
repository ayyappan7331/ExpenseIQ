import { postOne, request } from './http';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@/lib/types/api';

export interface UpdateMeRequest {
  name?: string;
  dob?: string;
  purpose?: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    postOne<RegisterResponse>('/auth/register', data),

  login: (data: LoginRequest) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: data }),

  me: () =>
    request<LoginResponse['user']>('/auth/me'),

  updateMe: (data: UpdateMeRequest) =>
    request<LoginResponse['user']>('/auth/me', { method: 'PUT', body: data }),

  // ── OTP / Forgot-password ───────────────────────────────────────────────────

  /** Step 1 — request an OTP for `identifier` (email or mobile). */
  sendOtp: (data: SendOtpRequest) =>
    request<SendOtpResponse>('/auth/send-otp', { method: 'POST', body: data }),

  /** Step 2 — verify the 6-digit OTP. For purpose='reset', returns a `resetToken`. */
  verifyOtp: (data: VerifyOtpRequest) =>
    request<VerifyOtpResponse>('/auth/verify-otp', { method: 'POST', body: data }),

  /** Step 3 — set a new password using the `resetToken` from verifyOtp. */
  resetPassword: (data: ResetPasswordRequest) =>
    request<ResetPasswordResponse>('/auth/reset-password', { method: 'POST', body: data }),
} as const;
