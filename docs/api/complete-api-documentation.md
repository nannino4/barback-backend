# Barback Backend - Complete API Documentation

This document provides a comprehensive overview of all API endpoints available in the Barback backend application. The API is designed to support a progressive web app for cocktail bar inventory management.

## Table of Contents
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Modules](#api-modules)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Development Setup](#development-setup)

## Quick Start

### Base URL
```
Production: https://api.barback.app
Development: http://localhost:3000
```

### Authentication
Most endpoints require JWT authentication. Include the access token in the Authorization header:
```http
Authorization: Bearer <access_token>
```

### Basic Workflow
1. **Register/Login** → Get access tokens
2. **Start Subscription** → Required for organization creation
3. **Create Organization** → Your bar/business
4. **Invite Members** → Add staff to organization
5. **Setup Categories** → Organize your products
6. **Add Products** → Your inventory items
7. **Manage Inventory** → Track stock changes

## Authentication

### Core Authentication Endpoints
```http
POST /api/auth/register/email     # Register new user
POST /api/auth/login/email        # Login with credentials
POST /api/auth/refresh-token      # Refresh access token
```

### Google OAuth Endpoints
```http
GET  /api/auth/oauth/google           # Get Google OAuth URL
POST /api/auth/oauth/google/callback  # Handle OAuth callback
```

### Email Verification
```http
POST /api/auth/send-verification-email  # Send verification email
POST /api/auth/verify-email            # Verify with token
GET  /auth/verify-email/:token     # Browser verification
```

### Password Reset
```http
POST /api/auth/forgot-password     # Request password reset
POST /api/auth/reset-password      # Reset with token
GET  /auth/reset-password/:token  # Validate reset token
```

## API Modules

### 🔐 Authentication & User Management
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/auth/register/email` | POST | Register new user | ❌ |
| `/api/auth/login/email` | POST | Login with email/password | ❌ |
| `/api/auth/refresh-token` | POST | Refresh access token | ❌ |
| `/api/users/me` | GET | Get current user profile | ✅ |
| `/api/users/me` | PUT | Update user profile | ✅ |
| `/api/users/me/password` | PUT | Change password | ✅ |
| `/api/users/me` | DELETE | Delete account | ✅ |

### 💳 Subscription Management
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/subscription` | GET | Get user's subscription | ✅ |
| `/api/subscription/trial-eligibility` | GET | Check trial eligibility | ✅ |
| `/api/subscription/start-owner-trial` | POST | Start trial subscription | ✅ |
| `/api/subscription/cancel` | DELETE | Cancel subscription | ✅ |
| `/api/subscription/plans` | GET | Get available plans | ❌ |
| `/api/payment/methods` | GET | Get payment methods | ✅ |
| `/api/payment/methods` | POST | Add payment method | ✅ |
| `/api/payment/methods/:id` | DELETE | Remove payment method | ✅ |

### 🏢 Organization Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/orgs` | GET | List user's organizations | ✅ | Any |
| `/api/orgs` | POST | Create organization | ✅ | Owner |
| `/api/orgs/:id` | PUT | Update organization | ✅ | Owner |
| `/api/orgs/:id/members` | GET | List members | ✅ | Any |
| `/api/orgs/:id/members/:userId/role` | PUT | Update member role | ✅ | Owner/Manager |

### 📧 Invitation Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/orgs/:orgId/invitations` | POST | Send invitation | ✅ | Owner/Manager |
| `/api/orgs/:orgId/invitations` | GET | List org invitations | ✅ | Owner/Manager |
| `/api/orgs/:orgId/invitations/:id` | DELETE | Revoke invitation | ✅ | Owner/Manager |
| `/api/invites` | GET | Get user's invitations | ✅ | Any |
| `/api/invites/accept/:token` | POST | Accept invitation | ✅ | Any |
| `/api/invites/decline/:token` | POST | Decline invitation | ✅ | Any |
| `/public/invitations/details/:token` | GET | Get invitation details | ❌ | Any |
| `/public/invitations/accept/:token` | POST | Accept (anonymous) | ❌ | Any |
| `/public/invitations/decline/:token` | POST | Decline (anonymous) | ❌ | Any |

### 📁 Category Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/orgs/:orgId/categories` | GET | List categories | ✅ | Any |
| `/api/orgs/:orgId/categories/:id` | GET | Get category | ✅ | Any |
| `/api/orgs/:orgId/categories` | POST | Create category | ✅ | Owner/Manager |
| `/api/orgs/:orgId/categories/:id` | PUT | Update category | ✅ | Owner/Manager |
| `/api/orgs/:orgId/categories/:id` | DELETE | Delete category | ✅ | Owner/Manager |

### 📦 Product Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/orgs/:orgId/products` | GET | List products | ✅ | Any |
| `/api/orgs/:orgId/products/:id` | GET | Get product | ✅ | Any |
| `/api/orgs/:orgId/products` | POST | Create product | ✅ | Owner/Manager |
| `/api/orgs/:orgId/products/:id` | PUT | Update product | ✅ | Owner/Manager |
| `/api/orgs/:orgId/products/:id` | DELETE | Delete product | ✅ | Owner/Manager |

### 📊 Inventory Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/orgs/:orgId/products/:id/adjust-stock` | POST | Adjust stock | ✅ | Any |
| `/api/orgs/:orgId/products/:id/logs` | GET | Get inventory logs | ✅ | Any |

### 👑 Admin Management
| Endpoint | Method | Description | Auth | Roles |
|----------|--------|-------------|------|-------|
| `/api/admin/users` | GET | List all users | ✅ | Admin |
| `/api/admin/users/:id` | GET | Get user details | ✅ | Admin |
| `/api/admin/users/:id/profile` | PUT | Update user profile | ✅ | Admin |
| `/api/admin/users/:id/role` | PUT | Update user role | ✅ | Admin |

## Common Patterns

### Organization-Scoped Resources
Most business endpoints are scoped to organizations:
```
/orgs/:orgId/categories
/orgs/:orgId/products
/orgs/:orgId/products/:productId/adjust-stock
```

### Role-Based Access Control
Three organization roles with different permissions:
- **Owner**: Full access, can delete organization
- **Manager**: Create/update resources, invite members
- **Staff**: View resources, adjust inventory

### Pagination Pattern
```http
GET /api/admin/users?limit=25&offset=50
```

### Filtering Pattern
```http
GET /api/orgs/123/products?categoryId=456
GET /api/orgs/123/products/789/logs?startDate=2024-01-01&endDate=2024-01-31
```

### Standard Response Formats
**Success Response:**
```json
{
  "id": "resource_id",
  "name": "Resource Name",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Error Handling

### HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Resource created
- `204 No Content` - Successful with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server error

### Common Error Messages
```json
// Validation error
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be a valid email"
  ],
  "error": "Bad Request"
}

// Authentication error
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

// Permission error
{
  "statusCode": 403,
  "message": "Insufficient permissions for this organization",
  "error": "Forbidden"
}
```

## Rate Limiting

### Limits by Endpoint Type
- **Authentication**: 5 requests/minute per IP
- **General API**: 100 requests/minute per user
- **Admin endpoints**: 50 requests/minute per admin
- **Public endpoints**: 20 requests/minute per IP

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Frontend Integration Examples

### React/TypeScript Integration
```typescript
// API client setup
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string }>('/api/auth/login/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Organization methods
  async getOrganizations() {
    return this.request<Organization[]>('/orgs');
  }

  async createProduct(orgId: string, product: CreateProductDto) {
    return this.request<Product>(`/orgs/${orgId}/products`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }
}

export const apiClient = new ApiClient();
```

### Vue.js Integration
```javascript
// Composable for API calls
import { ref, computed } from 'vue'

export function useApi() {
  const token = ref(localStorage.getItem('token'))
  const isAuthenticated = computed(() => !!token.value)

  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { 'Authorization': `Bearer ${token.value}` }),
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  const login = async (email, password) => {
    const tokens = await apiCall('/api/auth/login/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    token.value = tokens.access_token
    localStorage.setItem('token', tokens.access_token)
    localStorage.setItem('refreshToken', tokens.refresh_token)
    
    return tokens
  }

  return {
    token,
    isAuthenticated,
    apiCall,
    login,
  }
}
```

## Additional Resources

- [Authentication API Documentation](./authentication.md)
- [User Management API Documentation](./user-management.md)
- [Subscription Management API Documentation](./subscription-management.md)
- [Organization Management API Documentation](./organization-management.md)
- [Invitation Management API Documentation](./invitation-management.md)
- [Category Management API Documentation](./category-management.md)
- [Product Management API Documentation](./product-management.md)
- [Inventory Management API Documentation](./inventory-management.md)
- [Admin Management API Documentation](./admin-management.md)

## Support

For questions about API integration or issues:
- Review the detailed module documentation
- Check the error response format and status codes
- Ensure proper authentication and authorization
- Verify request body formatting and required fields

The API follows RESTful conventions and provides comprehensive error messages to assist with debugging and integration.
