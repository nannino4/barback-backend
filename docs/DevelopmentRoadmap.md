# Barback Application - MVP Development Roadmap

This document outlines the development tasks for the Minimum Viable Product (MVP) of the Barback application.

## 🎯 Current Status Summary

**✅ Completed Modules:**
- **User Management**: Full CRUD, authentication, profile management
- **Admin Management**: User administration, role management 
- **Subscription Management**: Stripe integration, automatic trial-to-paid conversion, payment methods, webhooks
- **Organization Management**: Basic organization CRUD, member management, role-based access control

**🔄 Next Priority:**
- **Organization Invitation Integration**
- **Category Management**: Product categorization system
- **Product Management**: Core inventory items with par levels

**📊 Overall Progress**: ~50% of MVP features completed

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
- [ ] **Email/Password Authentication**:
  - [X] Implement User Registration with email and password.
  - [ ] Implement Email Verification for new accounts.
  - [X] Implement User Login with email and password.
  - [ ] Implement Password Reset functionality via email.
  - [ ] Implement Email Service for organization invitations.
- [ ] **Google OAuth Authentication**:
  - [ ] Implement User Registration with Google.
  - [ ] Implement User Login with Google.
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
- [ ] **Basic Organization API Endpoints**:
  - [X] `GET /orgs` - List all organizations user is in (optional filter by orgRole)
  - [X] `GET /orgs/{id}/members` - List organization members
  - [ ] `GET /invitations` - List user's invitations
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
- [ ] **User Management within Organization**:
  - [ ] Allow Owners/Managers to invite users to their organization via app.
  - [ ] Allow Owners/Managers to invite users to their organization via email.
  - [ ] Implement email invitation system with accept/decline functionality.
  - [ ] Allow users to view organizations they're invited to and organizations they're part of.
  - [ ] Implement invitation token generation and validation.
  - [ ] Handle user registration with automatic invitation acceptance.
- [ ] **Advanced Invitation Workflow** (Future Enhancement):
  - [ ] Generate secure invitation tokens with expiration.
  - [ ] Send invitation emails with accept/decline links.
  - [ ] Handle invitation acceptance for existing users.
  - [ ] Handle invitation acceptance during user registration.
  - [ ] Handle partial acceptance (user accepts but hasn't completed registration).
  - [ ] Allow invitation decline and cleanup.
  - [ ] Allow invitation revocation by inviter (Owner/Manager).
  - [ ] Prevent duplicate invitations to same email for same organization.
  - [ ] Handle expired invitations cleanup.
- [ ] **API Endpoints**:
  - [ ] Develop Organization management endpoints (CRUD for organizations, user management within orgs).
  - [ ] `/orgs/{id}/invites` - Send user invites.
  - [ ] `/orgs/{id}/invites/{invitationId}/revoke` - Revoke pending invitation.
  - [ ] `/invites/accept/{token}` - Accept organization invitation.
  - [ ] `/invites/decline/{token}` - Decline organization invitation.

#### Category Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Product Categories.
  - [ ] Implement functionality to link Products to Categories.
- [ ] **API Endpoints**:
  - [ ] Develop Category management endpoints.

#### Product Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Products (name, category, unit, par level, current quantity).
- [ ] **API Endpoints**:
  - [ ] Develop Product management endpoints.

#### Inventory Management
- [ ] **Stock Tracking**:
  - [ ] Implement manual stock adjustments with reason codes (creating inventory log entries).
  - [ ] Implement real-time stock level display (from Product.currentQuantity).
- [ ] **Reporting**:
  - [ ] Implement generation of inventory reports by date range.
  - [ ] Implement generation of inventory reports for a specific date (snapshot).
- [ ] **API Endpoints**:
  - [ ] Develop Inventory management endpoints (adjust stock, view stock, generate reports).

#### Alerts & Notifications
- [ ] **Low Stock Alerts**:
  - [ ] Implement system to trigger alerts when product stock falls below its defined par level.
  - [ ] Allow users to define/update par levels for products.
- [ ] **Time-Based Reminders**:
  - [ ] Implement basic functionality for creating and triggering time-based reminders (e.g., weekly inventory count reminder).
- [ ] **Notification Delivery**:
  - [ ] Implement Email notifications for alerts.
  - [ ] Implement Email notifications for organization invitations.
  - [ ] (Optional MVP Stretch) Implement basic Push notification infrastructure for alerts.
- [ ] **API Endpoints**:
  - [ ] Develop Alerts endpoints (configure alerts, view active alerts).

#### Analytics (Basic MVP)
- [ ] **Data Collection**:
  - [ ] Ensure inventory changes (consumption) are logged appropriately for analytics.
- [ ] **Consumption Tracking**:
  - [ ] Implement API to retrieve product consumption data by a specified time period.
  - [ ] Implement API to retrieve product consumption data by category over a time period.
  - [ ] Implement API to retrieve consumption data for a specific product over a time period.
- [ ] **API Endpoints**:
  - [ ] Develop Analytics endpoints to expose consumption data.

---
This roadmap will be updated as development progresses.
