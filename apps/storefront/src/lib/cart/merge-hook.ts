'use client';

/**
 * Guest → signed-in cart merge hook.
 *
 * STUB in Step 8.5. Activated in Step 8.7 (C6-C7 Auth) after login
 * succeeds. At that point it will:
 *   1. Read local cart (useCart().items)
 *   2. POST /api/v1/carts/guest  → materialize a server cart id
 *   3. POST /carts/{id}/items    → for each local item
 *   4. Clear local cart
 *   5. Switch CartProvider to API-backed mode
 *
 * See docs/DECISIONS.md → "Step 8 Update — Cart Storage Strategy".
 */

export interface MergeResult {
  merged: number;
  serverCartId: string | null;
}

export function useMergeGuestCart() {
  return async (): Promise<MergeResult> => {
    // TODO Step 8.7: implement real merge against POST /carts/guest.
    return { merged: 0, serverCartId: null };
  };
}