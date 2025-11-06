/**
 * MongoDB Script to Seed Sample Organizations
 * 
 * This script creates sample organizations with different roles and invitations
 * for testing the Barback application.
 * 
 * Users:
 * - Giovanni Cefalo (giovanni.cefalo@gmail.com) - ID: 68f1154502e63152ac91933a
 * - John Fish (johnd.fish4@gmail.com) - ID: 690aec91115fda44ec062b92
 * 
 * Run with: mongosh barback_dev scripts/seed-sample-organizations.js
 */

// User IDs
const giovanniId = ObjectId("68f1154502e63152ac91933a");
const johnId = ObjectId("690aec91115fda44ec062b92");

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================
const subscriptions = [
    {
        _id: ObjectId("673b0000000000000000001a"),
        userId: giovanniId,
        stripeSubscriptionId: "sub_sample_cocktail_lounge_trial",
        status: "trialing",
        autoRenew: true,
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
        updatedAt: new Date("2025-11-01T10:00:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000001b"),
        userId: giovanniId,
        stripeSubscriptionId: "sub_sample_speakeasy_bar_active",
        status: "active",
        autoRenew: true,
        createdAt: new Date("2025-10-15T14:30:00.000Z"),
        updatedAt: new Date("2025-10-15T14:30:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000001c"),
        userId: giovanniId,
        stripeSubscriptionId: "sub_sample_wine_bar_active",
        status: "active",
        autoRenew: true,
        createdAt: new Date("2025-09-20T09:15:00.000Z"),
        updatedAt: new Date("2025-09-20T09:15:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000001d"),
        userId: johnId,
        stripeSubscriptionId: "sub_sample_rooftop_bar_active",
        status: "active",
        autoRenew: true,
        createdAt: new Date("2025-08-10T16:45:00.000Z"),
        updatedAt: new Date("2025-08-10T16:45:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000001e"),
        userId: johnId,
        stripeSubscriptionId: "sub_sample_pub_irlandese_active",
        status: "active",
        autoRenew: true,
        createdAt: new Date("2025-07-05T11:20:00.000Z"),
        updatedAt: new Date("2025-07-05T11:20:00.000Z"),
    },
];

// ============================================================================
// ORGANIZATIONS (Italian Cocktail Bars & Venues in Rome)
// ============================================================================
const orgs = [
    {
        _id: ObjectId("673b0000000000000000002a"),
        name: "The Cocktail Lounge Roma",
        ownerId: giovanniId,
        subscriptionId: ObjectId("673b0000000000000000001a"),
        settings: {
            defaultCurrency: "EUR",
        },
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
        updatedAt: new Date("2025-11-01T10:00:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000002b"),
        name: "Jerry Thomas Speakeasy",
        ownerId: giovanniId,
        subscriptionId: ObjectId("673b0000000000000000001b"),
        settings: {
            defaultCurrency: "EUR",
        },
        createdAt: new Date("2025-10-15T14:30:00.000Z"),
        updatedAt: new Date("2025-10-15T14:30:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000002c"),
        name: "Enoteca Provincia Romana",
        ownerId: giovanniId,
        subscriptionId: ObjectId("673b0000000000000000001c"),
        settings: {
            defaultCurrency: "EUR",
        },
        createdAt: new Date("2025-09-20T09:15:00.000Z"),
        updatedAt: new Date("2025-09-20T09:15:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000002d"),
        name: "Terrazza Panoramica",
        ownerId: johnId,
        subscriptionId: ObjectId("673b0000000000000000001d"),
        settings: {
            defaultCurrency: "EUR",
        },
        createdAt: new Date("2025-08-10T16:45:00.000Z"),
        updatedAt: new Date("2025-08-10T16:45:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000002e"),
        name: "The Drunken Ship - Pub Irlandese",
        ownerId: johnId,
        subscriptionId: ObjectId("673b0000000000000000001e"),
        settings: {
            defaultCurrency: "EUR",
        },
        createdAt: new Date("2025-07-05T11:20:00.000Z"),
        updatedAt: new Date("2025-07-05T11:20:00.000Z"),
    },
];

// ============================================================================
// USER-ORGANIZATION RELATIONSHIPS
// Different roles for testing: owner, manager, staff
// ============================================================================
const relationships = [
    // Giovanni's organizations as OWNER
    {
        _id: ObjectId("673b0000000000000000003a"),
        userId: giovanniId,
        orgId: ObjectId("673b0000000000000000002a"), // The Cocktail Lounge Roma
        orgRole: "owner",
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
        updatedAt: new Date("2025-11-01T10:00:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000003b"),
        userId: giovanniId,
        orgId: ObjectId("673b0000000000000000002b"), // Jerry Thomas Speakeasy
        orgRole: "owner",
        createdAt: new Date("2025-10-15T14:30:00.000Z"),
        updatedAt: new Date("2025-10-15T14:30:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000003c"),
        userId: giovanniId,
        orgId: ObjectId("673b0000000000000000002c"), // Enoteca Provincia Romana
        orgRole: "owner",
        createdAt: new Date("2025-09-20T09:15:00.000Z"),
        updatedAt: new Date("2025-09-20T09:15:00.000Z"),
    },

    // John's organizations as OWNER
    {
        _id: ObjectId("673b0000000000000000003d"),
        userId: johnId,
        orgId: ObjectId("673b0000000000000000002d"), // Terrazza Panoramica
        orgRole: "owner",
        createdAt: new Date("2025-08-10T16:45:00.000Z"),
        updatedAt: new Date("2025-08-10T16:45:00.000Z"),
    },
    {
        _id: ObjectId("673b0000000000000000003e"),
        userId: johnId,
        orgId: ObjectId("673b0000000000000000002e"), // The Drunken Ship
        orgRole: "owner",
        createdAt: new Date("2025-07-05T11:20:00.000Z"),
        updatedAt: new Date("2025-07-05T11:20:00.000Z"),
    },

    // Giovanni as MANAGER at John's Terrazza Panoramica
    {
        _id: ObjectId("673b0000000000000000003f"),
        userId: giovanniId,
        orgId: ObjectId("673b0000000000000000002d"), // Terrazza Panoramica
        orgRole: "manager",
        createdAt: new Date("2025-08-15T09:30:00.000Z"),
        updatedAt: new Date("2025-08-15T09:30:00.000Z"),
    },

    // John as STAFF at Giovanni's Jerry Thomas Speakeasy
    {
        _id: ObjectId("673b0000000000000000004a"),
        userId: johnId,
        orgId: ObjectId("673b0000000000000000002b"), // Jerry Thomas Speakeasy
        orgRole: "staff",
        createdAt: new Date("2025-10-20T14:00:00.000Z"),
        updatedAt: new Date("2025-10-20T14:00:00.000Z"),
    },
];

// ============================================================================
// INVITATIONS (Pending)
// ============================================================================
const invitations = [
    // Giovanni invited to The Drunken Ship as MANAGER (pending)
    {
        _id: ObjectId("673b0000000000000000004b"),
        orgId: ObjectId("673b0000000000000000002e"), // The Drunken Ship
        invitedEmail: "giovanni.cefalo@gmail.com",
        role: "manager",
        status: "pending",
        invitedBy: johnId,
        invitationExpires: new Date("2025-12-05T11:20:00.000Z"), // Expires in 1 month
        createdAt: new Date("2025-11-05T11:20:00.000Z"),
        updatedAt: new Date("2025-11-05T11:20:00.000Z"),
    },

    // John invited to Enoteca Provincia Romana as STAFF (pending)
    {
        _id: ObjectId("673b0000000000000000004c"),
        orgId: ObjectId("673b0000000000000000002c"), // Enoteca Provincia Romana
        invitedEmail: "johnd.fish4@gmail.com",
        role: "staff",
        status: "pending",
        invitedBy: giovanniId,
        invitationExpires: new Date("2025-12-01T09:15:00.000Z"), // Expires in ~1 month
        createdAt: new Date("2025-11-01T09:15:00.000Z"),
        updatedAt: new Date("2025-11-01T09:15:00.000Z"),
    },

    // External email invited to The Cocktail Lounge (pending)
    {
        _id: ObjectId("673b0000000000000000004d"),
        orgId: ObjectId("673b0000000000000000002a"), // The Cocktail Lounge Roma
        invitedEmail: "bartender@example.com",
        role: "staff",
        status: "pending",
        invitedBy: giovanniId,
        invitationExpires: new Date("2025-12-06T10:00:00.000Z"),
        createdAt: new Date("2025-11-06T10:00:00.000Z"),
        updatedAt: new Date("2025-11-06T10:00:00.000Z"),
    },
];

// ============================================================================
// EXECUTION
// ============================================================================

print("\n=== Barback Sample Data Seeding ===\n");

// Clear existing sample data (only the ones we're about to insert)
print("Cleaning up existing sample data...");
db.subscriptions.deleteMany({
    stripeSubscriptionId: { $regex: /^sub_sample_/ },
});
db.orgs.deleteMany({
    _id: { $in: orgs.map(o => o._id) },
});
db.user_org_relations.deleteMany({
    _id: { $in: relationships.map(r => r._id) },
});
db.org_invites.deleteMany({
    _id: { $in: invitations.map(i => i._id) },
});

// Insert new data
print("\nInserting subscriptions...");
const subResult = db.subscriptions.insertMany(subscriptions);
print(`✓ Inserted ${subResult.insertedIds.length} subscriptions`);

print("\nInserting organizations...");
const orgResult = db.orgs.insertMany(orgs);
print(`✓ Inserted ${orgResult.insertedIds.length} organizations`);

print("\nInserting user-organization relationships...");
const relResult = db.user_org_relations.insertMany(relationships);
print(`✓ Inserted ${relResult.insertedIds.length} relationships`);

print("\nInserting pending invitations...");
const invResult = db.org_invites.insertMany(invitations);
print(`✓ Inserted ${invResult.insertedIds.length} invitations`);

// Summary
print("\n=== Summary ===\n");
print("Organizations created:");
print("  1. The Cocktail Lounge Roma (Owner: Giovanni, Status: Trial)");
print("  2. Jerry Thomas Speakeasy (Owner: Giovanni, Status: Active)");
print("     - John as STAFF");
print("  3. Enoteca Provincia Romana (Owner: Giovanni, Status: Active)");
print("  4. Terrazza Panoramica (Owner: John, Status: Active)");
print("     - Giovanni as MANAGER");
print("  5. The Drunken Ship - Pub Irlandese (Owner: John, Status: Active)");
print("\nPending Invitations:");
print("  - Giovanni invited to The Drunken Ship as MANAGER");
print("  - John invited to Enoteca Provincia Romana as STAFF");
print("  - bartender@example.com invited to The Cocktail Lounge as STAFF");
print("\n✓ Sample data seeding completed successfully!\n");
