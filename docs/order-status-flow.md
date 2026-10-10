# Order Status Flow — Auto vs Manual

**Last updated:** 2026-09-29
**Owner:** Development team
**Status:** Authoritative reference

## Overview

The order lifecycle has multiple statuses. Each status change is either:

- **Auto** — triggered by system event (checkout, cart, webhook)
- **Manual** — triggered by admin staff clicking a button in the admin console
- **Hybrid** — Manual initially; later Step 13 will allow courier webhook to auto-advance

## Status Flow

Order Placed (customer checkout)
    ↓ AUTO
PENDING_VERIFICATION
    ↓ MANUAL: "Verify" button on order detail
VERIFIED
    ↓ MANUAL: "Move to Processing" button
PROCESSING
    ↓ MANUAL: "Move to Shipped" button
SHIPPED
    ↓ MANUAL: "In Transit" button (or courier webhook in Step 13)
IN_TRANSIT
    ↓ MANUAL: "Out for Delivery" button (or courier webhook)
OUT_FOR_DELIVERY
    ↓ MANUAL: "Delivered" button (or courier webhook)
DELIVERED

Alternate paths (manual override):
- FAILED      (delivery failed)
- RETURNED    (RTO — return to origin)
- CANCELLED   (customer or admin cancellation)

## Admin Controls

URL: admin.nolimitshopping.com/orders/{orderId}

Available buttons (context-aware):

| Button | When Shown | Backend Endpoint |
|--------|-----------|------------------|
| Verify | PENDING_VERIFICATION | POST /orders/:id/verify |
| Move to Processing | VERIFIED | PATCH /orders/:id/status |
| Move to Shipped | PROCESSING | PATCH /orders/:id/status |
| Move to Out for Delivery | SHIPPED | PATCH /orders/:id/status |
| Move to Delivered | OUT_FOR_DELIVERY | PATCH /orders/:id/status |
| In Transit | any active | PATCH /orders/:id/status |
| Failed | any active | PATCH /orders/:id/status |
| Returned | any active | PATCH /orders/:id/status |
| Exchange | DELIVERED | POST /orders/:id/exchange |
| Assign Rider | any active | PATCH /orders/:id/rider |
| Edit Address | pre-shipment | PATCH /orders/:id/address |
| Dispatch | PROCESSING | POST /orders/:id/dispatch |
| Add Note | any | POST /orders/:id/notes |
| Cancel | pre-shipment | POST /orders/:id/cancel |
| Download Invoice | any | GET /orders/:id/invoice.pdf |

## Customer Tracking Page

URL: nolimitshopping.com/{locale}/account/orders/{orderId}

Customer sees:
- 8-step timeline: Placed → Verification → Verified → Order Confirmed → Packed → Handed to Courier → In Transit → Out for Delivery → Delivered
- Each step with timestamp
- Tracking number (once courier dispatch complete)

Live updates: status changes reflect instantly on customer tracking page after admin action.

## Step 13 Preview — Courier Auto-Advance

Coming in Step 13 (when courier account connected):
- Courier webhook pushes events
- IN_TRANSIT → auto-advance when courier picks up parcel
- OUT_FOR_DELIVERY → auto-advance when courier starts delivery
- DELIVERED → auto-advance when courier confirms delivery
- FAILED → auto-advance when courier reports failure

Staff manual override: admin can still override. Courier-set statuses never silently overwrite staff-set statuses — conflicts raise review flag (per TDD section A.4).

## Related Files

- Frontend: apps/admin/src/app/(dashboard)/orders/[id]/page.tsx
- Backend: apps/api/src/modules/orders/orders.controller.ts
- Customer view: apps/storefront/src/components/account/OrderTracking.tsx
- Status state machine: apps/api/src/modules/orders/order-state-machine.ts