# Category Management API Documentation

## Overview
The Category Management module handles product categorization within organizations. Categories support hierarchical structures with parent-child relationships and provide organization-scoped access control.

## Features
- Hierarchical category structure (parent-child relationships)
- Organizati**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.category.name.required",
    "validation.category.description.mustBeString"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys.

**400 Bad Request** - Invalid Organization ID:ategories
- Role-based access control
- Circular reference prevention
- Cascade deletion handling
- Duplicate name prevention

## Core Endpoints

### GET /api/orgs/:orgId/categories
Get all categories for an organization.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "name": "Spirits",
    "description": "Alcoholic spirits and liquors",
    "parentId": null,
    "organizationId": "64a1b2c3d4e5f6789def456",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "name": "Whiskey",
    "description": "Various types of whiskey",
    "parentId": "64a1b2c3d4e5f6789abc123",
    "organizationId": "64a1b2c3d4e5f6789def456",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": "Invalid ObjectId format: invalidId",
  "error": "Bad Request",
  "statusCode": 400
}
```

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

**403 Forbidden** - Insufficient Organization Permissions:
```json
{
  "message": "Access denied. Required organization roles: OWNER, MANAGER, STAFF",
  "error": "Forbidden",
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: categories retrieval - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Returns flat list of all categories sorted by name
- Use `parentId` to build tree structure in frontend
- Empty array returned if no categories exist for organization

---

### GET /api/orgs/:orgId/categories/:id
Get a specific category.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Category ID

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Spirits",
  "description": "Alcoholic spirits and liquors",
  "parentId": null,
  "organizationId": "64a1b2c3d4e5f6789def456",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid ID Format:
```json
{
  "message": "Invalid ObjectId format: invalidId",
  "error": "Bad Request",
  "statusCode": 400
}
```

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

**403 Forbidden** - Insufficient Organization Permissions:
```json
{
  "message": "Access denied. Required organization roles: OWNER, MANAGER, STAFF",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Category Not Found:
```json
{
  "message": "Category with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "CATEGORY_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: category retrieval - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

---

### POST /api/orgs/:orgId/categories
Create a new category.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID

**Request Body**:
```json
{
  "name": "Wine",
  "description": "Various types of wine",
  "parentId": null
}
```

**Validation Rules**:
- `name`: Required, non-empty string, max 255 characters
- `description`: Optional string, max 500 characters when provided
- `parentId`: Optional, must be valid MongoDB ObjectId of existing category in same organization

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc125",
  "name": "Wine",
  "description": "Various types of wine",
  "parentId": null,
  "organizationId": "64a1b2c3d4e5f6789def456",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.category.name.required",
    "validation.category.parentId.invalidObjectId"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys. Category validation keys:
- `validation.category.name.*` - name validation (required, mustBeString)
- `validation.category.description.*` - description validation (required, mustBeString)
- `validation.category.parentId.*` - parentId validation (invalidObjectId)

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": "Invalid ObjectId format: invalidId",
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Parent Category:
```json
{
  "message": "Parent category with ID \"64a1b2c3d4e5f6789abc999\" not found or does not belong to the organization",
  "error": "INVALID_PARENT_CATEGORY",
  "statusCode": 400
}
```

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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Access denied. Required organization roles: OWNER, MANAGER",
  "error": "Forbidden",
  "statusCode": 403
}
```

**409 Conflict** - Category Name Already Exists:
```json
{
  "message": "Category with name \"Wine\" already exists in this organization",
  "error": "CATEGORY_NAME_CONFLICT",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: category creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Business Rules**:
- Category names must be unique within the organization (case-sensitive)
- Parent category must exist and belong to same organization
- No circular references are allowed in hierarchy

---

### PUT /api/orgs/:orgId/categories/:id
Update an existing category.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Category ID

**Request Body**:
```json
{
  "name": "Premium Spirits",
  "description": "High-end alcoholic spirits and liquors",
  "parentId": null
}
```

**Validation Rules**:
- All fields are optional for updates
- `name`: Non-empty string, max 255 characters when provided
- `description`: String, max 500 characters when provided  
- `parentId`: Valid MongoDB ObjectId of existing category in same organization, or null

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Premium Spirits", 
  "description": "High-end alcoholic spirits and liquors",
  "parentId": null,
  "organizationId": "64a1b2c3d4e5f6789def456",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "name should not be empty",
    "parentId must be a mongodb id"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid ID Format:
```json
{
  "message": "Invalid ObjectId format: invalidId",
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Parent Category:
```json
{
  "message": "Parent category with ID \"64a1b2c3d4e5f6789abc999\" not found or does not belong to the organization",
  "error": "INVALID_PARENT_CATEGORY", 
  "statusCode": 400
}
```

**400 Bad Request** - Self Parent Assignment:
```json
{
  "message": "Category cannot be its own parent",
  "error": "CATEGORY_SELF_PARENT",
  "statusCode": 400
}
```

**400 Bad Request** - Circular Reference:
```json
{
  "message": "Circular reference detected: category cannot be a descendant of itself",
  "error": "CATEGORY_CIRCULAR_REFERENCE",
  "statusCode": 400
}
```

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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Access denied. Required organization roles: OWNER, MANAGER",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Category Not Found:
```json
{
  "message": "Category with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "CATEGORY_NOT_FOUND",
  "statusCode": 404
}
```

**409 Conflict** - Category Name Already Exists:
```json
{
  "message": "Category with name \"Premium Spirits\" already exists in this organization",
  "error": "CATEGORY_NAME_CONFLICT",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: category update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Partial Updates**:
- Can update individual fields
- Omitted fields remain unchanged
- Set `parentId` to `null` to make category a root category

**Business Rules**:
- Cannot set category as its own parent
- Cannot create cycles in parent-child relationships
- Updated name must not conflict with existing categories in organization
- All hierarchy validation occurs before database update

---

### DELETE /api/orgs/:orgId/categories/:id
Delete a category.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Category ID

**Response** (200 OK):
```json
{
  "message": "Category deleted successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid ID Format:
```json
{
  "message": "Invalid ObjectId format: invalidId",
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Category Has Children:
```json
{
  "message": "Cannot delete category with child categories. Please delete or reassign child categories first.",
  "error": "CATEGORY_HAS_CHILDREN",
  "statusCode": 400
}
```

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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Access denied. Required organization roles: OWNER, MANAGER",
  "error": "Forbidden", 
  "statusCode": 403
}
```

**404 Not Found** - Category Not Found:
```json
{
  "message": "Category with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "CATEGORY_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: category deletion - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Business Rules**:
- Cannot delete categories that have child categories
- Must delete or reassign child categories first
- Category and all references are permanently removed

---

## Data Models

### Category Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "name": "string",         // Category name (max 255 chars, unique in org)
  "description": "string",  // Optional description (max 500 chars)
  "parentId": "string|null", // Parent category ID or null for root
  "organizationId": "string", // Organization ID
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### Category Tree Structure
Categories form a tree structure where:
- Root categories have `parentId: null`
- Child categories have `parentId` pointing to parent
- No circular references allowed
- Unlimited depth supported

### Example Hierarchy
```
Beverages (root)
├── Alcoholic
│   ├── Spirits
│   │   ├── Whiskey
│   │   ├── Vodka
│   │   └── Rum
│   ├── Wine
│   │   ├── Red Wine
│   │   └── White Wine
│   └── Beer
└── Non-Alcoholic
    ├── Soft Drinks
    └── Juices
```

## Role-Based Access Control

### Permission Matrix

| Action | Owner | Manager | Staff |
|--------|--------|---------|-------|
| View categories | ✅ | ✅ | ✅ |
| Create categories | ✅ | ✅ | ❌ |
| Update categories | ✅ | ✅ | ❌ |
| Delete categories | ✅ | ✅ | ❌ |

### Access Control Notes
- All organization members can view categories
- Only owners and managers can modify categories
- Categories are scoped to organization - users can only access categories in organizations they're members of

## Business Rules

1. **Unique Names**: Category names must be unique within an organization (case-sensitive)
2. **Hierarchical Structure**: Categories can have parent-child relationships
3. **No Circular References**: Cannot create cycles in parent-child relationships
4. **Organization Scoping**: Categories belong to specific organizations
5. **Child Category Protection**: Cannot delete categories that have child categories
6. **Parent Validation**: Parent categories must exist in the same organization

## Validation Rules

### Name Validation
- Required field for creation
- Non-empty string when provided for updates
- Maximum 255 characters
- Must be unique within organization
- Trimmed of leading/trailing whitespace

### Description Validation
- Optional field
- Maximum 500 characters when provided
- Can contain any text including line breaks

### Parent ID Validation
- Must be null or valid MongoDB ObjectId
- Parent category must exist in same organization
- Cannot create circular references
- Cannot set category as its own parent

### Mobile App Considerations
- Cache category tree for offline use
- Implement efficient tree rendering for small screens
- Support category search and filtering
- Handle deep hierarchies with collapsible sections

## Performance Considerations

1. **Tree Structure**: Categories are returned as flat list - build tree in frontend
2. **Caching**: Category lists rarely change - suitable for caching
3. **Pagination**: Not implemented - assumes reasonable number of categories per organization
4. **Indexing**: Database indexes on organizationId and parentId for efficient queries

## Future Enhancements

1. **Category Icons**: Support for category icons/images
2. **Category Colors**: Color coding for visual organization
3. **Category Templates**: Predefined category structures for different business types
4. **Category Analytics**: Usage statistics and insights
5. **Import/Export**: Bulk category operations
6. **Category Ordering**: Custom sort order within hierarchy levels
