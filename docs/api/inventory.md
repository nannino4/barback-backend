# Inventory Management API Documentation

## Overview
The Inventory Management module handles stock adjustments and inventory logging for products. It provides audit trails for all stock changes, supports various adjustment types, and maintains inventory history.

## Features
- Manual stock adjustments with reason codes
- Comprehensive audit logging
- Stock change history tracking
- Multiple adjustment types (purchase, consumption, adjustment, stocktake)
- Organization-scoped access control

## Adjustment Types

- **PURCHASE**: Stock increase from purchases/deliveries
- **CONSUMPTION**: Stock decrease from sales/usage
- **ADJUSTMENT**: Manual corrections (positive or negative)
- **STOCKTAKE**: Physical count adjustments

## Endpoints

### POST /api/orgs/:orgId/products/:productId/adjust-stock
Manually adjust product stock quantity.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID
- `productId` (path): Product ID

**Request Body**:
```json
{
  "adjustmentType": "PURCHASE",
  "quantityChange": 12,
  "reason": "Weekly delivery from supplier",
  "notes": "Received 12 bottles of Johnnie Walker Black Label"
}
```

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "productId": "64a1b2c3d4e5f6789def456",
  "adjustmentType": "PURCHASE",
  "quantityBefore": 7,
  "quantityChange": 12,
  "quantityAfter": 19,
  "reason": "Weekly delivery from supplier",
  "notes": "Received 12 bottles of Johnnie Walker Black Label",
  "adjustedBy": {
    "id": "64a1b2c3d4e5f6789ghi789",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Validation Rules**:
- `adjustmentType`: Required, must be valid type (PURCHASE, CONSUMPTION, ADJUSTMENT, STOCKTAKE)
- `quantityChange`: Required number, can be positive or negative
- `reason`: Required, max 200 characters
- `notes`: Optional, max 1000 characters

**Business Rules**:
- Quantity change can be positive (stock increase) or negative (stock decrease)
- Final quantity cannot be negative (validation prevents negative stock)
- All adjustments are logged with user information and timestamp

**Errors**:
- `400 Bad Request`: Invalid adjustment would result in negative stock
- `404 Not Found`: Product not found or not in organization

---

### GET /api/orgs/:orgId/products/:productId/logs
Get inventory adjustment history for a product.

**Authentication**: Required (JWT)
**Authorization**: Owner, Manager, or Staff

**Parameters**:
- `orgId` (path): Organization ID
- `productId` (path): Product ID

**Query Parameters**:
- `startDate` (optional): Filter logs from this date (ISO string)
- `endDate` (optional): Filter logs until this date (ISO string)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "productId": "64a1b2c3d4e5f6789def456",
    "adjustmentType": "PURCHASE",
    "quantityBefore": 7,
    "quantityChange": 12,
    "quantityAfter": 19,
    "reason": "Weekly delivery from supplier",
    "notes": "Received 12 bottles of Johnnie Walker Black Label",
    "adjustedBy": {
      "id": "64a1b2c3d4e5f6789ghi789",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "productId": "64a1b2c3d4e5f6789def456",
    "adjustmentType": "CONSUMPTION",
    "quantityBefore": 19,
    "quantityChange": -3,
    "quantityAfter": 16,
    "reason": "Sales during evening shift",
    "notes": "3 bottles sold to customers",
    "adjustedBy": {
      "id": "64a1b2c3d4e5f6789ghi790",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "createdAt": "2024-01-01T20:30:00.000Z"
  }
]
```

**Date Filtering Examples**:
- `GET /api/orgs/123/products/456/logs` - All logs
- `GET /api/orgs/123/products/456/logs?startDate=2024-01-01` - Logs from Jan 1st
- `GET /api/orgs/123/products/456/logs?startDate=2024-01-01&endDate=2024-01-31` - January logs

**Notes**:
- Results are ordered by creation date (newest first)
- Invalid dates are ignored (filter not applied)
- Date filtering is inclusive of start and end dates

---

## Data Models

### Inventory Log Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "productId": "string",    // Product ID being adjusted
  "adjustmentType": "string", // Type of adjustment
  "quantityBefore": "number", // Stock before adjustment
  "quantityChange": "number", // Change amount (positive/negative)
  "quantityAfter": "number",  // Stock after adjustment
  "reason": "string",       // Reason for adjustment (max 200 chars)
  "notes": "string",        // Optional notes (max 1000 chars)
  "adjustedBy": {           // User who made the adjustment
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string"
  },
  "createdAt": "string"     // ISO timestamp
}
```

### Adjustment Types
```typescript
enum AdjustmentType {
  PURCHASE = 'PURCHASE',     // Stock increase from purchases
  CONSUMPTION = 'CONSUMPTION', // Stock decrease from sales/usage
  ADJUSTMENT = 'ADJUSTMENT',   // Manual corrections
  STOCKTAKE = 'STOCKTAKE'     // Physical count adjustments
}
```

## Adjustment Workflows

### Purchase/Delivery Workflow
```json
{
  "adjustmentType": "PURCHASE",
  "quantityChange": 24,
  "reason": "Weekly supplier delivery",
  "notes": "Invoice #INV-2024-001, delivered by ABC Suppliers"
}
```

### Sales/Consumption Workflow
```json
{
  "adjustmentType": "CONSUMPTION",
  "quantityChange": -5,
  "reason": "Evening sales",
  "notes": "5 units sold during 6-10 PM shift"
}
```

### Inventory Correction Workflow
```json
{
  "adjustmentType": "ADJUSTMENT",
  "quantityChange": -2,
  "reason": "Correction for damaged items",
  "notes": "2 bottles broken during storage reorganization"
}
```

### Physical Stocktake Workflow
```json
{
  "adjustmentType": "STOCKTAKE",
  "quantityChange": 3,
  "reason": "Monthly physical count",
  "notes": "Physical count shows 15 units, system showed 12"
}
```

## Role-Based Access Control

### Permission Matrix

| Action | Owner | Manager | Staff |
|--------|--------|---------|-------|
| Adjust stock | ✅ | ✅ | ✅ |
| View inventory logs | ✅ | ✅ | ✅ |
| Export inventory reports | ✅ | ✅ | ❌ |

### Access Control Notes
- All organization members can adjust stock and view logs
- Stock adjustments are always logged with user information
- No ability to edit or delete historical logs (audit integrity)

## Business Rules

1. **Negative Stock Prevention**: Adjustments cannot result in negative stock quantities
2. **Audit Trail**: All stock changes are permanently logged
3. **User Attribution**: Every adjustment tracks who made the change
4. **Immutable Logs**: Historical logs cannot be modified or deleted
5. **Reason Required**: All adjustments must include a reason
6. **Organization Scoping**: Logs are scoped to organization through product relationship

## Validation Rules

### Quantity Change Validation
- Required field
- Can be positive (increase) or negative (decrease)
- Must not result in negative final stock quantity
- Supports decimal values for partial units

### Reason Validation
- Required field
- Maximum 200 characters
- Should describe why the adjustment was made

### Notes Validation
- Optional field
- Maximum 1000 characters
- Can contain additional details about the adjustment

### Adjustment Type Validation
- Must be one of: PURCHASE, CONSUMPTION, ADJUSTMENT, STOCKTAKE
- Case-sensitive enum values

## Error Handling

**Negative Stock Error** (400):
```json
{
  "statusCode": 400,
  "message": "Adjustment would result in negative stock quantity",
  "error": "Bad Request"
}
```

**Validation Error** (400):
```json
{
  "statusCode": 400,
  "message": [
    "reason should not be empty",
    "adjustmentType must be a valid enum value"
  ],
  "error": "Bad Request"
}
```

**Product Not Found** (404):
```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
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

1. **Stock Adjustment Form**:
```javascript
const adjustStock = async (orgId, productId, adjustment) => {
  const response = await fetch(`/api/orgs/${orgId}/products/${productId}/adjust-stock`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adjustment)
  });
  
  if (!response.ok) {
    throw new Error(`Stock adjustment failed: ${response.statusText}`);
  }
  
  return response.json();
};

// Usage example
const purchaseAdjustment = {
  adjustmentType: 'PURCHASE',
  quantityChange: 12,
  reason: 'Weekly delivery',
  notes: 'Received from ABC Suppliers'
};

await adjustStock(orgId, productId, purchaseAdjustment);
```

2. **Inventory History Display**:
```javascript
const getInventoryHistory = async (orgId, productId, startDate, endDate) => {
  let url = `/api/orgs/${orgId}/products/${productId}/logs`;
  const params = new URLSearchParams();
  
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

// Display history with proper formatting
const formatAdjustment = (log) => {
  const changeText = log.quantityChange > 0 ? 
    `+${log.quantityChange}` : log.quantityChange.toString();
  
  return {
    ...log,
    changeDisplay: changeText,
    typeDisplay: log.adjustmentType.toLowerCase(),
    userDisplay: `${log.adjustedBy.firstName} ${log.adjustedBy.lastName}`
  };
};
```

3. **Quick Adjustment Buttons**:
```javascript
// Common quick adjustments
const quickAdjustments = [
  { type: 'PURCHASE', label: 'Received Delivery', change: 1 },
  { type: 'CONSUMPTION', label: 'Sold Item', change: -1 },
  { type: 'ADJUSTMENT', label: 'Damaged/Lost', change: -1 },
  { type: 'STOCKTAKE', label: 'Physical Count', change: 0 }
];

const QuickAdjustmentButtons = ({ onAdjust }) => {
  return quickAdjustments.map(adj => (
    <button 
      key={adj.type}
      onClick={() => onAdjust(adj)}
      className="quick-adjust-btn"
    >
      {adj.label}
    </button>
  ));
};
```

### Mobile App Considerations
- Quick adjustment interface for common operations
- Barcode scanning for product identification
- Offline support with sync when connected
- Voice notes for adjustment reasons
- Photo attachments for damage documentation

### Reporting and Analytics
```javascript
// Calculate stock movements for reporting
const calculateStockMovements = (logs) => {
  return logs.reduce((acc, log) => {
    acc.totalIn += log.quantityChange > 0 ? log.quantityChange : 0;
    acc.totalOut += log.quantityChange < 0 ? Math.abs(log.quantityChange) : 0;
    acc.netChange += log.quantityChange;
    
    // Group by adjustment type
    if (!acc.byType[log.adjustmentType]) {
      acc.byType[log.adjustmentType] = 0;
    }
    acc.byType[log.adjustmentType] += log.quantityChange;
    
    return acc;
  }, {
    totalIn: 0,
    totalOut: 0,
    netChange: 0,
    byType: {}
  });
};
```

## Performance Considerations

1. **Indexing**: Database indexes on productId, createdAt, and organizationId
2. **Date Range Queries**: Efficient date filtering with proper indexes
3. **Pagination**: Consider implementing pagination for products with many logs
4. **Aggregation**: Use database aggregation for reporting queries

## Security Considerations

1. **Audit Integrity**: Logs cannot be modified or deleted
2. **User Attribution**: All changes tracked to specific users
3. **Organization Isolation**: Logs scoped through product organization membership
4. **Input Validation**: Prevents negative stock and validates all inputs

## Future Enhancements

1. **Batch Adjustments**: Adjust multiple products simultaneously
2. **Import/Export**: CSV import for bulk adjustments
3. **Photo Attachments**: Attach photos to adjustment logs
4. **Approval Workflows**: Require approval for large adjustments
5. **Automatic Adjustments**: POS integration for automatic consumption logging
6. **Predictive Analytics**: Stock forecasting based on historical patterns
7. **Alert Integration**: Automatic low stock alerts based on consumption patterns
8. **Barcode Integration**: Barcode scanning for quick product identification
