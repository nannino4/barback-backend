# Product Management API Documentation

## Overview
The Product Management module handles inventory items within organizations. Products are linked to categories and include stock tracking, pricing, and inventory management features.

## Core Endpoints

### GET /api/orgs/:orgId/products
Get all products for an organization.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Query Parameters**:
- `categoryId` (optional): Filter products by category ID (must be valid ObjectId if provided)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "name": "Johnnie Walker Black Label",
    "description": "12-year-old blended Scotch whisky",
    "brand": "Johnnie Walker",
    "defaultUnit": "bottle",
    "defaultPurchasePrice": 45.50,
    "currentQuantity": 7,
    "categoryIds": ["64a1b2c3d4e5f6789def456"],
    "imageUrl": "https://example.com/image.jpg"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": "Validation failed (expected type is ObjectId)",
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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: product retrieval - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

---

### GET /api/orgs/:orgId/products/:id
Get a specific product.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `id` (path): Product ID (must be valid ObjectId)

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label",
  "description": "12-year-old blended Scotch whisky",
  "brand": "Johnnie Walker",
  "defaultUnit": "bottle",
  "defaultPurchasePrice": 45.50,
  "currentQuantity": 7,
  "categoryIds": ["64a1b2c3d4e5f6789def456"],
  "imageUrl": "https://example.com/image.jpg"
}
```

**Error Responses**:

**400 Bad Request** - Invalid Parameters:
```json
{
  "message": "Validation failed (expected type is ObjectId)",
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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Product Not Found:
```json
{
  "message": "Product with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "PRODUCT_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: product retrieval - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

---

### POST /api/orgs/:orgId/products
Create a new product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Request Body**:
```json
{
  "name": "Bombay Sapphire Gin",
  "description": "Premium London dry gin",
  "brand": "Bombay Sapphire",
  "defaultUnit": "bottle",
  "defaultPurchasePrice": 28.99,
  "currentQuantity": 5,
  "categoryIds": ["64a1b2c3d4e5f6789def458"],
  "imageUrl": "https://example.com/gin.jpg"
}
```

**Validation Rules**:
- `name`: Required, string, max 200 characters, unique within organization
- `description`: Optional, string
- `brand`: Optional, string
- `defaultUnit`: Required, string, max 50 characters
- `defaultPurchasePrice`: Optional, number, min 0
- `currentQuantity`: Optional, number, min 0, defaults to 0
- `categoryIds`: Optional, array of valid ObjectIds belonging to the organization
- `imageUrl`: Optional, valid URL

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc125",
  "name": "Bombay Sapphire Gin",
  "description": "Premium London dry gin",
  "brand": "Bombay Sapphire",
  "defaultUnit": "bottle",
  "defaultPurchasePrice": 28.99,
  "currentQuantity": 5,
  "categoryIds": ["64a1b2c3d4e5f6789def458"],
  "imageUrl": "https://example.com/gin.jpg"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.product.name.required",
    "validation.product.defaultUnit.required",
    "validation.product.currentQuantity.min"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Note**: Validation error messages are returned as translation keys. Product validation keys:
- `validation.product.name.*` - name validation (required, mustBeString)
- `validation.product.description.*` - description validation (required, mustBeString)
- `validation.product.brand.*` - brand validation (required, mustBeString)
- `validation.product.defaultUnit.*` - defaultUnit validation (required, mustBeString)
- `validation.product.defaultPurchasePrice.*` - defaultPurchasePrice validation (mustBeNumber, min)
- `validation.product.currentQuantity.*` - currentQuantity validation (mustBeNumber, min)
- `validation.product.categoryIds.*` - categoryIds validation (mustBeArray, invalidObjectId)
- `validation.product.imageUrl.*` - imageUrl validation (invalidUrl)

**400 Bad Request** - Invalid Category:
```json
{
  "message": "Category with ID \"64a1b2c3d4e5f6789def458\" not found or does not belong to the organization",
  "error": "INVALID_PRODUCT_CATEGORY",
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
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**409 Conflict** - Duplicate Product Name:
```json
{
  "message": "Product with name \"Bombay Sapphire Gin\" already exists in this organization",
  "error": "PRODUCT_NAME_CONFLICT",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: product creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

---

### PUT /api/orgs/:orgId/products/:id
Update an existing product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `id` (path): Product ID (must be valid ObjectId)

**Request Body** (partial updates supported):
```json
{
  "name": "Johnnie Walker Black Label 12yr",
  "description": "12-year-old blended Scotch whisky - premium selection",
  "defaultPurchasePrice": 47.99,
  "categoryIds": ["64a1b2c3d4e5f6789def456"]
}
```

**Validation Rules**:
- Same validation rules as creation
- All fields are optional (partial updates)
- `currentQuantity` cannot be updated through this endpoint (use stock adjustment)

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label 12yr",
  "description": "12-year-old blended Scotch whisky - premium selection",
  "brand": "Johnnie Walker",
  "defaultUnit": "bottle",
  "defaultPurchasePrice": 47.99,
  "currentQuantity": 7,
  "categoryIds": ["64a1b2c3d4e5f6789def456"],
  "imageUrl": "https://example.com/image.jpg"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.product.name.required",
    "validation.product.defaultPurchasePrice.min"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Category:
```json
{
  "message": "Category with ID \"64a1b2c3d4e5f6789def458\" not found or does not belong to the organization",
  "error": "INVALID_PRODUCT_CATEGORY",
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
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Product Not Found:
```json
{
  "message": "Product with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "PRODUCT_NOT_FOUND",
  "statusCode": 404
}
```

**409 Conflict** - Duplicate Product Name:
```json
{
  "message": "Product with name \"Bombay Sapphire Gin\" already exists in this organization",
  "error": "PRODUCT_NAME_CONFLICT",
  "statusCode": 409
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: product update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

---

### DELETE /api/orgs/:orgId/products/:id
Delete a product.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `id` (path): Product ID (must be valid ObjectId)

**Response** (200 OK):
```json
{
  "message": "Product deleted successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid Parameters:
```json
{
  "message": "Validation failed (expected type is ObjectId)",
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

**403 Forbidden** - Insufficient Permissions:
```json
{
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Product Not Found:
```json
{
  "message": "Product with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "PRODUCT_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: product deletion - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Product deletion is permanent and cannot be undone
- Associated inventory logs are preserved for audit purposes

---

## Inventory Management Endpoints

### POST /api/orgs/:orgId/products/:id/adjust-stock
Adjust product stock quantity.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `id` (path): Product ID (must be valid ObjectId)

**Request Body**:
```json
{
  "type": "adjustment",
  "quantity": -5,
  "note": "Inventory adjustment after stocktake"
}
```

**Validation Rules**:
- `type`: Required, enum: "purchase", "consumption", "adjustment", "stocktake"
- `quantity`: Required, number, cannot be zero
- `note`: Optional, string

**Business Rules**:
- Adjustment quantity can be positive (increase) or negative (decrease)
- Final quantity cannot be negative
- Zero adjustments are not allowed

**Response** (200 OK):
```json
{
  "id": "64a1b2c3d4e5f6789log001",
  "type": "adjustment",
  "quantity": -5,
  "previousQuantity": 12,
  "newQuantity": 7,
  "note": "Inventory adjustment after stocktake",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "validation.stockAdjustment.type.isEnum",
    "validation.stockAdjustment.quantity.required"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

> **Note:** Error messages are returned as translation keys (e.g., `validation.stockAdjustment.type.isEnum`). The frontend should translate these keys to user-friendly messages in the appropriate language.

**400 Bad Request** - Zero Stock Adjustment:
```json
{
  "message": "Stock adjustment quantity cannot be zero",
  "error": "ZERO_STOCK_ADJUSTMENT",
  "statusCode": 400
}
```

**400 Bad Request** - Negative Stock Result:
```json
{
  "message": "Stock adjustment would result in negative quantity. Current: 3, Adjustment: -5",
  "error": "NEGATIVE_STOCK_NOT_ALLOWED",
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
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Product Not Found:
```json
{
  "message": "Product with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "PRODUCT_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: inventory log creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Product Stock Update Failed:
```json
{
  "message": "Database operation failed: product stock update - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Transaction Notes**:
- Stock adjustments are handled with rollback capability
- If product update fails, inventory log is automatically removed
- Both operations succeed or fail together for data consistency

---

### GET /api/orgs/:orgId/products/:id/logs
Get inventory adjustment logs for a product.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `id` (path): Product ID (must be valid ObjectId)

**Query Parameters**:
- `startDate` (optional): Start date for log filtering (ISO 8601 format)
- `endDate` (optional): End date for log filtering (ISO 8601 format)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789log001",
    "type": "adjustment",
    "quantity": -2,
    "previousQuantity": 9,
    "newQuantity": 7,
    "note": "Broken bottle during transport",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789log002",
    "type": "purchase",
    "quantity": 12,
    "previousQuantity": 0,
    "newQuantity": 12,
    "note": "Weekly delivery from supplier",
    "createdAt": "2024-01-10T09:00:00.000Z"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Parameters:
```json
{
  "message": "Validation failed (expected type is ObjectId)",
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Date Format:
```json
{
  "message": "Invalid start date format provided",
  "error": "INVALID_DATE_RANGE",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid Date Range:
```json
{
  "message": "Start date must be before or equal to end date",
  "error": "INVALID_DATE_RANGE",
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
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found** - Product Not Found:
```json
{
  "message": "Product with ID \"64a1b2c3d4e5f6789abc123\" not found or does not belong to the organization",
  "error": "PRODUCT_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: inventory logs retrieval - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Date Filtering Examples**:
- `GET /api/orgs/123/products/456/logs` - All logs
- `GET /api/orgs/123/products/456/logs?startDate=2024-01-01` - From specific date
- `GET /api/orgs/123/products/456/logs?endDate=2024-01-31` - Until specific date
- `GET /api/orgs/123/products/456/logs?startDate=2024-01-01&endDate=2024-01-31` - Date range

**Notes**:
- Logs are returned in reverse chronological order (newest first)
- Date filtering uses the `createdAt` timestamp
- Date parameters should be in ISO 8601 format (YYYY-MM-DD or full datetime)

---

## Data Models

### Product Object
```json
{
  "id": "string",              // MongoDB ObjectId
  "name": "string",            // Product name (required, unique in org)
  "description": "string",     // Optional description
  "brand": "string",           // Optional brand name
  "defaultUnit": "string",     // Unit of measurement (required)
  "defaultPurchasePrice": "number", // Optional purchase price (min 0)
  "currentQuantity": "number", // Current stock quantity (required, min 0, default 0)
  "categoryIds": "string[]",   // Array of category IDs (can be empty)
  "imageUrl": "string",        // Optional product image URL
  "createdAt": "string",       // ISO timestamp
  "updatedAt": "string"        // ISO timestamp
}
```

### Product with Additional Information
For enhanced display with category details:
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "name": "Johnnie Walker Black Label",
  "description": "12-year-old blended Scotch whisky",
  "brand": "Johnnie Walker",
  "defaultUnit": "bottle",
  "defaultPurchasePrice": 45.50,
  "currentQuantity": 7,
  "categoryIds": ["64a1b2c3d4e5f6789def456"],
  "imageUrl": "https://example.com/image.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Stock Management

### Current Stock Tracking
Products track current quantities with the following constraints:

- **Non-negative**: Stock quantities cannot be negative
- **Decimal Support**: Quantities can be decimal values for precise measurements
- **Real-time Updates**: Stock is updated immediately when adjustments are made
- **Audit Trail**: All stock changes are logged for full traceability

### Units of Measurement
Common unit examples:
- **Bottles**: "bottle", "bt"
- **Volume**: "liter", "ml", "gallon", "oz"
- **Weight**: "kg", "g", "lb", "oz"
- **Count**: "piece", "pack", "case", "box"
- **Custom**: Any text describing the measurement unit

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
5. **Multiple Categories**: Products can belong to multiple categories
6. **Audit Trail**: All stock changes are logged with full details

## Validation Rules

### Name Validation
- Required field
- Must be unique within organization
- Trimmed of leading/trailing whitespace

### Description Validation
- Optional field
- Can contain any text including line breaks

### Brand Validation
- Optional field
- Can contain any text

### Unit Validation
- Required field
- Common units: bottle, liter, kg, piece, etc.

### Price Validation
- Optional field
- Must be non-negative number if provided
- Supports decimal values

### Quantity Validation
- Current quantity: Required, non-negative number (supports decimals)
- Defaults to 0 when creating new products
- Cannot be set to negative values

### Category Validation
- Must be empty array or array of valid category IDs
- Categories must exist in same organization
- Can be changed after product creation

### Image URL Validation
- Optional field
- Must be valid URL format if provided

## Performance Considerations

1. **Indexing**: Database indexes on organizationId, categoryId, and name
2. **Pagination**: Consider implementing pagination for large product catalogs
3. **Caching**: Product lists suitable for caching with cache invalidation
4. **Search**: Implement text search indexes for product names and descriptions

## Future Enhancements

1. **Advanced Search**: Full-text search across product names and descriptions
2. **Barcode Support**: Product identification via barcodes/QR codes
3. **Product Variants**: Support for product variations (sizes, flavors, etc.)
4. **Batch/Lot Tracking**: Track product batches for expiration and quality control
5. **Supplier Management**: Link products to suppliers and vendor information
6. **Pricing History**: Track price changes over time
7. **Reorder Points**: Automated reorder alerts based on consumption patterns
8. **Product Templates**: Common products for quick setup across organizations
