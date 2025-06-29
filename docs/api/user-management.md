# User Management API Documentation

## Overview
The User Management module handles user profile operations, allowing users to view and update their own profiles, change passwords, and delete their accounts.

## Endpoints

### GET /api/users/me
Get current user's profile information.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+393331234567",
  "emailVerified": true,
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response Fields**:
- `id`: User's unique identifier
- `email`: User's email address
- `firstName`: User's first name
- `lastName`: User's last name
- `phoneNumber`: Optional phone number
- `emailVerified`: Whether email has been verified
- `role`: User role (USER, ADMIN)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

---

### PUT /api/users/me
Update current user's profile information.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+393331234567"  // Optional
}
```

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+393331234567",
  "emailVerified": true,
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Validation Rules**:
- `firstName`: Required, max 50 characters
- `lastName`: Required, max 50 characters
- `phoneNumber`: Optional, must be valid Italian mobile format if provided

**Notes**:
- Email cannot be changed through this endpoint
- Password changes require separate endpoint
- Partial updates are supported (only send fields to update)

---

### PUT /api/users/me/password
Change current user's password.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewStrongPass456!"
}
```

**Response** (200 OK): Empty response

**Validation Rules**:
- `currentPassword`: Required, must match user's current password
- `newPassword`: Same strength requirements as registration
  - Min 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 symbol

**Errors**:
- `400 Bad Request`: Current password incorrect or new password validation failed
- `401 Unauthorized`: Invalid authentication

**Security Notes**:
- Requires current password verification
- All active sessions remain valid after password change
- Consider implementing session invalidation for enhanced security

---

### DELETE /api/users/me
Delete current user's account.

**Authentication**: Required (JWT)

**Response** (200 OK): Empty response

**Data Handling**:
- User account is permanently deleted
- All associated data is handled according to data retention policies
- Organizations where user is the only owner may need special handling

**Errors**:
- `409 Conflict`: Cannot delete account due to active subscriptions or organization ownership

**Notes**:
- This is a destructive operation and cannot be undone
- Consider implementing a "soft delete" with grace period in production
- User should be warned about data loss before deletion

---

## User Data Structure

### User Profile Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "email": "string",        // Unique email address
  "firstName": "string",    // First name (max 50 chars)
  "lastName": "string",     // Last name (max 50 chars)
  "phoneNumber": "string",  // Optional Italian mobile number
  "emailVerified": "boolean", // Email verification status
  "role": "USER|ADMIN",     // User role
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### User Roles
- **USER**: Standard user role, default for all registered users
- **ADMIN**: Administrative role with access to admin endpoints

## Validation Rules

### Phone Number Format
- Must be valid Italian mobile phone format
- Examples: `+393331234567`, `+393901234567`
- Follows ITU-T E.164 international format

### Name Fields
- First and last names are required
- Maximum 50 characters each
- No special validation beyond length

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)

## Error Handling

**Validation Errors** (400):
```json
{
  "statusCode": 400,
  "message": [
    "firstName should not be empty",
    "phoneNumber must be a valid phone number"
  ],
  "error": "Bad Request"
}
```

**Authentication Required** (401):
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Current Password Incorrect** (400):
```json
{
  "statusCode": 400,
  "message": "Current password is incorrect",
  "error": "Bad Request"
}
```

## Security Considerations

1. **Profile Updates**: Only authenticated users can update their own profiles
2. **Password Changes**: Require current password verification
3. **Account Deletion**: Permanent and irreversible
4. **Data Privacy**: Sensitive fields are excluded from responses
5. **Rate Limiting**: Applied to prevent abuse

## Integration Notes

### Frontend Integration
- Use `/users/me` to populate user profile forms
- Implement proper form validation matching API requirements
- Handle password change separately from profile updates
- Confirm account deletion with user before API call

### Mobile App Integration
- Profile endpoint suitable for account settings screens
- Phone number validation should match backend format
- Consider offline caching of user profile data
