# Product Management API Documentation

## Overview
The Product Management module handles inventory items within organizations. Products are linked to categories and include stock tracking, pricing, and inventory management features.

## Features
- Organization-scoped products
- Category linking and filtering
- Stock quantity tracking
- Role-based access control
- Product search and filtering

## Endpoints

### GET /api/orgs/:orgId/products
Get all products for an organization.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID

**Query Parameters**:
- `categoryId` (optional): Filter products by category ID

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "name": "Johnnie Walker Black Label",
    "description": "12-year-old blended Scotch whisky",
    "unit": "bottle",
    "parLevel": 10,
    "currentQuantity": 7,
    "categoryId": "64a1b2c3d4e5f6789def456",
    "organizationId": "64a1b2c3d4e5f6789ghi789",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "name": "Grey Goose Vodka",
    "description": "Premium French vodka",
    "unit": "bottle",
    "parLevel": 15,
    "currentQuantity": 12,
    "categoryId": "64a1b2c3d4e5f6789def457",
    "organizationId": "64a1b2c3d4e5f6789ghi789",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Filtering Examples**:
- `GET /api/orgs/123/products` - All products
- `GET /api/orgs/123/products?categoryId=456` - Products in specific category

---

### GET /api/orgs/:orgId/products/:id
Get a specific product.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Product ID

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label",
  "description": "12-year-old blended Scotch whisky",
  "unit": "bottle",
  "parLevel": 10,
  "currentQuantity": 7,
  "categoryId": "64a1b2c3d4e5f6789def456",
  "organizationId": "64a1b2c3d4e5f6789ghi789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors**:
- `404 Not Found`: Product not found or not in specified organization

---

### POST /api/orgs/:orgId/products
Create a new product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID

**Request Body**:
```json
{
  "name": "Bombay Sapphire Gin",
  "description": "Premium London dry gin",
  "unit": "bottle",
  "parLevel": 8,
  "currentQuantity": 5,
  "categoryId": "64a1b2c3d4e5f6789def458"
}
```

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc125",
  "name": "Bombay Sapphire Gin",
  "description": "Premium London dry gin",
  "unit": "bottle",
  "parLevel": 8,
  "currentQuantity": 5,
  "categoryId": "64a1b2c3d4e5f6789def458",
  "organizationId": "64a1b2c3d4e5f6789ghi789",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Validation Rules**:
- `name`: Required, max 200 characters, unique within organization
- `description`: Optional, max 1000 characters
- `unit`: Required, max 50 characters (e.g., "bottle", "liter", "kg")
- `parLevel`: Required, non-negative integer (target stock level)
- `currentQuantity`: Required, non-negative number (current stock)
- `categoryId`: Optional, must be valid category ID in same organization

**Business Rules**:
- Product names must be unique within the organization
- Category must exist and belong to same organization
- Initial stock quantity is set during creation

**Errors**:
- `400 Bad Request`: Validation errors
- `409 Conflict`: Product name already exists in organization

---

### PUT /api/orgs/:orgId/products/:id
Update an existing product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Product ID

**Request Body**:
```json
{
  "name": "Johnnie Walker Black Label 12yr",
  "description": "12-year-old blended Scotch whisky - premium selection",
  "unit": "bottle",
  "parLevel": 12,
  "categoryId": "64a1b2c3d4e5f6789def456"
}
```

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label 12yr",
  "description": "12-year-old blended Scotch whisky - premium selection",
  "unit": "bottle",
  "parLevel": 12,
  "currentQuantity": 7,
  "categoryId": "64a1b2c3d4e5f6789def456",
  "organizationId": "64a1b2c3d4e5f6789ghi789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Notes**:
- `currentQuantity` cannot be updated through this endpoint (use inventory adjustment)
- Partial updates supported - only send fields to update
- Category changes are allowed if target category exists

**Errors**:
- `404 Not Found`: Product not found or not in organization
- `409 Conflict`: Name conflicts with existing product

---

### DELETE /api/orgs/:orgId/products/:id
Delete a product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID
- `id` (path): Product ID

**Response** (200 OK):
```json
{
  "message": "Product deleted successfully"
}
```

**Effects**:
- Product is permanently deleted
- Associated inventory logs are preserved for audit
- Cannot be undone

**Errors**:
- `404 Not Found`: Product not found or not in organization

---

## Data Models

### Product Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "name": "string",         // Product name (max 200 chars, unique in org)
  "description": "string",  // Optional description (max 1000 chars)
  "unit": "string",         // Unit of measurement (max 50 chars)
  "parLevel": "number",     // Target stock level (non-negative integer)
  "currentQuantity": "number", // Current stock quantity (non-negative)
  "categoryId": "string|null", // Category ID or null if uncategorized
  "organizationId": "string", // Organization ID
  "createdAt": "string",    // ISO timestamp
  "updatedAt": "string"     // ISO timestamp
}
```

### Product with Category Information
For enhanced display, you may want to include category details:
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label",
  "description": "12-year-old blended Scotch whisky",
  "unit": "bottle",
  "parLevel": 10,
  "currentQuantity": 7,
  "categoryId": "64a1b2c3d4e5f6789def456",
  "category": {
    "id": "64a1b2c3d4e5f6789def456",
    "name": "Whiskey"
  },
  "organizationId": "64a1b2c3d4e5f6789ghi789",
  "stockStatus": "low",     // Derived field based on parLevel comparison
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Stock Management

### Stock Status Calculation
Products can be classified based on current quantity vs par level:

- **Overstocked**: `currentQuantity > parLevel * 1.2`
- **Adequate**: `parLevel * 0.8 <= currentQuantity <= parLevel * 1.2`
- **Low**: `parLevel * 0.5 <= currentQuantity < parLevel * 0.8`
- **Critical**: `currentQuantity < parLevel * 0.5`
- **Out of Stock**: `currentQuantity === 0`

### Units of Measurement
Common unit examples:
- **Bottles**: "bottle", "bt"
- **Volume**: "liter", "ml", "gallon", "oz"
- **Weight**: "kg", "g", "lb", "oz"
- **Count**: "piece", "pack", "case", "box"
- **Custom**: Any text up to 50 characters

## Role-Based Access Control

### Permission Matrix

| Action | Owner | Manager | Staff |
|--------|--------|---------|-------|
| View products | ✅ | ✅ | ✅ |
| Create products | ✅ | ✅ | ❌ |
| Update products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ✅ | ❌ |
| Adjust stock | ✅ | ✅ | ✅ |
| View inventory logs | ✅ | ✅ | ✅ |

### Access Control Notes
- All organization members can view products and inventory status
- Only owners and managers can create/modify product definitions
- All members can adjust stock quantities (see Inventory Management API)
- Products are scoped to organization

## Business Rules

1. **Unique Names**: Product names must be unique within an organization
2. **Organization Scoping**: Products belong to specific organizations
3. **Category Validation**: Categories must exist in same organization
4. **Stock Integrity**: Current quantity cannot be negative
5. **Par Level Management**: Par levels help with reorder planning
6. **Audit Trail**: All stock changes are logged (see Inventory Management)

## Validation Rules

### Name Validation
- Required field
- Maximum 200 characters
- Must be unique within organization
- Trimmed of leading/trailing whitespace

### Description Validation
- Optional field
- Maximum 1000 characters
- Can contain any text including line breaks

### Unit Validation
- Required field
- Maximum 50 characters
- Common units: bottle, liter, kg, piece, etc.

### Quantity Validation
- Par level: Required, non-negative integer
- Current quantity: Required, non-negative number (supports decimals)
- Cannot set negative values

### Category Validation
- Must be null or valid category ID
- Category must exist in same organization
- Can be changed after product creation

## Error Handling

**Validation Error** (400):
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "parLevel must be a positive number"
  ],
  "error": "Bad Request"
}
```

**Duplicate Name** (409):
```json
{
  "statusCode": 409,
  "message": "Product name already exists in organization",
  "error": "Conflict"
}
```

**Invalid Category** (400):
```json
{
  "statusCode": 400,
  "message": "Category does not exist in organization",
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

1. **Product List with Categories**:
```javascript
// Get products with category filtering
const getProducts = async (orgId, categoryId = null) => {
  const url = `/api/orgs/${orgId}/products${categoryId ? `?categoryId=${categoryId}` : ''}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Calculate stock status
const getStockStatus = (product) => {
  const { currentQuantity, parLevel } = product;
  if (currentQuantity === 0) return 'out-of-stock';
  if (currentQuantity < parLevel * 0.5) return 'critical';
  if (currentQuantity < parLevel * 0.8) return 'low';
  if (currentQuantity > parLevel * 1.2) return 'overstocked';
  return 'adequate';
};
```

2. **Product Form Validation**:
```javascript
const validateProduct = (product) => {
  const errors = {};
  
  if (!product.name?.trim()) {
    errors.name = 'Product name is required';
  } else if (product.name.length > 200) {
    errors.name = 'Product name must be 200 characters or less';
  }
  
  if (!product.unit?.trim()) {
    errors.unit = 'Unit is required';
  }
  
  if (product.parLevel < 0) {
    errors.parLevel = 'Par level cannot be negative';
  }
  
  if (product.currentQuantity < 0) {
    errors.currentQuantity = 'Current quantity cannot be negative';
  }
  
  return errors;
};
```

3. **API Usage Examples**:
```javascript
// Create product
const createProduct = async (orgId, productData) => {
  const response = await fetch(`/api/orgs/${orgId}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create product: ${response.statusText}`);
  }
  
  return response.json();
};

// Update product
const updateProduct = async (orgId, productId, updates) => {
  const response = await fetch(`/api/orgs/${orgId}/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  return response.json();
};
```

### Search and Filtering
For enhanced user experience, implement client-side filtering:

```javascript
const filterProducts = (products, filters) => {
  return products.filter(product => {
    // Name search
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (filters.categoryId && product.categoryId !== filters.categoryId) {
      return false;
    }
    
    // Stock status filter
    if (filters.stockStatus) {
      const status = getStockStatus(product);
      if (status !== filters.stockStatus) {
        return false;
      }
    }
    
    return true;
  });
};
```

### Mobile App Considerations
- Support barcode scanning for product identification
- Offline support for product catalogs
- Quick stock adjustment interfaces
- Product search with fuzzy matching
- Category-based navigation

## Performance Considerations

1. **Indexing**: Database indexes on organizationId, categoryId, and name
2. **Pagination**: Consider implementing pagination for large product catalogs
3. **Caching**: Product lists suitable for caching with cache invalidation
4. **Search**: Implement text search indexes for product names and descriptions

## Future Enhancements

1. **Product Images**: Support for product photos
2. **Barcode Support**: Product identification via barcodes
3. **Pricing**: Cost and selling price tracking
4. **Suppliers**: Link products to suppliers and vendor information
5. **Product Variants**: Support for product variations (sizes, etc.)
6. **Batch/Lot Tracking**: Track product batches for expiration and quality
7. **Reorder Points**: Automated reorder alerts based on consumption patterns
8. **Product Templates**: Common products for quick setup
