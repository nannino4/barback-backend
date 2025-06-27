# Barback Application - MVP Development Roadmap

This document outlines the development tasks for the Minimum Viable Product (MVP) of the Barback application.

## 🎯 Current Status Summary

**✅ Completed Modules:**
- **User Management**: Full CRUD, authentication, profile management
- **Admin Management**: User administration, role management 
- **Email/Password Authentication**: Email verification, password reset, secure token management
- **Subscription Management**: Stripe integration, automatic trial-to-paid conversion, payment methods, webhooks
- **Organization Management**: Complete organization system with invitation management, member roles, email notifications
- **Category Management**: Product categorization system with hierarchical structure
- **Product Management**: Core inventory items with category linking and stock tracking
- **Inventory Management**: Stock adjustments and reporting system

**🔄 Next Priority:**
- **Alerts & Notifications**: Low stock alerts and time-based reminders

**📊 Overall Progress**: ~95% of MVP features completed

## MVP Stage

### Workspace Setup
- [X] Set up NestJS backend project with TypeScript.
- [X] Define product requirements.
- [X] Define coding guidelines.
- [X] Define testing guidelines.
- [X] Configure ESLint and Prettier according to `CodingGuidelines.md`.
- [X] Configure different environments (dev, test, prod).
- [X] Define logging guidelines and configure logging.

### Define Core Data Models
- [X] **User Model**:
  - [X] Define schema (e.g., email, password hash, Google ID, roles).
  - [X] Define roles: Admin, User.
- [X] **Organization Model**:
  - [X] Define schema (e.g., name, owner, single inventory per organization).
  - [X] Define org related user roles: Owner, Manager, Staff.
- [X] **Subscription Model**:
  - [X] Define schema.
- [X] **Product Model**:
  - [X] Define schema (e.g., name, category link, unit of measure, par level).
- [X] **Category Model**:
  - [X] Define schema (e.g., name, description) for product categorization.
- [X] **Inventory Model**:
  - [X] Define schema for current stock levels integrated into Product model.
  - [X] Define schema for inventory logs (stock adjustments, reason codes, timestamp, user).
- [X] **Alerts Model**:
  - [X] Define schema (e.g., type - low stock/reminder, target - product/task, threshold, status).

### Features

#### Authentication & Authorization
- [X] **User Session Strategy**:
  - [X] Define and implement user session management (e.g., JWT-based).
- [X] **Email/Password Authentication**:
  - [X] Implement User Registration with email and password.
  - [X] Implement Email verification for new accounts
  - [X] Implement User Login with email and password.
  - [X] Implement Password reset functionality via email

**✅ Email/Password Authentication Status: COMPLETED**
- Full email verification system with secure token generation and expiration
- Password reset functionality with secure tokens and email delivery
- Automatic verification email sending upon registration
- EmailService with Nodemailer integration for reliable email delivery
- Comprehensive API endpoints: `/auth/send-verification-email`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`
- Security features: token expiration, one-time use tokens, email enumeration prevention
- Complete test coverage for all email authentication flows
- Integration with existing authentication system
- [ ] **Google OAuth Authentication**:
  - [ ] Implement User Registration with Google OAuth
  - [ ] Implement User Login with Google OAuth
- [X] **UserRole-Based Access Control (RBAC)**:
  - [X] Implement guards for UserRoles.
- [X] **User Account Management (Admin)**:
  - [X] Implement Admin functionality to list all users.
  - [X] Implement Admin functionality to view individual user details.
  - [X] Implement Admin functionality to update user profile information.
  - [X] Implement Admin functionality to manage user roles (e.g., assign/revoke Admin role).
  - [X] Implement Admin functionality to manage user account status (e.g., activate/deactivate).
  - [X] Implement Admin functionality to delete user accounts (consider soft delete).
  - [X] Develop API endpoints for these admin user management operations (e.g., under `/admin/users`).
- [X] **User Profile Management (User-Self)**:
  - [X] Allow users to view their own profile information.
  - [X] Allow users to update their own profile information (e.g., name, contact details - excluding email/password which are handled separately).
  - [X] Allow users to change their password (after verifying current password).
  - [X] Allow users to delete their own account (consider implications and data retention policies).
  - [X] Develop API endpoints for these user profile management operations (e.g., under `/users/me`).

#### Subscription Management
- [X] **Stripe Setup**:
  - [X] Set up Stripe account and configure API keys.
  - [X] Install Stripe SDK and implement webhook handling.
- [X] **Core Subscription Models**:
  - [X] Implement CRUD operations for Subscription model.
  - [X] Define Trial (3 months) and Basic plan configurations.
- [X] **Subscription Lifecycle**:
  - [X] Create trial subscriptions for organization owners only (not automatic for all users).
  - [X] Implement automatic Trial → Basic conversion at trial end.
  - [X] Sync billing status with Stripe webhooks (active, past_due, canceled).
  - [X] Implement subscription cancellation.
- [X] **Payment Methods**:
  - [X] Allow users to add/update/remove payment methods via Stripe.
  - [X] Implement default payment method selection.
- [X] **Access Control**:
  - [X] Implement subscription-based access control (`ActiveSubscriptionGuard`).
  - [X] Restrict organization creation to active subscribers.
- [X] **API Endpoints**:
  - [X] `/subscription` - Get user's subscription.
  - [X] `/subscription/start-owner-trial` - Start trial for organization owners.
  - [X] `/subscription/cancel` - Cancel subscription.
  - [X] `/subscription/plans` - Get available plans.
  - [X] `/subscription/trial-eligibility` - Check trial eligibility.
  - [X] `/payment/methods` - Manage payment methods.
  - [X] `/webhooks/stripe` - Handle Stripe events.
- [ ] **Email Notifications** (Excluded per user request):
  - [ ] Trial expiration warnings (7-day, 3-day, 1-day reminders).
  - [ ] Automatic billing activation notification when trial ends.
  - [ ] Payment failure notifications.

**✅ Subscription Management Status: COMPLETED**
- Full Stripe integration with automatic trial-to-paid conversion
- Trial subscriptions only created when users want to become organization owners
- Comprehensive payment method management
- Webhook handling for subscription status synchronization
- Access control guards for subscription-based features
- Complete API endpoints for subscription and payment management
- Documentation: `/src/subscription/SubscriptionDocumentation.md`

**📋 Deployment Checklist:**
- [ ] Set up actual Stripe account and get production API keys
- [ ] Create Stripe products and pricing plans
- [ ] Configure webhook endpoints in Stripe dashboard
- [ ] Test subscription flow end-to-end
- [ ] Deploy to production environment

#### Organization Management
**✅ Basic Organization Management COMPLETED**
- Depends on: Subscription Management (✅ Completed)
- Integration: Uses `ActiveSubscriptionGuard` to restrict organization creation
- [X] **Basic Organization API Endpoints**:
  - [X] `GET /orgs` - List all organizations user is in (optional filter by orgRole)
  - [X] `GET /orgs/{id}/members` - List organization members
  - [X] `POST /orgs` - Create organization
  - [X] `PUT /orgs/{id}` - Update organization name/settings (owner only)
  - [X] `PUT /orgs/{id}/members/{userId}/role` - Update member role (owners/managers only)
- [X] **Role-Based Access Control**:
  - [X] Implement `OrgRolesGuard` for organization-level permissions
  - [X] Prevent owner role assignment through role updates
- [X] **Data Models & Schemas**:
  - [X] Organization schema with proper indexing
  - [X] UserOrgRelationship schema
  - [X] OrgInvite schema
  - [X] Input/Output DTOs with proper validation and transformation
- [X] **Organization Invitation System**:
  - [X] Implement invitation token generation and validation logic
  - [X] Handle invitation acceptance for existing and new users
- [X] **Invitation API Endpoints**:
  - [X] `GET /invitations` - List user's pending invitations
  - [X] `POST /orgs/{id}/invites` - Send organization invitation
  - [X] `POST /invitations/accept/{token}` - Accept invitation (logged-in users)
  - [X] `POST /invitations/decline/{token}` - Decline invitation (logged-in users)
  - [X] `POST /public/invitations/accept/{token}` - Accept invitation (anonymous users)
  - [X] `POST /public/invitations/decline/{token}` - Decline invitation (anonymous users)
  - [X] `GET /public/invitations/details/{token}` - Get invitation details
  - [X] `DELETE /orgs/{id}/invites/{invitationId}` - Revoke invitation

**✅ Organization Management Status: COMPLETED**
- Full organization CRUD operations with member management
- Complete invitation system with email notifications
- Token-based invitation security with 7-day expiration
- Support for both authenticated and anonymous invitation acceptance
- Role-based access control for all organization operations
- Automatic invitation processing during user registration
- Beautiful HTML email templates for invitations
- Comprehensive API endpoints following RESTful conventions

#### Category Management
- [X] **Data Layer Setup**:
  - [X] Create Category Mongoose schema with validation and indexes
  - [X] Create Category DTOs (CreateCategoryDto, UpdateCategoryDto, CategoryDto)
- [X] **Service Implementation**:
  - [X] Implement CategoryService with CRUD operations and hierarchy validation
  - [X] Add business logic for preventing circular references and handling deletions
- [X] **API Endpoints**:
  - [X] `GET /orgs/:orgId/categories` - List categories (with optional tree structure)
  - [X] `GET /orgs/:orgId/categories/:id` - Get single category
  - [X] `POST /orgs/:orgId/categories` - Create category (owners/managers only)
  - [X] `PUT /orgs/:orgId/categories/:id` - Update category (owners/managers only)
  - [X] `DELETE /orgs/:orgId/categories/:id` - Delete category (owners/managers only)
- [X] **Access Control**:
  - [X] Extend OrgRolesGuard to restrict create/update/delete to owners and managers
  - [X] Ensure all operations are scoped to user's organization

**✅ Category Management Status: COMPLETED**
- Full category CRUD operations with hierarchical support
- Parent-child relationship validation and circular reference prevention
- Role-based access control (owners/managers can modify, all members can view)
- Proper data validation and error handling
- Integration with organization-scoped access control
- Comprehensive API endpoints following RESTful conventions

#### Product Management
- [X] **Data Layer Setup**:
  - [X] Create Product Mongoose schema with category linking and validation
  - [X] Create Product DTOs (CreateProductDto, UpdateProductDto, ProductDto)
- [X] **Service Implementation**:
  - [X] Implement ProductService with CRUD operations and category validation
  - [X] Add business logic for stock quantity tracking and category assignments
- [X] **API Endpoints**:
  - [X] `GET /orgs/:orgId/products` - List products (with category filtering)
  - [X] `GET /orgs/:orgId/products/:id` - Get single product
  - [X] `POST /orgs/:orgId/products` - Create product
  - [X] `PUT /orgs/:orgId/products/:id` - Update product
  - [X] `DELETE /orgs/:orgId/products/:id` - Delete product

**✅ Product Management Status: COMPLETED**
- Full product CRUD operations with category integration
- Organization-scoped access control with role-based permissions
- Unique product name validation within organizations
- Stock quantity tracking and management
- Category filtering support for product listings
- Comprehensive data validation and error handling
- RESTful API endpoints following project conventions

#### Inventory Management
- [X] **Data Layer Setup**:
  - [X] Create InventoryLog Mongoose schema for tracking stock changes
  - [X] Create inventory DTOs (StockAdjustmentDto, InventoryReportDto)
- [X] **Service Implementation**:
  - [X] Implement manual stock adjustments with reason codes and logging
  - [X] Implement inventory report generation by date range and snapshots
- [X] **API Endpoints**:
  - [X] `POST /orgs/:orgId/products/:productId/adjust-stock` - Manual stock adjustment
  - [X] `GET /orgs/:orgId/products/:productId/logs` - Get product inventory history

**✅ Inventory Management Status: COMPLETED**
- Full stock adjustment system with support for purchase, consumption, adjustment, and stocktake types
- Comprehensive inventory logging with audit trails and user tracking
- Simple quantity-based adjustments (positive/negative numbers) with validation to prevent negative stock
- Organization-scoped access control with role-based permissions
- Proper data validation and error handling
- Integration with existing product management system
- API endpoints following RESTful conventions and project patterns

#### Alerts & Notifications
- [ ] **Data Layer Setup**:
  - [ ] Create Alert Mongoose schema for low stock and scheduled alerts
  - [ ] Create alert DTOs (CreateAlertDto, UpdateAlertDto, AlertDto)
- [ ] **Service Implementation**:
  - [ ] Implement alert trigger system for low stock detection
  - [ ] Implement time-based reminder scheduling and execution
  - [ ] Integrate email service for alert notifications
- [ ] **API Endpoints**:
  - [ ] `GET /orgs/:orgId/alerts` - List organization alerts
  - [ ] `POST /orgs/:orgId/alerts` - Create new alert
  - [ ] `PUT /orgs/:orgId/alerts/:id` - Update alert configuration
  - [ ] `DELETE /orgs/:orgId/alerts/:id` - Delete alert

#### Analytics (Basic MVP)
- [ ] **Service Implementation**:
  - [ ] Implement consumption tracking from inventory logs
  - [ ] Create analytics service for consumption reports by time period, category, and product
- [ ] **API Endpoints**:
  - [ ] `GET /orgs/:orgId/analytics/consumption?category=mycategory&productId=myproductid` - Product consumption by time period, category and product

- [ ] **Next steps**:
  - [ ] Rate limiting

---
This roadmap will be updated as development progresses.
