# Organization Management API Documentation

## Overview
The Organization Management module handles organization CRUD operations, member management, and role-based access control. Each organization requires an active subscription and supports role-based permissions for owners, managers, and staff.

## Organization Roles

- **Owner**: Full access to all organization resources, can delete organization
- **Manager**: Create, read, update resources (cannot delete organization or change ownership)
- **Staff**: Read access and specific update permissions (like inventory adjustments)

## Endpoints

### POST /api/orgs
Create a new organization.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "name": "My Bar Organization",
  "subscriptionId": "64a1b2c3d4e5f6789abc123",
  "settings": {
    "defaultCurrency": "EUR"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789def456",
  "name": "My Bar Organization",
  "settings": {
    "defaultCurrency": "EUR"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Validation Rules**:
- `name`: Required, max 100 characters
- `subscriptionId`: Required, must be user's active subscription
- `settings.defaultCurrency`: Optional, defaults to "EUR"

**Errors**:
- `404 Not Found`: Subscription not found
- `409 Conflict`: Subscription not active or already used for another organization

**Notes**:
- User becomes the organization owner automatically
- Subscription must be active or trialing
- One organization per subscription

---

### GET /api/orgs
Get organizations user is a member of.

**Authentication**: Required (JWT)

**Query Parameters**:
- `orgRole` (optional): Filter by user's role in organizations

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789def456",
    "organizationId": "64a1b2c3d4e5f6789def456",
    "organization": {
      "id": "64a1b2c3d4e5f6789def456",
      "name": "My Bar Organization",
      "settings": {
        "defaultCurrency": "EUR"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "orgRole": "OWNER",
    "joinedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Role Filter Examples**:
- `GET /api/orgs?orgRole=OWNER` - Organizations where user is owner
- `GET /api/orgs?orgRole=MANAGER` - Organizations where user is manager
- `GET /api/orgs` - All organizations user is member of

---

### GET /api/orgs/:id/members
Get organization members.

**Authentication**: Required (JWT)
**Authorization**: Must be organization member (Owner, Manager, or Staff)

**Parameters**:
- `id` (path): Organization ID

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "user": {
      "id": "64a1b2c3d4e5f6789abc123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "orgRole": "OWNER",
    "joinedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "user": {
      "id": "64a1b2c3d4e5f6789abc124",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "orgRole": "MANAGER",
    "joinedAt": "2024-01-01T12:00:00.000Z"
  }
]
```

**Notes**:
- Returns all members with their roles and basic user information
- Sensitive user data (phone numbers, etc.) is excluded

---

### PUT /api/orgs/:id
Update organization details.

**Authentication**: Required (JWT)
**Authorization**: Owner only

**Parameters**:
- `id` (path): Organization ID

**Request Body**:
```json
{
  "name": "Updated Bar Name",
  "settings": {
    "defaultCurrency": "USD"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789def456",
  "name": "Updated Bar Name",
  "settings": {
    "defaultCurrency": "USD"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Validation Rules**:
- `name`: Optional, max 100 characters if provided
- `settings`: Optional object with configuration

**Errors**:
- `403 Forbidden`: Only owners can update organization details

---

### PUT /api/orgs/:id/members/:userId/role
Update member role in organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `id` (path): Organization ID
- `userId` (path): User ID of member to update

**Request Body**:
```json
{
  "orgRole": "MANAGER"
}
```

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc124",
  "user": {
    "id": "64a1b2c3d4e5f6789abc124",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com"
  },
  "orgRole": "MANAGER",
  "joinedAt": "2024-01-01T12:00:00.000Z"
}
```

**Valid Role Values**:
- `MANAGER`: Manager role
- `STAFF`: Staff role

**Restrictions**:
- Cannot change owner role (use ownership transfer process)
- Cannot change your own role
- Managers cannot promote users to owner
- At least one owner must remain

**Errors**:
- `400 Bad Request`: Invalid role or attempting to change owner role
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found or not a member

---

## Data Models

### Organization Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "name": "string",         // Organization name (max 100 chars)
  "settings": {
    "defaultCurrency": "string"  // Currency code (EUR, USD, etc.)
  },
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### User-Organization Relationship Object
```json
{
  "id": "string",           // Relationship ID
  "organizationId": "string", // Organization ID
  "organization": {         // Organization details (when populated)
    "id": "string",
    "name": "string",
    "settings": {},
    "createdAt": "string",
    "updatedAt": "string"
  },
  "orgRole": "OWNER|MANAGER|STAFF", // User's role in organization
  "joinedAt": "string"      // When user joined organization
}
```

### Organization Member Object
```json
{
  "id": "string",           // Relationship ID
  "user": {                 // User details (public info only)
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string"
  },
  "orgRole": "OWNER|MANAGER|STAFF", // User's role
  "joinedAt": "string"      // When user joined organization
}
```

## Role-Based Access Control

### Permission Matrix

| Action | Owner | Manager | Staff |
|--------|--------|---------|-------|
| View organization details | ✅ | ✅ | ✅ |
| Update organization details | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ |
| View members | ✅ | ✅ | ✅ |
| Invite members | ✅ | ✅ | ❌ |
| Update member roles | ✅ | ✅* | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Manage categories | ✅ | ✅ | ❌ |
| Manage products | ✅ | ✅ | ❌ |
| View inventory | ✅ | ✅ | ✅ |
| Adjust inventory | ✅ | ✅ | ✅ |

*Managers cannot promote users to owner or change owner roles

### Access Control Implementation

All organization-scoped endpoints use the `@OrgRoles()` decorator:

```typescript
@OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)  // All roles
@OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)                // Owners and managers only
@OrgRoles(OrgRole.OWNER)                                 // Owners only
```

## Error Handling

**Insufficient Permissions** (403):
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden"
}
```

**Organization Not Found** (404):
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

**Invalid Subscription** (409):
```json
{
  "statusCode": 409,
  "message": "Subscription is not active",
  "error": "Conflict"
}
```

**Role Update Violation** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot change owner role through this endpoint",
  "error": "Bad Request"
}
```

## Integration Notes

### Creating Organizations
1. User must have an active subscription first
2. Use subscription ID in organization creation request
3. User automatically becomes organization owner

### Member Management
1. Use invitation system to add new members (see Invitation Management API)
2. Role updates are immediate and affect access permissions
3. Removing owner requires ownership transfer process

### Frontend Implementation
```javascript
// Check user's organizations
const orgs = await fetch('/api/orgs', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get organization members
const members = await fetch(`/api/orgs/${orgId}/members`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Update member role
await fetch(`/api/orgs/${orgId}/members/${userId}/role`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ orgRole: 'MANAGER' })
});
```

## Business Rules

1. **Subscription Requirement**: Active subscription required for organization creation
2. **One Organization Per Subscription**: Each subscription can create one organization
3. **Role Hierarchy**: Owner > Manager > Staff
4. **Ownership Protection**: Owner role cannot be changed through normal role updates
5. **Minimum Ownership**: At least one owner must remain in organization
6. **Access Inheritance**: Higher roles inherit lower role permissions
