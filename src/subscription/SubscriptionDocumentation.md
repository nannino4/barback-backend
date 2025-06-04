# Subscription Management API Documentation

## Overview

The Subscription Management system handles user subscriptions for becoming organization owners. Users start with a 3-month trial subscription that automatically converts to a paid basic plan when the trial period ends.

## Workflow for Organization Owners

1. **Check Trial Eligibility**: Before allowing a user to create an organization, check if they're eligible for a trial subscription.
2. **Start Trial Subscription**: When a user wants to become an organization owner, create a trial subscription that will automatically convert to paid.
3. **Create Organization**: After subscription is active, allow organization creation (handled by Organization module).
4. **Automatic Conversion**: At trial end, Stripe automatically converts to paid subscription.
5. **Manage Subscription**: Users can view or cancel their subscriptions.

## API Endpoints

### GET /subscription
Get current user's subscription details.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "id": "subscription_id",
  "status": "trialing|active|past_due|canceled|unpaid|incomplete|incomplete_expired|paused",
  "autoRenew": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /subscription/trial-eligibility
Check if the current user is eligible for a trial subscription.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "eligible": true
}
```

### POST /subscription/start-owner-trial
Start a trial subscription for becoming an organization owner. The trial will automatically convert to a paid subscription when it expires.

**Authentication**: Required (JWT)

**Response**: Same as GET /subscription

**Errors**:
- `409 Conflict`: User already has a subscription or is not eligible for trial

### DELETE /subscription/cancel
Cancel the current subscription.

**Authentication**: Required (JWT)

**Response**: Same as GET /subscription

### GET /subscription/plans
Get available subscription plans (public endpoint).

**Authentication**: Not required

**Response**:
```json
[
  {
    "id": "trial",
    "name": "Trial",
    "duration": "3 months",
    "price": 0,
    "features": ["Full access to all features", "Limited to trial period"]
  },
  {
    "id": "basic",
    "name": "Basic Plan",
    "duration": "Monthly",
    "price": 29.99,
    "features": ["Full access to all features", "Unlimited organizations", "Email support"]
  }
]
```

## Payment Methods API

### GET /payment/methods
Get user's saved payment methods.

**Authentication**: Required (JWT)

### POST /payment/methods
Add a new payment method.

**Authentication**: Required (JWT)

**Body**:
```json
{
  "paymentMethodId": "pm_stripe_payment_method_id"
}
```

### DELETE /payment/methods/:paymentMethodId
Remove a payment method.

**Authentication**: Required (JWT)

### POST /payment/methods/default
Set default payment method.

**Authentication**: Required (JWT)

**Body**:
```json
{
  "paymentMethodId": "pm_stripe_payment_method_id"
}
```

## Webhooks

### POST /webhooks/stripe
Handle Stripe webhook events for subscription updates.

**Authentication**: Stripe signature verification

**Supported Events**:
- `customer.subscription.updated` - Subscription status changes
- `customer.subscription.deleted` - Subscription cancelled
- `customer.subscription.trial_will_end` - Trial ending soon (3 days before)
- `invoice.payment_succeeded` - Payment successful (trial converted to paid)
- `invoice.payment_failed` - Payment failed (subscription may become past_due)

## Access Control

Use the `ActiveSubscriptionGuard` to protect endpoints that require an active subscription:

```typescript
@UseGuards(JwtAuthGuard, ActiveSubscriptionGuard)
@Post('organizations')
async createOrganization(@Request() req: any) {
  // Only users with active subscriptions can access this
}
```

## Environment Variables

Required environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_BASIC_PLAN_PRICE_ID=price_your_basic_plan_price_id_here
```

## Error Handling

All subscription-related errors follow standard HTTP status codes:

- `400 Bad Request`: Invalid request data or business logic violation
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Active subscription required (when using ActiveSubscriptionGuard)
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists or conflict with current state
- `500 Internal Server Error`: Server-side error
