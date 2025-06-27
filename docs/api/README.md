# Barback Backend API Documentation

This directory contains comprehensive API documentation for the Barback backend application. Each module has its own detailed documentation file.

## Available Modules

### Core Modules
- [Authentication API](./authentication.md) - User registration, login, password management
- [User Management API](./user-management.md) - User profile operations
- [Subscription Management API](./subscription-management.md) - Subscription and payment handling
- [Organization Management API](./organization-management.md) - Organization CRUD and member management
- [Invitation Management API](./invitation-management.md) - Organization invitation system

### Feature Modules
- [Category Management API](./category-management.md) - Product categorization system
- [Product Management API](./product-management.md) - Product inventory items
- [Inventory Management API](./inventory-management.md) - Stock adjustments and logging

### Admin Modules
- [Admin Management API](./admin-management.md) - Administrative operations

## General Information

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require JWT authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Common Response Codes
- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate, etc.)
- `500 Internal Server Error` - Server error

### Data Formats
- All requests and responses use JSON format
- Dates are in ISO 8601 format
- ObjectIds are MongoDB ObjectId strings

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- General API endpoints: 100 requests per minute per user

### Organization-Scoped Resources
Many endpoints are scoped to organizations and require:
1. JWT authentication
2. User membership in the organization
3. Appropriate role permissions (Owner, Manager, Staff)

### Role-Based Access Control
- **Owner**: Full access to organization resources
- **Manager**: Create, read, update resources (cannot delete organization or change ownership)
- **Staff**: Read access and specific update permissions (inventory adjustments)

See individual module documentation for specific endpoint details and examples.
