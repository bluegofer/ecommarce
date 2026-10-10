export type UserRole =
  | 'SUPER_ADMIN'
  | 'CATALOG_MANAGER'
  | 'ORDER_SUPPORT'
  | 'MARKETING_MANAGER'
  | 'ADMIN'
  | 'EDITOR'
  | 'FINANCE_MANAGER'
  | 'PURCHASE_MANAGER'
  | 'STORE_POS_STAFF'
  | 'HR_MANAGER'
  | 'FINANCE_READONLY';

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  phone: string;
  email?: string;
  fullName: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface OtpVerifyRequest {
  phone: string;
  code: string;
}
