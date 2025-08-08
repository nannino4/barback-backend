# Invitation Management API Documentation

## Overview
The Invitation Management module handles organization invitations, allowing owners and managers to invite users via email. The system supports both authenticated and anonymous invitation acceptance, with email notifications and token-based security.

## Invitation Workflow

1. **Send Invitation**: Owner/Manager invites user by email
2. **Email Notification**: Invited user receives email with invitation link
3. **Accept/Decline**: User can accept or decline via link or API
4. **Join Organization**: Accepted invitations create organization membership

## Endpoints for Organization Owners/Managers

### POST /api/orgs/:orgId/invitations
Send an invitation to join the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Request Body**:
```json
{
  "invitedEmail": "newuser@example.com",
  "role": "STAFF"
}
```

**Validation Rules**:
- `invitedEmail`: Must be valid email format, required
- `role`: Must be valid organization role (STAFF, MANAGER), cannot be OWNER

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "invitedEmail": "newuser@example.com",
  "role": "STAFF",
  "status": "PENDING",
  "invitedBy": {
    "id": "64a1b2c3d4e5f6789abc456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "organization": {
    "id": "64a1b2c3d4e5f6789def789",
    "name": "My Bar Organization"
  },
    "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-08T00:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token",
  "error": "Not Found",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation lookup by token - Query timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Purpose**:
- Allows frontend to display invitation details before requiring user to register/login
- Used to show organization name and inviter information on invitation pages

**Notes**:
- No authentication required - token acts as authorization
- Returns minimal, safe information only
- Used for preview before user decides to register/login

---

### POST /api/public/invitations/accept/:token
Accept invitation without authentication (marks as pending registration).

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email link (required, non-empty string)

**Response** (200 OK):
```json
{
  "message": "Invitation accepted. Please complete registration to join the organization."
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token",
  "error": "INVALID_INVITATION_TOKEN", 
  "statusCode": 400
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation acceptance - Update failed",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Effects**:
- Marks invitation as "accepted pending registration"
- User must still register/login to complete the process
- Invitation is reserved for the user during registration

**Notes**:
- This endpoint is for anonymous users who want to accept before registering
- Final organization membership is created when user completes registration
- Token becomes invalid after use
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "invitedEmail must be an email",
    "role must be one of the following values: STAFF, MANAGER"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Cannot Invite as Owner:
```json
{
  "message": "Cannot invite users as owners. Organizations can only have one owner.",
  "error": "CANNOT_INVITE_AS_OWNER",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Role:
```json
{
  "message": "Insufficient role for this operation",
  "error": "INSUFFICIENT_ROLE",
  "statusCode": 403
}
```

**404 Not Found** - Organization Not Found:
```json
{
  "message": "Organization not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**409 Conflict** - User Already Member:
```json
{
  "message": "User with email \"newuser@example.com\" is already a member of this organization",
  "error": "USER_ALREADY_MEMBER",
  "statusCode": 409
}
```

**409 Conflict** - Invitation Already Exists:
```json
{
  "message": "A pending invitation already exists for email \"newuser@example.com\"",
  "error": "INVITATION_ALREADY_EXISTS",
  "statusCode": 409
}
```

**500 Internal Server Error** - Email Sending Failed:
```json
{
  "message": "Failed to send invitation email to \"newuser@example.com\"",
  "error": "INVITATION_EMAIL_FAILED",
  "details": "SMTP connection failed",
  "statusCode": 500
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation creation - Connection timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Invitation tokens are valid for 7 days
- Email sending failures will delete the created invitation to maintain data consistency
- Only users with OWNER or MANAGER roles can send invitations
- Users cannot be invited as OWNER through this endpoint

---

### GET /api/orgs/:orgId/invitations
Get all pending invitations for the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "invitedEmail": "user1@example.com",
    "role": "STAFF",
    "status": "PENDING",
    "invitedBy": {
      "id": "64a1b2c3d4e5f6789abc456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "invitedEmail": "user2@example.com",
    "role": "MANAGER",
    "status": "PENDING",
    "invitedBy": {
      "id": "64a1b2c3d4e5f6789abc456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-02T00:00:00.000Z",
    "expiresAt": "2024-01-09T00:00:00.000Z"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": "Invalid ObjectId format",
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Role:
```json
{
  "message": "Insufficient role for this operation",
  "error": "INSUFFICIENT_ROLE", 
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation lookup by organization - Connection lost",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Only returns pending invitations (not accepted, declined, or revoked)
- Results are sorted by creation date (newest first)
- Empty array returned if no pending invitations exist

---

### DELETE /api/orgs/:orgId/invitations/:invitationId
Revoke a pending invitation.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `invitationId` (path): Invitation ID (must be valid ObjectId)

**Response** (200 OK):
```json
{
  "message": "Invitation revoked successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid ObjectId Format:
```json
{
  "message": "Invalid ObjectId format",
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Role:
```json
{
  "message": "Insufficient role for this operation",
  "error": "INSUFFICIENT_ROLE",
  "statusCode": 403
}
```

**404 Not Found** - Invitation Not Found:
```json
{
  "message": "Invitation with identifier \"64a1b2c3d4e5f6789abc123\" not found",
  "error": "INVITATION_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation revocation - Transaction failed",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Only pending invitations can be revoked
- Already processed invitations (accepted, declined, expired) cannot be revoked
- Revoked invitations cannot be restored

---

## Endpoints for Invited Users

### GET /api/invites
Get current user's pending invitations.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "role": "STAFF",
    "status": "PENDING",
    "organization": {
      "id": "64a1b2c3d4e5f6789def789",
      "name": "My Bar Organization"
    },
    "invitedBy": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
]
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
  "message": "Database operation failed: invitation lookup by email - Connection timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Shows invitations for the authenticated user's email address only
- Only returns pending, non-expired invitations
- Excludes sensitive information (inviter's email, internal IDs)

---

### POST /api/invites/accept/:token
Accept an invitation (authenticated users).

**Authentication**: Required (JWT)

**Parameters**:
- `token` (path): Invitation token from email link (required, non-empty string)

**Response** (200 OK):
```json
{
  "message": "Invitation accepted successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token",
  "error": "INVALID_INVITATION_TOKEN",
  "statusCode": 400
}
```

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
  "message": "Database operation failed: invitation acceptance - Transaction timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Effects**:
- Creates user-organization relationship with specified role
- Marks invitation as accepted
- User gains immediate access to organization resources
- Invitation token becomes invalid

**Notes**:
- Token is single-use and becomes invalid after acceptance
- User must be authenticated to accept invitations
- If user is already a member, invitation is marked as accepted without creating duplicate relationship

---

### POST /api/invites/decline/:token
Decline an invitation (authenticated users).

**Authentication**: Required (JWT)

**Parameters**:
- `token` (path): Invitation token from email link (required, non-empty string)

**Response** (200 OK):
```json
{
  "message": "Invitation declined successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token", 
  "error": "INVALID_INVITATION_TOKEN",
  "statusCode": 400
}
```

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
  "message": "Database operation failed: invitation decline - Update operation failed",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Effects**:
- Marks invitation as permanently declined
- User will not be added to organization
- Invitation token becomes invalid

**Notes**:
- Token is single-use and becomes invalid after declining
- Declined invitations cannot be re-accepted
- User must be authenticated to decline invitations

---

## Public Endpoints (Anonymous Users)

### GET /api/public/invitations/details/:token
Get invitation details without authentication.

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email link (required, non-empty string)

**Response** (200 OK):
```json
{
  "organization": {
    "name": "My Bar Organization"
  },
  "role": "STAFF",
  "invitedBy": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "expiresAt": "2024-01-08T00:00:00.000Z"
}
```

**Use Case**:
- Display invitation details on signup/login page
- Show organization name and role before user commits

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

### POST /public/invitations/accept/:token
Accept invitation without prior authentication.

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "StrongPass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+393331234567"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "64a1b2c3d4e5f6789abc999",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "organization": {
    "id": "64a1b2c3d4e5f6789def789",
    "name": "My Bar Organization"
  }
}
```

**Effects**:
- Creates new user account (if email doesn't exist)
- Accepts invitation and creates organization membership
- Returns authentication tokens
- User can immediately access organization

**Validation**:
- Same validation rules as user registration
- Email must match invitation email

**Errors**:
- `400 Bad Request`: Invalid token, validation errors, or email mismatch
- `409 Conflict`: User already exists with different details

---

### POST /api/public/invitations/decline/:token
Decline invitation without authentication.

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email link (required, non-empty string)

**Response** (200 OK):
```json
{
  "message": "Invitation declined successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token",
  "error": "INVALID_INVITATION_TOKEN",
  "statusCode": 400
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation decline - Update operation failed",
  "error": "DATABASE_OPERATION_FAILED", 
  "statusCode": 500
}
```

**Effects**:
- Permanently marks invitation as declined
- No user account created or organization membership established
- Invitation token becomes invalid

**Notes**:
- This is a permanent action - declined invitations cannot be re-accepted
- No authentication required - token acts as authorization
- Used when anonymous users want to decline without registering

---

## Data Models

### Invitation Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "email": "string",        // Invited email address
  "orgRole": "MANAGER|STAFF", // Role in organization
  "status": "PENDING|ACCEPTED|DECLINED|REVOKED|EXPIRED", // Invitation status
  "invitedBy": {            // User who sent invitation
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string"
  },
  "organization": {         // Organization details
    "id": "string",
    "name": "string"
  },
  "createdAt": "string",    // ISO timestamp
  "expiresAt": "string"     // ISO timestamp (7 days from creation)
}
```

### Public Invitation Object (limited fields)
```json
{
  "id": "string",
  "orgRole": "MANAGER|STAFF",
  "status": "PENDING",
  "organization": {
    "id": "string",
    "name": "string"
  },
  "invitedBy": {
    "firstName": "string",
    "lastName": "string"
  },
  "createdAt": "string",
  "expiresAt": "string"
}
```