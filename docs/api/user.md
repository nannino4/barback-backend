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
  "isEmailVerified": true,
  "profilePictureUrl": null
}
```

**Response Fields**:
- `id`: User's unique identifier
- `email`: User's email address
- `firstName`: User's first name
- `lastName`: User's last name
- `phoneNumber`: Optional phone number
- `isEmailVerified`: Whether email has been verified
- `profilePictureUrl`: Optional profile picture URL

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

**500 Internal Server Error** - DTO Transformation Failed:
```json
{
  "message": "Internal server error",
  "statusCode": 500
}
```

**Notes**:
- This endpoint uses JWT authentication via `JwtAuthGuard`
- User data is automatically transformed to exclude sensitive fields
- The response format is controlled by `OutUserDto`

---

### PUT /api/users/me
Update current user's profile information.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+393331234567",  // Optional
  "profilePictureUrl": "https://example.com/profile.jpg"  // Optional
}
```

**Validation Rules**:
- `firstName`: Optional, string, min 1 char, max 100 chars
- `lastName`: Optional, string, min 1 char, max 100 chars  
- `phoneNumber`: Optional, must be valid Italian mobile format (strict mode)
- `profilePictureUrl`: Optional, string

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+393331234567",
  "isEmailVerified": true,
  "profilePictureUrl": "https://example.com/profile.jpg"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.firstName.minLength",
    "validation.phoneNumber.invalid"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys. Common keys include:
- `validation.firstName.*` - firstName validation (required, mustBeString, minLength, maxLength)
- `validation.lastName.*` - lastName validation
- `validation.phoneNumber.*` - phoneNumber validation (required, invalid)
- `validation.profilePictureUrl.*` - profilePictureUrl validation (mustBeString)

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
  "message": "User with ID \"64a1b2c3d4e5f6789abc123\" not found",
  "error": "USER_NOT_FOUND_BY_ID",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: profile update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Validation Error:
```json
{
  "message": "Database operation failed: profile update validation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- All fields are optional - only send fields you want to update
- Email cannot be changed through this endpoint
- Password changes require separate endpoint
- Phone number validation uses Italian mobile format (IT-IT) in strict mode

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

**Validation Rules**:
- `currentPassword`: Required, non-empty string
- `newPassword`: Required, max 20 characters, must be strong password:
  - Min 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Response** (200 OK): Empty response

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.currentPassword.required",
    "validation.newPassword.weak"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys. Password validation keys:
- `validation.currentPassword.*` - currentPassword validation (required, mustBeString)
- `validation.newPassword.*` - newPassword validation (required, weak, maxLength)

**400 Bad Request** - Wrong Authentication Provider:
```json
{
  "message": "Password change is not available for google authentication. Please use the appropriate method to change your password.",
  "error": "PASSWORD_CHANGE_NOT_ALLOWED",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid JWT:
```json
{
  "message": "Invalid or expired token",
  "error": "INVALID_AUTH_TOKEN",
  "statusCode": 401
}
```

**401 Unauthorized** - Incorrect Current Password:
```json
{
  "message": "Current password is incorrect",
  "statusCode": 401
}
```

**404 Not Found** - User Not Found:
```json
{
  "message": "User with ID \"64a1b2c3d4e5f6789abc123\" not found",
  "error": "USER_NOT_FOUND_BY_ID",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: password change user lookup - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Password Hashing Failed:
```json
{
  "message": "Password hashing failed",
  "error": "PASSWORD_HASHING_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Password Update Failed:
```json
{
  "message": "Database operation failed: password update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Security Notes**:
- Only available for users with email authentication (not OAuth users)
- Requires current password verification to prevent unauthorized changes
- All active sessions remain valid after password change
- Password hashing uses bcrypt with salt rounds of 10

---

### DELETE /api/users/me
Delete current user's account.

**Authentication**: Required (JWT)

**Response** (200 OK): Empty response

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
  "message": "User with ID \"64a1b2c3d4e5f6789abc123\" not found",
  "error": "USER_NOT_FOUND_BY_ID",
  "statusCode": 404
}
```

**409 Conflict** - Deletion Blocked (Future Implementation):
```json
{
  "message": "Cannot delete user account: User is the sole owner of active organizations",
  "error": "USER_DELETION_CONFLICT",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: user deletion lookup - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Database Deletion Failed:
```json
{
  "message": "Database operation failed: user deletion - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Data Handling**:
- User account is permanently deleted from the database
- All associated data is handled according to data retention policies
- Future implementations will prevent deletion if user has business constraints

**Business Logic Constraints (Future Implementation)**:
- Cannot delete if user is the sole owner of any organizations
- Cannot delete if user has active subscriptions requiring attention
- Cannot delete if user has pending financial obligations

**Security Notes**:
- This is a destructive operation and cannot be undone
- User authentication is verified before deletion
- All user sessions become invalid after successful deletion

---

## User Data Structure

### User Profile Object (API Response)
```json
{
  "id": "string",               // MongoDB ObjectId as string
  "email": "string",            // User's email address
  "firstName": "string",        // First name (max 100 chars)
  "lastName": "string",         // Last name (max 100 chars)
  "phoneNumber": "string",      // Optional Italian mobile number
  "profilePictureUrl": "string", // Optional profile picture URL
  "isEmailVerified": "boolean"  // Email verification status
}
```

**Note**: The API response is controlled by `OutUserDto` and excludes sensitive fields like passwords, tokens, and internal timestamps.

### User Roles (Internal Schema)
- **USER**: Standard user role, default for all registered users
- **ADMIN**: Administrative role with access to admin endpoints

**Note**: User roles are not exposed in the public API responses for security reasons.

## Validation Rules

### Phone Number Format
- Must be valid Italian mobile phone format
- Examples: `+393331234567`, `+393901234567`
- Follows ITU-T E.164 international format

### Name Fields
- First and last names are optional for updates
- Maximum 100 characters each (updated from 50)
- Minimum 1 character when provided
- No special validation beyond length

### Password Requirements
- Minimum 8 characters
- Maximum 20 characters  
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Profile Picture URL
- Optional field for user profile pictures
- No specific format validation beyond string type
- Typically used for external image URLs

## Error Handling

The User Management API follows consistent error response patterns:

### Authentication Errors (401)
- Invalid or missing JWT tokens
- Incorrect current password during password changes

### Validation Errors (400)  
- DTO validation failures (handled by global validation pipes)
- Business logic violations (wrong auth provider, etc.)

### Not Found Errors (40

**403 Forbidden** - Email Not Verified:
```json
{
  "message": "Email must be verified to access this resource.",
  "error": "EMAIL_NOT_VERIFIED",
  "statusCode": 403
}
```4)
- User not found by ID (typically shouldn't happen with valid JWTs)

### Conflict Errors (409)
- Future: User deletion blocked by business constraints

### Server Errors (500)
- Database operation failures
- Password hashing failures  
- DTO transformation errors

All error responses include:
- `message`: Human-readable error description
- `error`: Machine-readable error code (when applicable)
- `statusCode`: HTTP status code
