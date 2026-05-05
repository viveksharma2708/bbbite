# Security Specification for BB Bite

## Data Invariants
1. A user can only read their own profile in `/users/{userId}`.
2. Admins can read and write all documents.
3. Users can read all products, but only admins can write to `/products`.
4. Users can only read their own orders.
5. Users can create an order with their own `userId`.
6. Once an order is delivered, it cannot be modified by the user.

## The "Dirty Dozen" Payloads (Rejection Tests)
1. Creating a user profile with `role: "admin"` as a non-admin.
2. Updating someone else's order status.
3. Injecting a 1MB string into a product name.
4. Placing an order with a negative total amount.
5. Updating a product's price as a regular user.
6. Reading a list of all orders as a non-admin.
7. Spoofing `userId` in an order to point to another user.
8. Deleting a product as a non-admin.
9. Modifying the `createdAt` timestamp of an order.
10. Adding a generic "shadow" field to a product (e.g., `isVerified: true`).
11. Reading the private `/users` collection list without authentication.
12. Attempting to bypass `role` checks using custom token claims (which aren't used here).
