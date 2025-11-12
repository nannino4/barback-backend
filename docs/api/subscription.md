# Subscription Management API Documentation

## Overview
The Subscription Management module handles user subscriptions for organization ownership using Stripe. Users can have multiple subscriptions - one per organization they want to own. Only the first subscription for each user includes a 3-month trial period.

**Important**: Both trial and paid subscriptions collect payment details upfront. This follows Stripe best practices for seamless trial-to-paid conversion and reduces churn.

## Subscription Workflow

1. **Check Trial Eligibility**: Verify if user can start a trial (only available for users with no existing subscriptions)
2. **Setup Subscription Payment**: Create Stripe subscription and receive `stripeSubscriptionId` + `clientSecret`
   - **Note**: Subscription is NOT saved to local database yet
3. **Collect Payment Details**: Use Stripe Payment Element with `clientSecret` (for both trial and paid)
4. **Confirm Payment**: User confirms payment method via Stripe
5. **Webhook Confirmation**: Stripe webhook (`invoice.payment_succeeded`) confirms payment
   - **At this point**: Subscription is saved to local database
6. **Create Organization**: Use active/trialing subscription to create organization
7. **Auto-Conversion**: Trial converts to paid subscription automatically after 90 days

## Architecture Notes

- **Subscriptions are created locally ONLY after webhook confirmation**
- This prevents incomplete subscriptions from accumulating in the database
- No cleanup needed if payment fails - subscription simply doesn't exist locally
- Stripe is the single source of truth for subscription creation

## Subscription Endpoints

### GET /api/subscriptions/trial-eligibility
Check if current user is eligible for a trial subscription.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
{
  "eligible": true
}
```

**Response** (200 OK) - Not eligible:
```json
{
  "eligible": false
}
```

**Error Responses**:

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: subscription lookup by user ID - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Eligibility Rules**:
- User has never had a subscription before
- User is not currently an organization owner
- User has not used a trial subscription previously

---

### POST /api/subscriptions
Setup subscription for payment collection.

**Important**: This endpoint creates a Stripe subscription with `payment_behavior='default_incomplete'` and returns a `clientSecret` for Stripe Payment Element. The subscription is NOT saved to the local database yet - it will be saved by webhook after payment confirmation.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "billingInterval": "MONTHLY",  // optional, defaults to "MONTHLY". Options: "MONTHLY", "YEARLY"
  "isTrial": true                // optional, defaults to false. When true creates trial subscription
}
```

**Behavior**:
- If `isTrial` is `true`, trial eligibility is validated. Ineligible users receive 409.
- Trial subscriptions have 90-day trial period with $0 first invoice
- Both trial and paid subscriptions collect payment method upfront
- Creates Stripe subscription with `incomplete` status
- Returns `stripeSubscriptionId` and `clientSecret` for Payment Element
- **Local subscription record NOT created yet** - will be created by webhook after payment

**Response** (201 Created):
```json
{
  "stripeSubscriptionId": "sub_1234567890abcdef",
  "clientSecret": "pi_xxxxx_secret_yyyyy"
}
```

**Note**: Response does NOT include `id`, `status`, `createdAt`, or `updatedAt` because the local subscription doesn't exist yet. These fields will be available after webhook confirms payment and creates the local record.

**Error Responses**:

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```

**404 Not Found** - User Not Found:
```json
{
  "message": "User with ID \"[user_id]\" not found",
  "error": "USER_NOT_FOUND_BY_ID",
  "statusCode": 404
}
```

**409 Conflict** - Not Eligible for Trial:
```json
{
  "message": "User is not eligible for trial subscription: User already has a subscription or is not eligible for trial",
  "error": "NOT_ELIGIBLE_FOR_TRIAL",
  "statusCode": 409
}
```

**500 Internal Server Error** - Subscription Setup Failed:
```json
{
  "message": "Failed to setup subscription for payment: Client secret not available from Stripe",
  "error": "SUBSCRIPTION_SETUP_FAILED",
  "statusCode": 500
}
```

**400 Bad Request** - Stripe Customer Operation Failed:
```json
{
  "message": "Stripe customer operation failed: customer creation - [details]",
  "error": "STRIPE_CUSTOMER_FAILED",
  "statusCode": 400
}
```

**400 Bad Request** - Stripe Subscription Operation Failed:
```json
{
  "message": "Stripe subscription operation failed: subscription creation - [details]",
  "error": "STRIPE_SUBSCRIPTION_FAILED",
  "statusCode": 400
}
```

**500 Internal Server Error** - Stripe Configuration Error:
```json
{
  "message": "Stripe configuration error: STRIPE_BASIC_MONTHLY_PRICE_ID is not configured",
  "error": "STRIPE_CONFIGURATION_ERROR",
  "statusCode": 500
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: subscription creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Note**: Database errors at this stage are rare since we don't save locally yet. This would only occur during customer creation/update.

**503 Service Unavailable** - Stripe Service Unavailable:
```json
{
  "message": "Stripe service is temporarily unavailable. Please try again later.",
  "error": "STRIPE_SERVICE_UNAVAILABLE",
  "statusCode": 503
}
```

**Implementation Notes**:
- Creates Stripe customer if not exists
- Creates Stripe subscription with `payment_behavior='default_incomplete'`
- Expands `latest_invoice.confirmation_secret` to retrieve `clientSecret`
- Returns `stripeSubscriptionId` and `clientSecret` for Payment Element
- **Does NOT save to local database yet**
- Local subscription record will be created by webhook after payment confirmation
- Both trial and paid subscriptions require payment method collection
- Trial has 90-day period before converting to paid
- If `clientSecret` is missing, Stripe subscription is cancelled immediately

---

### GET /api/subscriptions
Get all subscriptions for the current user.

**Note**: Only returns subscriptions that have been confirmed and saved to the local database (i.e., subscriptions that completed payment). Subscriptions awaiting payment confirmation are not returned.
  "error": "STRIPE_SUBSCRIPTION_FAILED",
  "statusCode": 400
}
```

**500 Internal Server Error** - Stripe Configuration Error:
```json
{
  "message": "Stripe configuration error: STRIPE_BASIC_PLAN_PRICE_ID is not configured",
  "error": "STRIPE_CONFIGURATION_ERROR",
  "statusCode": 500
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: subscription creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**503 Service Unavailable** - Stripe Service Unavailable:
```json
{
  "message": "Stripe service is temporarily unavailable. Please try again later.",
  "error": "STRIPE_SERVICE_UNAVAILABLE",
  "statusCode": 503
}
```

**Notes**:
- Creates Stripe customer and subscription (trial or paid)
- Trial period is 3 months and only available on the first subscription for a user
- Automatically converts to paid plan when trial ends
- Required before creating an organization
- If database save fails, Stripe subscription is automatically cancelled for cleanup
- Single endpoint simplifies client logic vs separate trial/paid endpoints

---

// (Removed separate /start-paid endpoint in favor of unified POST /api/subscriptions)

---

### GET /api/subscriptions
Get all subscriptions for the current user.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "status": "canceled",
    "autoRenew": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "status": "active",
    "autoRenew": true,
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
]
```

**Error Responses**:

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: subscription lookup by user ID - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Returns all subscriptions ordered by creation date (newest first)
- Empty array if user has no subscriptions
- Includes both active and canceled subscriptions

---

## Payment Methods API

### GET /api/payment/methods
Get user's payment methods.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
[
  {
    "id": "pm_1234567890",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025
    },
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /api/payment/methods
Add a new payment method.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "paymentMethodId": "pm_1234567890",
  "setAsDefault": true
}
```

**Validation Rules**:
- `paymentMethodId`: Required, must be a string (Stripe payment method ID)
- `setAsDefault`: Optional, boolean, defaults to false

**Response** (201 Created):
```json
{
  "id": "pm_1234567890",
  "type": "card",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025
  },
  "isDefault": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.subscription.paymentMethodId.mustBeString"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys.

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```

**400 Bad Request** - Stripe Payment Method Failed:
```json
{
  "message": "Stripe payment method operation failed: attach payment method - [details]",
  "error": "STRIPE_PAYMENT_METHOD_FAILED",
  "statusCode": 400
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: payment method save - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- `paymentMethodId` comes from Stripe Elements frontend integration
- Payment method is attached to the user's Stripe customer

---

### DELETE /api/payment/methods/:paymentMethodId
Remove a payment method.

**Authentication**: Required (JWT)

**Parameters**:
- `paymentMethodId` (path): Stripe payment method ID

**Response** (204 No Content): Empty response

**Errors**:
- `400 Bad Request`: Cannot remove default payment method (set another as default first)
- `404 Not Found`: Payment method not found or doesn't belong to user

---

### POST /api/payment/methods/default
Set default payment method.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "paymentMethodId": "pm_1234567890"
}
```

**Validation Rules**:
- `paymentMethodId`: Required, must be a string (Stripe payment method ID)

**Response** (204 No Content): Empty response

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.subscription.paymentMethodId.mustBeString"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys.

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```

**404 Not Found** - Payment Method Not Found:
```json
{
  "message": "Payment method not found or doesn't belong to user",
  "error": "Not Found",
  "statusCode": 404
}
```

**Errors**:
- `404 Not Found`: Payment method not found or doesn't belong to user

---

## Webhooks

### POST /webhooks/stripe
Handle Stripe webhook events (internal use).

**Authentication**: Stripe signature verification

**Supported Events**:
- `customer.subscription.updated`: Subscription status changes
- `customer.subscription.deleted`: Subscription cancelled
- `customer.subscription.trial_will_end`: Trial ending soon (3 days before)
- `invoice.payment_succeeded`: Payment successful (trial converted to paid)
- `invoice.payment_failed`: Payment failed (subscription may become past_due)

**Note**: This endpoint is for Stripe webhooks only, not for frontend use.

---

## Business Rules

1. **Multiple Subscriptions**: Users can have multiple subscriptions (one per organization)
2. **Trial Eligibility**: Only first subscription per user gets trial period
3. **Auto-Conversion**: Trial automatically converts to paid plan
4. **Cancellation**: Immediate cancellation, access until period end
5. **Organization Ownership**: Each organization requires its own active subscription
