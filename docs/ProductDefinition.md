# Barback - Product Definition

## MVP Stage

### Target Users
- **User Profile**: Cocktail bar owners, managers, bartenders in Rome/Italy using manual inventory systems
- **Value Proposition**: 
  - **Owners**: Reduce waste, gain consumption insights, optimize ordering, identify sitting stock
  - **Managers**: Real-time stock visibility, improve staff communication, automated low stock reminders, faster inventory accounting
  - **Staff**: Faster inventory accounting

### Features

#### Auth
- Registration and login via
  - Google
  - email/password
    - Password reset via email
    - Email verification
- Role-based access (Owner, Manager, Staff)

#### Organizations
- Multi-inventory management
- Each owner has one organization per subscription

#### Inventory
- Create/edit/remove products with name, category, unit, par level
- Manual stock adjustments with reason codes via inventory logs
- Real-time stock level display
- Generate inventory reports by date range or by specific date

#### Alerts
- Low stock alerts with user-defined thresholds

#### Notifications
- Email/Push notifications
- Time based reminders

#### Analytics
- Consumption by time period, category, product

## Growth Stage

### Target Users
- **User Profile**: Scaling bar operations seeking operational efficiency and cost optimization
- **Value Proposition**: Automate ordering, optimize profit through recipe management, simplify staff management

### Features

#### POS Integration
- Connect Square, Toast, Resy POS systems
- Auto-deduct inventory based on sales data
- Forecast demand using historical sales patterns

#### Suppliers
- Supplier database with contact info and product catalogs
- Create order templates with preferred suppliers
- Auto-generate orders when stock hits reorder point
- Order history tracking with delivery confirmations

#### Recipes
- Create cocktail recipes with ingredient quantities
- Auto-calculate recipe costs based on current inventory prices
- Profit margin analysis per cocktail
- Auto-deduct ingredients when drinks are recorded

#### Staff Management
- Shift scheduling with role assignments
- Opening/closing checklists with task verification
- Staff performance tracking for inventory accuracy
- Task assignment with completion deadlines

## Advanced Stage

### Target Users
- **User Profile**: Large bar operations and restaurant groups requiring enterprise-level features
- **Value Proposition**: AI-driven optimization, complete business management, marketplace access

### Features

#### AI Analytics
- Predictive ordering based on weather, events, seasonality
- Anomaly detection for theft or waste patterns
- Customer preference correlation with inventory needs
- Automated seasonal menu recommendations

#### Scanning
- Barcode/QR scanning for instant inventory updates
- Mobile app for off-site inventory checks
- Auto-recognize products via image scanning
- Generate/print shelf labels with QR codes

#### Customer Management
- Customer database with order history
- Event booking and inventory planning
- Reservation system integration
- Customer preference tracking for targeted promotions

#### Finance
- Monthly budget planning with variance reports
- Tax reporting with category breakdowns
- QuickBooks/Xero accounting integration
- Credit card processing for supplier payments

#### Marketplace
- Browse vetted suppliers with negotiated platform rates
- Discover trending products by region
- Bulk purchasing coordination with other platform users
- Marketing campaign management for product launches
