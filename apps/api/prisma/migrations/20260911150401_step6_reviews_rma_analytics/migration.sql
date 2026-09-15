-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'RECEIVED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'SIZE_ISSUE', 'QUALITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'SEARCH', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START', 'CHECKOUT_STEP', 'PURCHASE');

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "variantId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photoUrls" JSONB,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "hiddenReason" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "adminReply" TEXT,
    "adminRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "reasonNote" TEXT,
    "photoUrls" JSONB,
    "itemIds" JSONB NOT NULL,
    "refundAmountPoisha" INTEGER NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "restockedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_status_history" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "fromStatus" "ReturnStatus",
    "toStatus" "ReturnStatus" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "actorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "orderId" TEXT,
    "path" TEXT,
    "query" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sales_summary" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "paidOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "revenuePoisha" INTEGER NOT NULL DEFAULT 0,
    "refundedPoisha" INTEGER NOT NULL DEFAULT 0,
    "aovPoisha" INTEGER NOT NULL DEFAULT 0,
    "uniqueCustomers" INTEGER NOT NULL DEFAULT 0,
    "repeatCustomers" INTEGER NOT NULL DEFAULT 0,
    "returnedOrders" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_sales_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_terms" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_productId_status_idx" ON "reviews"("productId", "status");

-- CreateIndex
CREATE INDEX "reviews_status_createdAt_idx" ON "reviews"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_productId_customerId_key" ON "reviews"("productId", "customerId");

-- CreateIndex
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_customerId_key" ON "review_votes"("reviewId", "customerId");

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");

-- CreateIndex
CREATE INDEX "return_requests_customerId_status_idx" ON "return_requests"("customerId", "status");

-- CreateIndex
CREATE INDEX "return_requests_status_createdAt_idx" ON "return_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "return_status_history_returnRequestId_createdAt_idx" ON "return_status_history"("returnRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_status_lastMessageAt_idx" ON "support_tickets"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "support_tickets_customerId_idx" ON "support_tickets"("customerId");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_createdAt_idx" ON "analytics_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");

-- CreateIndex
CREATE INDEX "analytics_events_customerId_createdAt_idx" ON "analytics_events"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_productId_createdAt_idx" ON "analytics_events"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sales_summary_date_key" ON "daily_sales_summary"("date");

-- CreateIndex
CREATE INDEX "daily_sales_summary_date_idx" ON "daily_sales_summary"("date");

-- CreateIndex
CREATE INDEX "search_terms_term_createdAt_idx" ON "search_terms"("term", "createdAt");

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_status_history" ADD CONSTRAINT "return_status_history_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
