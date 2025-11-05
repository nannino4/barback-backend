# Validation Error Translations

## Overview

This document describes the validation error translation system that has been implemented to provide localized, user-friendly error messages when backend validation fails.

### API Error Response Format

When validation fails, the backend returns a 400 Bad Request response with this structure:

```json
{
  "message": [
    "validation.email.invalid",
    "validation.password.weak"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: The `message` field contains an array of translation keys, not human-readable messages.

## Available Validation Keys

### Authentication & User Fields

#### Email
- `validation.email.required` - Email is required
- `validation.email.invalid` - Invalid email format
- `validation.email.maxLength` - Email too long (>255 chars)

#### Password
- `validation.password.required` - Password is required
- `validation.password.mustBeString` - Must be text
- `validation.password.minLength` - Too short (<8 chars)
- `validation.password.maxLength` - Too long (>20 chars)
- `validation.password.weak` - Doesn't meet strength requirements

#### New Password
- `validation.newPassword.required`
- `validation.newPassword.maxLength`
- `validation.newPassword.weak`

#### Current Password
- `validation.currentPassword.required`
- `validation.currentPassword.mustBeString`

#### First Name
- `validation.firstName.required`
- `validation.firstName.mustBeString`
- `validation.firstName.minLength`
- `validation.firstName.maxLength`

#### Last Name
- `validation.lastName.required`
- `validation.lastName.mustBeString`
- `validation.lastName.minLength`
- `validation.lastName.maxLength`

#### Phone Number
- `validation.phoneNumber.required`
- `validation.phoneNumber.invalid` - Not valid international mobile phone format (E.164)

#### Profile Picture URL
- `validation.profilePictureUrl.mustBeString`

#### Token
- `validation.token.required`
- `validation.token.mustBeString`

#### Refresh Token
- `validation.refreshToken.invalidJWT`

#### OAuth Code
- `validation.code.required`
- `validation.code.mustBeString`

#### State Parameter
- `validation.state.mustBeString`

### Organization Fields

#### Name
- `validation.org.name.required`
- `validation.org.name.mustBeString`

#### Subscription ID
- `validation.org.subscriptionId.required`
- `validation.org.subscriptionId.invalidObjectId`

#### Settings
- `validation.org.settings.required`
- `validation.org.settings.mustBeObject`
- `validation.org.settings.invalid`

#### Role
- `validation.org.role.invalid`

#### Currency
- `validation.org.currency.mustBeString`
- `validation.org.currency.exactLength`
- `validation.org.currency.invalidFormat`

### Product Fields

#### Name
- `validation.product.name.required`
- `validation.product.name.mustBeString`

#### Description
- `validation.product.description.required`
- `validation.product.description.mustBeString`

#### Brand
- `validation.product.brand.required`
- `validation.product.brand.mustBeString`

#### Default Unit
- `validation.product.defaultUnit.required`
- `validation.product.defaultUnit.mustBeString`

#### Default Purchase Price
- `validation.product.defaultPurchasePrice.mustBeNumber`
- `validation.product.defaultPurchasePrice.min`

#### Current Quantity
- `validation.product.currentQuantity.mustBeNumber`
- `validation.product.currentQuantity.min`

#### Category IDs
- `validation.product.categoryIds.mustBeArray`
- `validation.product.categoryIds.invalidObjectId`

#### Image URL
- `validation.product.imageUrl.invalidUrl`

### Category Fields

#### Name
- `validation.category.name.required`
- `validation.category.name.mustBeString`

#### Description
- `validation.category.description.required`
- `validation.category.description.mustBeString`

#### Parent ID
- `validation.category.parentId.invalidObjectId`

### Inventory Fields

#### Type
- `validation.inventory.type.invalid`

#### Quantity
- `validation.inventory.quantity.mustBeNumber`

#### Note
- `validation.inventory.note.required`
- `validation.inventory.note.mustBeString`

### Invitation Fields

#### Invited Email
- `validation.invitation.invitedEmail.required`
- `validation.invitation.invitedEmail.invalid`

#### Role
- `validation.invitation.role.required`
- `validation.invitation.role.invalid`

### Subscription Fields

#### Status
- `validation.subscription.status.required`
- `validation.subscription.status.invalid`

#### Auto Renew
- `validation.subscription.autoRenew.required`
- `validation.subscription.autoRenew.mustBeBoolean`

#### Billing Interval
- `validation.subscription.billingInterval.invalid`

#### Is Trial
- `validation.subscription.isTrial.mustBeBoolean`

#### Payment Method ID
- `validation.subscription.paymentMethodId.mustBeString`

### Admin Fields

#### Is Active
- `validation.admin.isActive.mustBeBoolean`

#### Role
- `validation.admin.role.invalid`
