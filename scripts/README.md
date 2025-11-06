# Database Scripts

This directory contains MongoDB scripts for database operations.

## Seed Sample Organizations

The `seed-sample-organizations.js` script creates sample organizations with different roles and invitations for testing the application.

### What it creates:

**5 Organizations:**
1. **The Cocktail Lounge Roma** (Owner: Giovanni, Status: Trial)
2. **Jerry Thomas Speakeasy** (Owner: Giovanni, Status: Active)
   - John Fish as STAFF member
3. **Enoteca Provincia Romana** (Owner: Giovanni, Status: Active)
4. **Terrazza Panoramica** (Owner: John Fish, Status: Active)
   - Giovanni Cefalo as MANAGER
5. **The Drunken Ship - Pub Irlandese** (Owner: John Fish, Status: Active)

**3 Pending Invitations:**
- Giovanni invited to The Drunken Ship as MANAGER
- John invited to Enoteca Provincia Romana as STAFF
- bartender@example.com invited to The Cocktail Lounge as STAFF

### How to run:

```bash
# From the backend directory
mongosh barback_dev scripts/seed-sample-organizations.js
```

Or using Docker (if MongoDB is running in Docker):

```bash
# Copy script to container and execute
docker cp scripts/seed-sample-organizations.js <container_name>:/tmp/
docker exec -it <container_name> mongosh barback_dev /tmp/seed-sample-organizations.js
```

### Notes:

- The script will clean up any existing sample data before inserting new data
- It's safe to run multiple times (idempotent)
- Uses predefined ObjectIds for consistency
- All sample subscriptions use the `sub_sample_*` prefix in their Stripe IDs
