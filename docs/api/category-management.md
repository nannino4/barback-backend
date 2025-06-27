# Category Management API Documentation

## Overview
The Category Management module handles product categorization within organizations. Categories support hierarchical structures with parent-child relationships and provide organization-scoped access control.

## Features
- Hierarchical category structure (parent-child relationships)
- Organization-scoped categories
- Role-based access control
- Circular reference prevention
- Cascade deletion handling

## Endpoints

### GET /orgs/:orgId/categories
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

**Notes**:
- Returns flat list of all categories
- Use `parentId` to build tree structure in frontend
- Categories are ordered by creation date

---

### GET /orgs/:orgId/categories/:id
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

**Errors**:
- `404 Not Found`: Category not found or not in specified organization

---

### POST /orgs/:orgId/categories
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

**Validation Rules**:
- `name`: Required, max 100 characters, unique within organization
- `description`: Optional, max 500 characters
- `parentId`: Optional, must be valid category ID in same organization

**Business Rules**:
- Category names must be unique within the organization
- Parent category must exist and belong to same organization
- Circular references are prevented

**Errors**:
- `400 Bad Request`: Validation errors or circular reference attempt
- `409 Conflict`: Category name already exists in organization

---

### PUT /orgs/:orgId/categories/:id
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

**Validation Rules**:
- Same validation as creation
- Cannot set category as its own parent (circular reference)
- Cannot create cycles in parent-child relationships

**Partial Updates**:
- Can update individual fields
- Omitted fields remain unchanged
- Set `parentId` to `null` to make category a root category

**Errors**:
- `400 Bad Request`: Validation errors or circular reference attempt
- `404 Not Found`: Category not found or not in organization
- `409 Conflict`: Name conflicts with existing category

---

### DELETE /orgs/:orgId/categories/:id
Delete a category.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Category ID

**Response** (204 No Content): Empty response

**Cascade Behavior**:
- Child categories become root categories (parentId set to null)
- Products in this category have their categoryId set to null
- Deletion is soft - category is marked as deleted but preserved for audit

**Errors**:
- `404 Not Found`: Category not found or not in organization
- `400 Bad Request`: Cannot delete category (business rule violation)

---

## Data Models

### Category Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "name": "string",         // Category name (max 100 chars, unique in org)
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

1. **Unique Names**: Category names must be unique within an organization
2. **Hierarchical Structure**: Categories can have parent-child relationships
3. **No Circular References**: Cannot create cycles in parent-child relationships
4. **Organization Scoping**: Categories belong to specific organizations
5. **Cascade Handling**: Deleting categories affects child categories and products
6. **Soft Deletion**: Categories are marked as deleted for audit purposes

## Validation Rules

### Name Validation
- Required field
- Maximum 100 characters
- Must be unique within organization
- Trimmed of leading/trailing whitespace

### Description Validation
- Optional field
- Maximum 500 characters
- Can contain any text including line breaks

### Parent ID Validation
- Must be null or valid category ID
- Parent category must exist in same organization
- Cannot create circular references
- Cannot set category as its own parent

## Error Handling

**Validation Error** (400):
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "name must be shorter than or equal to 100 characters"
  ],
  "error": "Bad Request"
}
```

**Duplicate Name** (409):
```json
{
  "statusCode": 409,
  "message": "Category name already exists in organization",
  "error": "Conflict"
}
```

**Circular Reference** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot create circular reference in category hierarchy",
  "error": "Bad Request"
}
```

**Access Denied** (403):
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden"
}
```

## Integration Notes

### Frontend Implementation

1. **Building Category Tree**:
```javascript
function buildCategoryTree(categories) {
  const map = new Map();
  const roots = [];
  
  // Create map of all categories
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
  
  // Build tree structure
  categories.forEach(cat => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(map.get(cat.id));
      }
    } else {
      roots.push(map.get(cat.id));
    }
  });
  
  return roots;
}
```

2. **Category Dropdown with Hierarchy**:
```javascript
function flattenCategoriesForDropdown(categories, prefix = '') {
  let options = [];
  categories.forEach(cat => {
    options.push({
      value: cat.id,
      label: prefix + cat.name
    });
    if (cat.children?.length) {
      options.push(...flattenCategoriesForDropdown(cat.children, prefix + '  '));
    }
  });
  return options;
}
```

3. **API Usage Examples**:
```javascript
// Get all categories
const categories = await fetch(`/api/orgs/${orgId}/categories`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Create category
const newCategory = await fetch(`/api/orgs/${orgId}/categories`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Category',
    description: 'Category description',
    parentId: parentCategoryId || null
  })
});
```

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
