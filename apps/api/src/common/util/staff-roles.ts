// apps/api/src/common/util/staff-roles.ts
//
// Roles that trigger 2FA enrollment on login (F-07, step-15.9).
// Extracted from auth.service.ts in step-151 so the enforcement guard
// and the login flow share one source of truth.

export const STAFF_ROLE_CODES: ReadonlySet<string> = new Set<string>([
  'SUPER_ADMIN',
  'CATALOG_MANAGER',
  'ORDER_SUPPORT',
  'MARKETING',
  'FINANCE_READONLY',
  'FINANCE',
  'PURCHASE_MANAGER',
  'STORE_POS_STAFF',
  'HR_MANAGER',
  'RESTAURANT_STAFF',
  'DELIVERY_STAFF',
]);