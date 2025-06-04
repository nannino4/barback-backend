# Barback Application - MVP Development Roadmap

This document outlines the development tasks for the Minimum Viable Product (MVP) of the Barback application.

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
  - [X] Define schema (e.g., name, owner, associated inventories).
  - [X] Define org related user roles: Owner, Manager, Staff.
- [X] **Subscription Model**:
  - [X] Define schema with embedded plan object (eliminates need for separate SubscriptionPlan model).
- [X] **Product Model**:
  - [X] Define schema (e.g., name, category link, unit of measure, par level).
- [X] **Category Model**:
  - [X] Define schema (e.g., name, description) for product categorization.
- [X] **Inventory Model**:
  - [X] Define schema for current stock levels (product link, quantity).
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

#### Billing Management
- [ ] **Stripe Setup**:
  - [ ] Set up Stripe account and configure API keys.
  - [ ] Install Stripe SDK and implement webhook handling.
- [ ] **Core Billing Models**:
  - [ ] Implement CRUD operations for Subscription model.
  - [ ] Define Trial (3 months) and Basic plan configurations.
- [ ] **Subscription Lifecycle**:
  - [ ] Create trial subscriptions for new owners.
  - [ ] Implement automatic Trial → Basic conversion at trial end.
  - [ ] Sync billing status with Stripe webhooks (active, past_due, canceled).
  - [ ] Implement subscription cancellation.
- [ ] **Payment Methods**:
  - [ ] Allow users to add/update/remove payment methods via Stripe.
  - [ ] Implement default payment method selection.
- [ ] **Access Control**:
  - [ ] Implement subscription-based access control.
  - [ ] Restrict organization creation to active subscribers.
- [ ] **API Endpoints**:
  - [ ] `/subscription` - Get user's subscription.
  - [ ] `/webhooks/stripe` - Handle Stripe events.
- [ ] **Email Notifications**:
  - [ ] Trial expiration warnings (7-day, 3-day, 1-day reminders).
  - [ ] Automatic billing activation notification when trial ends.
  - [ ] Payment failure notifications.

#### Organization Management
- [ ] **Core Functionality**:
  - [ ] Implement Organization creation (ensuring one active organization per owner/subscription).
  - [ ] Implement functionality for an Owner to manage their organization details.
  - [ ] Implement multi-inventory support within an organization (conceptual setup, linking inventories to an org).
- [ ] **User Management within Organization**:
  - [ ] Allow Owners/Managers to invite users to their organization.
  - [ ] Allow Owners/Managers to assign/update roles for users within their organization.
- [ ] **OrgRole-Based Access Control (RBAC)**:
  - [ ] Implement guards for OrgRoles.
- [ ] **API Endpoints**:
  - [ ] Develop Organization management endpoints (CRUD for organizations, user management within orgs).

#### Category Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Product Categories.
  - [ ] Implement functionality to link Products to Categories.
- [ ] **API Endpoints**:
  - [ ] Develop Category management endpoints.

#### Product Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Products (name, category, unit, par level).
- [ ] **API Endpoints**:
  - [ ] Develop Product management endpoints.

#### Inventory Management
- [ ] **Stock Tracking**:
  - [ ] Implement manual stock adjustments with reason codes (creating inventory log entries).
  - [ ] Implement real-time stock level display (calculating from logs or a snapshot).
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
