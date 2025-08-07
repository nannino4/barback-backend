# Subscription Management API Documentation

## Overview
The Subscription Management module handles user subscriptions for organization ownership, payment methods, and Stripe integration. Users get a 3-month trial that automatically converts to a paid plan.

## Subscription Workflow

1. **Check Trial Eligibility**: Verify if user can start a trial
2. **Start Trial**: Create 3-month trial subscription
3. **Create Organization**: Use active subscription to create organization
4. **Auto-Conversion**: Trial converts to paid subscription automatically
5. **Manage Subscription**: View, update, or cancel subscription

## Subscription Endpoints

### GET /api/subscription
Get current user's subscription details.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "status": "trialing",
  "autoRenew": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response** (200 OK) - No subscription:
```json
null
```

**Error Responses**:

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
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

**Subscription Status Values**:
- `trialing`: User is in trial period
- `active`: Paid subscription is active
- `past_due`: Payment failed, subscription may be suspended
- `canceled`: Subscription has been cancelled
- `unpaid`: Payment required
- `incomplete`: Subscription setup incomplete
- `incomplete_expired`: Setup expired
- `paused`: Subscription temporarily paused

---

### GET /api/subscription/trial-eligibility
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

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
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

### POST /api/subscription/start-owner-trial
Start a trial subscription for becoming an organization owner.

**Authentication**: Required (JWT)

**Request Body**: Empty

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "status": "trialing",
  "autoRenew": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
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
- Creates Stripe customer and subscription
- Trial period is 3 months
- Automatically converts to paid plan when trial ends
- Required before creating an organization
- If database save fails, Stripe subscription is automatically cancelled for cleanup

---

### DELETE /api/subscription/cancel
Cancel the current subscription.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "status": "canceled",
  "autoRenew": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Error Responses**:

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**404 Not Found** - Subscription Not Found:
```json
{
  "message": "Subscription not found for user: [user_id]",
  "error": "SUBSCRIPTION_NOT_FOUND",
  "statusCode": 404
}
```

**400 Bad Request** - Invalid Operation:
```json
{
  "message": "Cannot cancel subscription with status: canceled",
  "error": "INVALID_SUBSCRIPTION_OPERATION",
  "statusCode": 400
}
```

**400 Bad Request** - Stripe Subscription Operation Failed:
```json
{
  "message": "Stripe subscription operation failed: subscription cancellation - [details]",
  "error": "STRIPE_SUBSCRIPTION_FAILED",
  "statusCode": 400
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: subscription status update - [details]",
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

**Effects**:
- Cancels subscription with Stripe
- Access to organization features continues until period end
- No further billing occurs
- Cannot be undone (user must start new subscription)

**Notes**:
- If Stripe subscription is not found, local cancellation proceeds
- Already cancelled subscriptions return 400 error

---

### GET /api/subscription/plans
Get available subscription plans (public endpoint).

**Authentication**: Not required

**Response** (200 OK):
```json
[
  {
    "id": "trial",
    "name": "Trial",
    "duration": "3 months",
    "price": 0,
    "features": [
      "Full access to all features",
      "Automatically converts to Basic Plan at trial end"
    ]
  },
  {
    "id": "basic",
    "name": "Basic Plan",
    "duration": "Monthly",
    "price": 29.99,
    "features": [
      "Full access to all features",
      "Unlimited organizations",
      "Email support"
    ]
  }
]
```

**Error Responses**:

**500 Internal Server Error** - General Error:
```json
{
  "message": "Stripe API operation failed: subscription plans retrieval - Failed to retrieve subscription plans",
  "error": "STRIPE_API_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Returns static plan configurations
- Errors are rare since data is hardcoded

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

**Response** (204 No Content): Empty response

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

## Data Models

### Subscription Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "status": "string",       // Subscription status
  "autoRenew": "boolean",   // Auto-renewal enabled
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### Payment Method Object
```json
{
  "id": "string",           // Stripe payment method ID
  "type": "card",           // Payment method type
  "card": {
    "brand": "string",      // Card brand (visa, mastercard, etc.)
    "last4": "string",      // Last 4 digits
    "expMonth": "number",   // Expiration month
    "expYear": "number"     // Expiration year
  },
  "isDefault": "boolean",   // Is default payment method
  "createdAt": "string"     // ISO timestamp
}
```

### Subscription Plan Object
```json
{
  "id": "string",           // Plan identifier
  "name": "string",         // Display name
  "duration": "string",     // Billing frequency
  "price": "number",        // Price in USD
  "features": ["string"]    // List of features
}
```

## Error Handling

### Common Error Responses

**Authentication Error** (401):
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**Subscription Not Found** (404):
```json
{
  "message": "Subscription not found for user: [user_id]",
  "error": "SUBSCRIPTION_NOT_FOUND",
  "statusCode": 404
}
```

**User Not Found** (404):
```json
{
  "message": "User with ID \"[user_id]\" not found",
  "error": "USER_NOT_FOUND_BY_ID",
  "statusCode": 404
}
```

**Not Eligible for Trial** (409):
```json
{
  "message": "User is not eligible for trial subscription: [reason]",
  "error": "NOT_ELIGIBLE_FOR_TRIAL",
  "statusCode": 409
}
```

**Invalid Subscription Operation** (400):
```json
{
  "message": "Cannot [operation] subscription with status: [status]",
  "error": "INVALID_SUBSCRIPTION_OPERATION",
  "statusCode": 400
}
```

**Stripe Customer Error** (400):
```json
{
  "message": "Stripe customer operation failed: [operation] - [details]",
  "error": "STRIPE_CUSTOMER_FAILED",
  "statusCode": 400
}
```

**Stripe Subscription Error** (400):
```json
{
  "message": "Stripe subscription operation failed: [operation] - [details]",
  "error": "STRIPE_SUBSCRIPTION_FAILED",
  "statusCode": 400
}
```

**Stripe Configuration Error** (500):
```json
{
  "message": "Stripe configuration error: [details]",
  "error": "STRIPE_CONFIGURATION_ERROR",
  "statusCode": 500
}
```

**Database Operation Error** (500):
```json
{
  "message": "Database operation failed: [operation] - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Stripe Service Unavailable** (503):
```json
{
  "message": "Stripe service is temporarily unavailable. Please try again later.",
  "error": "STRIPE_SERVICE_UNAVAILABLE",
  "statusCode": 503
}
```

### Error Handling Notes

1. **Stripe Errors**: All Stripe API failures are properly categorized and include specific error details
2. **Database Errors**: Database operations are wrapped with proper error handling and cleanup
3. **Validation Errors**: Business logic validation prevents invalid operations
4. **Retry Logic**: 503 errors indicate temporary issues that can be retried
5. **Cleanup**: Failed operations include automatic cleanup (e.g., cancelling Stripe subscriptions on database save failures)
6. **Logging**: All errors are logged with full context for debugging
7. **Security**: Error messages don't expose sensitive internal information

## Integration Requirements

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PLAN_PRICE_ID=price_...
```

### Frontend Integration Steps

1. **Check Trial Eligibility**:
   ```javascript
   const response = await fetch('/api/subscription/trial-eligibility');
   const { eligible } = await response.json();
   ```

2. **Start Trial Subscription**:
   ```javascript
   const response = await fetch('/api/subscription/start-owner-trial', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

3. **Payment Method Setup** (using Stripe Elements):
   ```javascript
   // After Stripe Elements confirms payment method
   const response = await fetch('/api/payment/methods', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       paymentMethodId: result.paymentMethod.id,
       setAsDefault: true
     })
   });
   ```

## Security Notes

1. **Stripe Integration**: All payment processing through Stripe
2. **Webhook Security**: Stripe signature verification required
3. **Access Control**: Subscription required for organization creation
4. **Data Protection**: Payment data stored only in Stripe
5. **Trial Limits**: One trial per user maximum

## Business Rules

1. **Trial Period**: 3 months for new organization owners
2. **Auto-Conversion**: Trial automatically converts to paid plan
3. **Pricing**: $29.99/month for Basic Plan
4. **Cancellation**: Immediate cancellation, access until period end
5. **Organization Ownership**: Requires active subscription
