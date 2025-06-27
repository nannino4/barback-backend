# Invitation Management API Documentation

## Overview
The Invitation Management module handles organization invitations, allowing owners and managers to invite users via email. The system supports both authenticated and anonymous invitation acceptance, with email notifications and token-based security.

## Invitation Workflow

1. **Send Invitation**: Owner/Manager invites user by email
2. **Email Notification**: Invited user receives email with invitation link
3. **Accept/Decline**: User can accept or decline via link or API
4. **Join Organization**: Accepted invitations create organization membership

## Endpoints for Organization Owners/Managers

### POST /orgs/:orgId/invitations
Send an invitation to join the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "orgRole": "STAFF"
}
```

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "email": "newuser@example.com",
  "orgRole": "STAFF",
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

**Validation Rules**:
- `email`: Valid email format, max 255 characters
- `orgRole`: Must be "MANAGER" or "STAFF" (cannot invite as OWNER)

**Effects**:
- Creates invitation record with 7-day expiration
- Sends email notification to invited user
- Email contains accept/decline links

**Errors**:
- `400 Bad Request`: Invalid email or role
- `409 Conflict`: User already invited or already a member
- `403 Forbidden`: Insufficient permissions

---

### GET /orgs/:orgId/invitations
Get all pending invitations for the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "email": "newuser@example.com",
    "orgRole": "STAFF",
    "status": "PENDING",
    "invitedBy": {
      "id": "64a1b2c3d4e5f6789abc456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
]
```

**Notes**:
- Only returns PENDING invitations
- Accepted, declined, and expired invitations are excluded

---

### DELETE /orgs/:orgId/invitations/:invitationId
Revoke a pending invitation.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only (must be the inviter or owner)

**Parameters**:
- `orgId` (path): Organization ID
- `invitationId` (path): Invitation ID

**Response** (204 No Content): Empty response

**Effects**:
- Marks invitation as revoked
- Invitation links become invalid
- Invited user can no longer accept

**Errors**:
- `404 Not Found`: Invitation not found or already processed
- `403 Forbidden`: Insufficient permissions (not inviter or owner)

---

## Endpoints for Invited Users

### GET /invites
Get current user's pending invitations.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "orgRole": "STAFF",
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

**Notes**:
- Shows invitations for the authenticated user's email
- Excludes sensitive information (inviter's email, etc.)

---

### POST /invites/accept/:token
Accept an invitation (authenticated users).

**Authentication**: Required (JWT)

**Parameters**:
- `token` (path): Invitation token from email

**Response** (200 OK):
```json
{
  "message": "Invitation accepted successfully"
}
```

**Effects**:
- Creates user-organization relationship with specified role
- Marks invitation as accepted
- User gains access to organization

**Errors**:
- `400 Bad Request`: Invalid or expired token
- `409 Conflict`: User already a member of organization

---

### POST /invites/decline/:token
Decline an invitation (authenticated users).

**Authentication**: Required (JWT)

**Parameters**:
- `token` (path): Invitation token from email

**Response** (200 OK):
```json
{
  "message": "Invitation declined successfully"
}
```

**Effects**:
- Marks invitation as declined
- No organization membership created

---

## Public Endpoints (Anonymous Users)

### GET /public/invitations/details/:token
Get invitation details without authentication.

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email

**Response** (200 OK):
```json
{
  "organization": {
    "name": "My Bar Organization"
  },
  "orgRole": "STAFF",
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

### POST /public/invitations/decline/:token
Decline invitation without authentication.

**Authentication**: Not required

**Parameters**:
- `token` (path): Invitation token from email

**Response** (200 OK):
```json
{
  "message": "Invitation declined successfully"
}
```

**Effects**:
- Marks invitation as declined
- No user account created

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

## Email Notifications

### Invitation Email Content
- **Subject**: "Invitation to join [Organization Name]"
- **Sender**: Organization owner/manager name
- **Content**: HTML email with organization details and role
- **Actions**: Accept and Decline buttons linking to frontend

### Email Template Variables
- `organizationName`: Name of the organization
- `inviterName`: Full name of person who sent invitation
- `role`: Role being offered (Manager, Staff)
- `acceptUrl`: Frontend URL for accepting invitation
- `declineUrl`: Frontend URL for declining invitation
- `expirationDate`: When invitation expires

## Security Features

1. **Token-Based Security**: Cryptographically secure tokens
2. **Expiration**: 7-day expiration for all invitations
3. **Single Use**: Tokens become invalid after use
4. **Email Verification**: Invitations tied to specific email addresses
5. **Role Restrictions**: Cannot invite users as owners
6. **Revocation**: Invitations can be revoked before acceptance

## Error Handling

**Invalid Token** (400):
```json
{
  "statusCode": 400,
  "message": "Invalid or expired invitation token",
  "error": "Bad Request"
}
```

**Already Member** (409):
```json
{
  "statusCode": 409,
  "message": "User is already a member of this organization",
  "error": "Conflict"
}
```

**Permission Denied** (403):
```json
{
  "statusCode": 403,
  "message": "Only owners and managers can send invitations",
  "error": "Forbidden"
}
```

**Invitation Expired** (400):
```json
{
  "statusCode": 400,
  "message": "This invitation has expired",
  "error": "Bad Request"
}
```

## Integration Notes

### Frontend Implementation

1. **Send Invitation Form**:
```javascript
const response = await fetch(`/api/orgs/${orgId}/invitations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    orgRole: 'STAFF'
  })
});
```

2. **Accept Invitation (Authenticated)**:
```javascript
const response = await fetch(`/api/invites/accept/${token}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

3. **Accept Invitation (Anonymous)**:
```javascript
const response = await fetch(`/api/public/invitations/accept/${token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    firstName: 'John',
    lastName: 'Doe'
  })
});
```

### Email Integration
- Configure SMTP settings for email delivery
- Customize email templates with organization branding
- Handle email delivery failures gracefully
- Implement email bounce handling

## Business Rules

1. **Invitation Lifetime**: 7 days from creation
2. **Role Restrictions**: Cannot invite users as owners
3. **Duplicate Prevention**: One active invitation per email per organization
4. **Auto-Cleanup**: Expired invitations are automatically marked as expired
5. **Permission Inheritance**: Invitation permissions follow organization role hierarchy
6. **Email Matching**: Anonymous acceptance requires email match with invitation
