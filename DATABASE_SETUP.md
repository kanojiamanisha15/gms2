# Database Setup Guide

## PostgreSQL Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gms
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false

# Authentication Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Connection

The database connection is configured in `lib/db.ts`. It uses a connection pool pattern for efficient database access.

### Usage Example

```typescript
import { query, queryOne } from '@/lib/db';

// Query multiple rows
const users = await query('SELECT * FROM users');

// Query with parameters
const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
```

## Setting up PostgreSQL

1. Install PostgreSQL on your system
2. Create a database:
   ```sql
   CREATE DATABASE gms;
   ```
3. Update `.env.local` with your database credentials
4. Initialize the database schema:
   - Option 1: Run the SQL schema file directly:
     ```bash
     psql -U postgres -d gms -f lib/db-schema.sql
     ```
   - Option 2: Use the initialization script (requires tsx):
     ```bash
     npm install -g tsx
     npx tsx lib/db-init.ts
     ```
   - The init script also seeds a **default admin user** (if not already present).

## Default User

When you run the database initialization script (`npx tsx lib/db-init.ts`), a default admin user is created. The script loads **`.env.local`** and uses these variables (with fallbacks):

| Env variable | Default value   |
|--------------|-----------------|
| `DEFAULT_USER_EMAIL` | admin@gmail.com |
| `DEFAULT_USER_PASSWORD` | Admin@123      |
| `DEFAULT_USER_NAME` | admin          |
| `DEFAULT_USER_ROLE` | Admin          |

Add them to `.env.local` to override; omit them to use the defaults. Use these credentials to sign in after setting up the database. The default user is only created if no user with that email exists.

## Database Schema

The database schema includes tables for:
- `users` - User accounts
- `members` - Gym members
- `membership_plans` - Membership plan definitions
- `payments` - Payment records
- `attendance` - Member check-in/check-out records

See `lib/db-schema.sql` for the complete schema definition.

## API Routes

### Authentication Routes
- `POST /api/auth/login` - Authenticate user and get JWT token
  - Body: `{ email: string, password: string }`
  - Returns: `{ success: true, data: { token: string, user: {...} } }`
## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After logging in or registering, you'll receive a token that should be included in the `Authorization` header for protected routes:

```
Authorization: Bearer <your-token-here>
```

The middleware (`middleware.ts`) automatically protects API routes and validates tokens. Public routes like `/api/auth/login` don't require authentication.
