# Admin Management API Documentation

## Overview
The Admin Management module provides administrative operations for managing users across the entire platform. These endpoints are restricted to users with ADMIN role and provide oversight capabilities for platform administration.

## Features
- User list and search functionality
- User profile management
- User role management
- Administrative oversight
- Platform-wide user operations

## Endpoints

### GET /api/admin/users
Get list of all users in the platform.

**Authentication**: Required (JWT) + email verified
**Authorization**: ADMIN role only

**Query Parameters**:
- `limit` (optional): Number of users to return (default: 10, max: 100)
- `offset` (optional): Number of users to skip (default: 0)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "email": "user1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+393331234567",
    "emailVerified": true,
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "email": "admin@example.com",
    "firstName": "Jane",
    "lastName": "Admin",
    "phoneNumber": "+393337654321",
    "emailVerified": true,
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Pagination Examples**:
- `GET /api/admin/users` - First 10 users
- `GET /api/admin/users?limit=25&offset=0` - First 25 users
- `GET /api/admin/users?limit=10&offset=20` - Users 21-30

**Notes**:
- Results are ordered by creation date (newest first)
- Limited to prevent excessive data transfer
- Includes all user fields including sensitive information (admin access)

---

### GET /api/admin/users/:id
Get detailed information about a specific user.

**Authentication**: Required (JWT) + email verified
**Authorization**: ADMIN role only

**Parameters**:
- `id` (path): User ID (MongoDB ObjectId)

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

**Errors**:
- `404 Not Found`: User with specified ID does not exist
- `400 Bad Request`: Invalid ObjectId format

---

### PUT /api/admin/users/:id/profile
Update a user's profile information (admin override).

**Authentication**: Required (JWT) + email verified
**Authorization**: ADMIN role only

**Parameters**:
- `id` (path): User ID (MongoDB ObjectId)

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+393331234567"
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
- `firstName`: Optional, max 50 characters if provided
- `lastName`: Optional, max 50 characters if provided
- `phoneNumber`: Optional, must be valid international mobile phone format (E.164) if provided

**Notes**:
- Partial updates supported - only send fields to update
- Email cannot be changed through this endpoint
- Password changes require separate process
- User will not be notified of admin changes

**Errors**:
- `404 Not Found`: User not found
- `400 Bad Request`: Validation errors

---

### PUT /api/admin/users/:id/role
Update a user's role (promote/demote).

**Authentication**: Required (JWT) + email verified
**Authorization**: ADMIN role only

**Parameters**:
- `id` (path): User ID (MongoDB ObjectId)

**Request Body**:
```json
{
  "role": "ADMIN"
}
```

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+393331234567",
  "emailVerified": true,
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Valid Roles**:
- `USER`: Standard user role
- `ADMIN`: Administrative role with platform access

**Business Rules**:
- Cannot change your own role (prevents self-lockout)
- Role changes take effect immediately
- User may need to re-authenticate to access new privileges

**Errors**:
- `400 Bad Request`: Invalid role or attempting to change own role
- `404 Not Found`: User not found

---

## Data Models

### Admin User Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "email": "string",        // User email address
  "firstName": "string",    // First name (max 50 chars)
  "lastName": "string",     // Last name (max 50 chars)
  "phoneNumber": "string",  // Optional international mobile number (E.164)
  "emailVerified": "boolean", // Email verification status
  "role": "USER|ADMIN",     // User role
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### User Roles
- **USER**: Standard application user
  - Can create organizations with subscriptions
  - Access to organization features based on membership
  - Cannot access admin endpoints

- **ADMIN**: Platform administrator
  - Full access to admin endpoints
  - Can view and modify all user accounts
  - Cannot access organization features unless also a member
  - Should have separate user account for organization access

## Role-Based Access Control

### Admin Access Matrix

| Action | ADMIN | USER |
|--------|--------|-------|
| View all users | ✅ | ❌ |
| View user details | ✅ | ❌ |
| Update user profiles | ✅ | ❌ |
| Change user roles | ✅ | ❌ |
| Platform oversight | ✅ | ❌ |

### Security Notes
- Admin role provides platform-wide access
- Admins cannot modify their own role (prevents lockout)
- All admin actions should be logged for audit purposes
- Admin access does not automatically grant organization membership

## Business Rules

1. **Role Hierarchy**: ADMIN > USER
2. **Self-Protection**: Admins cannot change their own role
3. **Immediate Effect**: Role changes take effect immediately
4. **Platform Scope**: Admin access is platform-wide, not organization-specific
5. **Audit Trail**: All admin actions should be logged
6. **Separation of Concerns**: Admin role separate from organization membership

## Validation Rules

### Profile Update Validation
- Same validation rules as user self-profile updates
- Phone number must be valid Italian format
- Names limited to 50 characters each

### Role Update Validation
- Must be valid role value (USER, ADMIN)
- Cannot change own role
- Case-sensitive role values

### ID Validation
- Must be valid MongoDB ObjectId format
- User must exist in the database

## Error Handling

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

**Access Denied** (403):
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

**User Not Found** (404):
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Invalid Role Change** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot change your own role",
  "error": "Bad Request"
}
```

**Validation Error** (400):
```json
{
  "statusCode": 400,
  "message": [
    "validation.phoneNumber.invalid"
  ],
  "error": "Bad Request"
}
```

> **Note:** Error messages are returned as translation keys (e.g., `validation.phoneNumber.invalid`). The frontend should translate these keys to user-friendly messages in the appropriate language.
