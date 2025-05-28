# Barback Application - MVP Development Roadmap

This document outlines the development tasks for the Minimum Viable Product (MVP) of the Barback application.

## MVP Stage

### Workspace Setup
- [X] Set up NestJS backend project with TypeScript.
- [X] Define product requirements.
- [X] Define coding guidelines.
- [X] Define testing guidelines.
- [X] Configure ESLint and Prettier according to `CodingGuidelines.md`.
- [X] Establish basic project structure (modules, services, controllers).
- [X] Configure different environments (dev, test, prod).

### Define Core Data Models
- [X] **User Model**:
  - [X] Define schema (e.g., email, password hash, Google ID, roles).
  - [X] Implement roles: Owner, Manager, Staff.
- [X] **Organization Model**:
  - [X] Define schema (e.g., name, owner, associated inventories).
- [X] **Subscription Model**:
  - [X] Define schema (e.g., tier, status, organization link).
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
- [ ] **User Session Strategy**:
  - [ ] Define and implement user session management (e.g., JWT-based).
- [ ] **Email/Password Authentication**:
  - [ ] Implement User Registration with email and password.
  - [ ] Implement Email Verification for new accounts.
  - [ ] Implement User Login with email and password.
  - [ ] Implement Password Reset functionality via email.
- [ ] **Google OAuth Authentication**:
  - [ ] Implement User Registration with Google.
  - [ ] Implement User Login with Google.
- [ ] **Role-Based Access Control (RBAC)**:
  - [ ] Implement guards and decorators for Owner, Manager, Staff roles.
- [ ] **API Endpoints**:
  - [ ] Develop all necessary authentication endpoints (`/auth/register`, `/auth/login`, `/auth/google`, `/auth/reset-password`, etc.).

#### Organization Management
- [X] **Core Functionality**:
  - [X] Implement Organization creation (ensuring one active organization per owner/subscription).
  - [X] Implement functionality for an Owner to manage their organization details.
  - [ ] Implement multi-inventory support within an organization (conceptual setup, linking inventories to an org).
- [X] **User Management within Organization**:
  - [X] Allow Owners/Managers to invite users to their organization.
  - [X] Allow Owners/Managers to assign/update roles for users within their organization.
- [X] **API Endpoints**:
  - [X] Develop Organization management endpoints (CRUD for organizations, user management within orgs).

#### Subscription Management (Basic MVP)
- [X] **Core Functionality**:
  - [X] Define basic subscription tier structure (e.g., MVP tier).
  - [X] Implement linking of an organization to a subscription.
- [X] **API Endpoints**:
  - [X] Develop basic Subscription management endpoints (e.g., view current subscription).

#### Product Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Products (name, category, unit, par level).
- [ ] **API Endpoints**:
  - [ ] Develop Product management endpoints.

#### Category Management
- [ ] **Core Functionality**:
  - [ ] Implement CRUD operations for Product Categories.
  - [ ] Implement functionality to link Products to Categories.
- [ ] **API Endpoints**:
  - [ ] Develop Category management endpoints.

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
