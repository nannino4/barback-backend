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

**Validation Rules**:
- `name`: Required, string, max 100 characters
- `subscriptionId`: Required, must be valid ObjectId format
- `settings.defaultCurrency`: Optional, string, defaults to "EUR"

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

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "name should not be empty",
    "subscriptionId must be a mongodb id"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**404 Not Found** - Subscription Not Found:
```json
{
  "message": "Subscription not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**409 Conflict** - Organization Name Already Exists (for this user):
```json
{
  "message": "Organization with name \"My Bar Organization\" already exists",
  "error": "ORGANIZATION_NAME_EXISTS",
  "statusCode": 409
}
```

**409 Conflict** - Subscription Not Active:
```json
{
  "message": "Subscription \"64a1b2c3d4e5f6789abc123\" is not active",
  "error": "SUBSCRIPTION_NOT_ACTIVE",
  "statusCode": 409
}
```

**409 Conflict** - Subscription Ownership Mismatch:
```json
{
  "message": "Subscription \"64a1b2c3d4e5f6789abc123\" does not belong to the current user",
  "error": "SUBSCRIPTION_OWNERSHIP_MISMATCH",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: organization creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Implementation Notes**:
- User becomes the organization owner automatically
- Subscription must be active or trialing status
- Organization names must be unique per owner (different owners can have organizations with the same name)
- One organization per subscription limitation
- All database operations are wrapped in error handling

---

### GET /api/orgs
Get organizations user is a member of.

**Authentication**: Required (JWT)

**Query Parameters**:
- `orgRole` (optional): Filter by user's role in organizations (`OWNER`, `MANAGER`, `STAFF`)

**Response** (200 OK):
```json
[
  {
    "user": {
      "id": "64a1b2c3d4e5f6789abc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+393331234567",
      "profilePictureUrl": null,
      "isEmailVerified": true
    },
    "org": {
      "id": "64a1b2c3d4e5f6789def456",
      "name": "My Bar Organization",
      "settings": {
        "defaultCurrency": "EUR"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "role": "OWNER"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Role Filter:
```json
{
  "message": [
    "orgRole must be one of the following values: OWNER, MANAGER, STAFF"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**409 Conflict** - Corrupted User-Organization Relationship:
```json
{
  "message": "Corrupted relationship \"relation_id\": organization not found",
  "error": "CORRUPTED_USER_ORG_RELATION",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: user-org relations lookup - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Usage Examples**:
- `GET /api/orgs?orgRole=OWNER` - Organizations where user is owner
- `GET /api/orgs?orgRole=MANAGER` - Organizations where user is manager
- `GET /api/orgs` - All organizations user is member of

**Implementation Notes**:
- Returns relationships in order of creation
- Data consistency checks prevent corrupted relationships
- Empty array returned if user has no organization memberships

---

### GET /api/orgs/:id/members
Get organization members.

**Authentication**: Required (JWT)
**Authorization**: Must be organization member (Owner, Manager, or Staff)

**Parameters**:
- `id` (path): Organization ID (must be valid ObjectId format)

**Response** (200 OK):
```json
[
  {
    "user": {
      "id": "64a1b2c3d4e5f6789abc123",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+393331234567",
      "profilePictureUrl": null,
      "isEmailVerified": true
    },
    "org": {
      "id": "64a1b2c3d4e5f6789def456",
      "name": "My Bar Organization",
      "settings": {
        "defaultCurrency": "EUR"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "role": "OWNER"
  },
  {
    "user": {
      "id": "64a1b2c3d4e5f6789abc124",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phoneNumber": null,
      "profilePictureUrl": "https://example.com/jane.jpg",
      "isEmailVerified": true
    },
    "org": {
      "id": "64a1b2c3d4e5f6789def456",
      "name": "My Bar Organization",
      "settings": {
        "defaultCurrency": "EUR"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "role": "MANAGER"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": [
    "Validation failed (ObjectId is expected)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for organization access",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Organization Not Found:
```json
{
  "message": "Organization with ID \"64a1b2c3d4e5f6789def456\" not found",
  "error": "ORGANIZATION_NOT_FOUND",
  "statusCode": 404
}
```

**409 Conflict** - Corrupted User-Organization Relationship:
```json
{
  "message": "Corrupted relationship \"relation_id\": user not found",
  "error": "CORRUPTED_USER_ORG_RELATION",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: user-org relations lookup - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - User Lookup Failed:
```json
{
  "message": "Database operation failed: user lookup by ID - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Implementation Notes**:
- Returns all members with their roles and complete user information
- Data consistency checks prevent corrupted relationships
- Organization access is verified through role-based guard
- Empty array returned if organization has no members (should not happen in practice)

---

### PUT /api/orgs/:id
Update organization details.

**Authentication**: Required (JWT)
**Authorization**: Owner only

**Parameters**:
- `id` (path): Organization ID (must be valid ObjectId format)

**Request Body**:
```json
{
  "name": "Updated Bar Name",
  "settings": {
    "defaultCurrency": "USD"
  }
}
```

**Validation Rules**:
- `name`: Optional, string, max 100 characters if provided
- `settings`: Optional object with configuration
- At least one field must be provided for update

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

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "name must be shorter than or equal to 100 characters"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": [
    "Validation failed (ObjectId is expected)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for organization access",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Organization Not Found:
```json
{
  "message": "Organization with ID \"64a1b2c3d4e5f6789def456\" not found",
  "error": "ORGANIZATION_NOT_FOUND",
  "statusCode": 404
}
```

**409 Conflict** - Organization Name Already Exists:
```json
{
  "message": "Organization with name \"Updated Bar Name\" already exists",
  "error": "ORGANIZATION_NAME_EXISTS",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: organization update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Implementation Notes**:
- Only organization owners can update organization details
- Organization names must be unique per owner (different owners can have organizations with the same name)
- Partial updates are supported - only provided fields are updated
- Database validation ensures data integrity

---

### PUT /api/orgs/:id/members/:userId/role
Update member role in organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `id` (path): Organization ID (must be valid ObjectId format)
- `userId` (path): User ID of member to update (must be valid ObjectId format)

**Request Body**:
```json
{
  "role": "MANAGER"
}
```

**Validation Rules**:
- `role`: Required, must be one of: `MANAGER`, `STAFF`
- Cannot assign `OWNER` role through this endpoint

**Response** (200 OK):
```json
{
  "user": {
    "id": "64a1b2c3d4e5f6789abc124",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": null,
    "profilePictureUrl": "https://example.com/jane.jpg",
    "isEmailVerified": true
  },
  "org": {
    "id": "64a1b2c3d4e5f6789def456",
    "name": "My Bar Organization",
    "settings": {
      "defaultCurrency": "EUR"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "role": "MANAGER"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "role must be one of the following values: MANAGER, STAFF"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Object IDs:
```json
{
  "message": [
    "Validation failed (ObjectId is expected)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Owner Role Assignment Attempt:
```json
{
  "message": "Cannot assign OWNER role through role updates",
  "error": "OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED",
  "statusCode": 400
}
```

**400 Bad Request** - Owner Role Modification Attempt:
```json
{
  "message": "Cannot modify the role of an organization owner",
  "error": "OWNER_ROLE_MODIFICATION_NOT_ALLOWED",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Missing JWT:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for organization access",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - User Not Organization Member:
```json
{
  "message": "User is not a member of this organization",
  "error": "Not Found",
  "statusCode": 404
}
```

**404 Not Found** - User Not Found by ID:
```json
{
  "message": "User \"64a1b2c3d4e5f6789abc124\" is not a member of organization \"64a1b2c3d4e5f6789def456\"",
  "error": "USER_NOT_MEMBER",
  "statusCode": 404
}
```

**409 Conflict** - Corrupted User-Organization Relationship:
```json
{
  "message": "Corrupted relationship \"unknown\": user not found",
  "error": "CORRUPTED_USER_ORG_RELATION",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: user-org role update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - User Lookup Failed:
```json
{
  "message": "Database operation failed: user lookup by ID - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Role Management Rules**:
- **OWNER**: Cannot be modified or assigned through this endpoint
- **MANAGER**: Can manage staff members and organization resources
- **STAFF**: Basic organization access with limited permissions
- **Hierarchy**: OWNER > MANAGER > STAFF
- **Restrictions**: 
  - Cannot modify owner roles
  - Cannot assign owner roles
  - Managers can only modify staff roles
  - Owners can modify any non-owner role

**Implementation Notes**:
- Role changes are immediately effective
- Data consistency checks prevent corrupted relationships
- Organization access is verified through role-based guard
- Complete user and organization data returned for client state updates

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

**Role Management Rules**:
- **OWNER**: Cannot be modified or assigned through this endpoint
- **MANAGER**: Can manage staff members and organization resources
- **STAFF**: Basic organization access with limited permissions
- **Hierarchy**: OWNER > MANAGER > STAFF
- **Restrictions**: 
  - Cannot modify owner roles
  - Cannot assign owner roles
  - Managers can only modify staff roles
  - Owners can modify any non-owner role

**Implementation Notes**:
- Role changes are immediately effective
- Data consistency checks prevent corrupted relationships
- Organization access is verified through role-based guard
- Complete user and organization data returned for client state updates

---

## Data Structures

### Organization Object (API Response)
```json
{
  "id": "string",           // Organization ID
  "name": "string",         // Organization name
  "settings": {             // Organization settings
    "defaultCurrency": "string"
  },
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### User-Organization Relationship Object
```json
{
  "user": {                 // Complete user public information
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phoneNumber": "string|null",
    "profilePictureUrl": "string|null",
    "isEmailVerified": "boolean"
  },
  "org": {                  // Complete organization information
    "id": "string",
    "name": "string",
    "settings": {
      "defaultCurrency": "string"
    },
    "createdAt": "string",
    "updatedAt": "string"
  },
  "role": "OWNER|MANAGER|STAFF" // User's role in organization
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


## Integration Notes

### Creating Organizations
1. User must have an active subscription first
2. Use subscription ID in organization creation request
3. User automatically becomes organization owner
4. Organization names must be unique per owner

### Member Management
1. Use invitation system to add new members (see Invitation Management API)
2. Role updates are immediate and affect access permissions
3. Owner role cannot be changed through role update endpoints
4. Data consistency is validated across all operations

## Business Rules

1. **Subscription Requirement**: Active subscription required for organization creation
2. **One Organization Per Subscription**: Each subscription can create one organization
3. **Role Hierarchy**: Owner > Manager > Staff
4. **Ownership Protection**: Owner role cannot be changed through normal role updates
5. **Minimum Ownership**: At least one owner must remain in organization
6. **Access Inheritance**: Higher roles inherit lower role permissions
8. **Unique Names**: Organization names must be unique per owner (different owners can have organizations with the same name)
