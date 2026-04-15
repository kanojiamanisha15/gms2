# Project Structure

This document outlines the folder structure of the GymOS Next.js application, organized according to best practices.

## Directory Structure

```
gms/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── account/
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── membership-plans/
│   │   ├── payments/
│   │   ├── trainers-staff/
│   │   └── layout.tsx           # Dashboard layout
│   ├── api/                      # API Routes (Backend)
│   │   └── auth/
│   │       ├── login/
│   │       ├── logout/
│   │       └── register/
│   ├── login/                    # Auth pages
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── components/                  # React Components
│   ├── features/                 # Feature-specific components
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── membership-plans/
│   │   ├── payments/
│   │   └── trainers-staff/
│   └── ui/                      # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── form.tsx
│       └── ...
│
├── hooks/                       # Custom React Hooks
│   ├── use-auth.ts
│   ├── use-mobile.ts
│   └── use-users.ts
│
├── lib/                         # Library & Utilities
│   ├── constants/               # Application constants
│   │   └── api.ts               # API endpoints & base URL
│   ├── db/                      # Database utilities
│   │   ├── db.ts                # Database connection
│   │   ├── db-init.ts           # Database initialization
│   │   └── db-schema.sql        # Database schema
│   ├── providers/               # React Context Providers
│   │   └── query-provider.tsx    # React Query provider
│   ├── services/                # Business logic & API clients
│   │   ├── api-client.ts        # API client (axios)
│   │   └── auth.ts              # Authentication utilities
│   └── utils/                   # Utility functions
│       ├── member-id.ts         # Member ID generator
│       └── index.ts             # Utility exports
│
├── types/                       # TypeScript Type Definitions
│   ├── auth.ts                  # Authentication types
│   └── index.ts                 # Type exports
│
├── public/                      # Static assets
├── middleware.ts               # Next.js middleware
└── package.json
```

## Key Principles

### 1. **Separation of Concerns**
- **Frontend (app/)**: Contains routes, pages, and layouts
- **Backend (app/api/)**: Contains API route handlers
- **Components**: Separated into `features/` (domain-specific) and `ui/` (reusable)

### 2. **Feature-Based Organization**
- Feature components are grouped by domain in `components/features/`
- Each feature has its own directory (e.g., `members/`, `payments/`)

### 3. **Type Safety**
- All TypeScript types are centralized in `types/`
- Types are exported through `types/index.ts` for easy imports

### 4. **Constants Management**
- API endpoints and configuration constants are in `lib/constants/`
- Prevents hardcoding and makes updates easier

### 5. **Service Layer**
- API client and business logic are in `lib/services/`
- Provides a clean interface between frontend and backend

### 6. **Utility Functions**
- Helper functions are organized in `lib/utils/`
- Each utility has its own file for better maintainability

## Import Patterns

### Types
```typescript
import type { User, AuthResponse } from '@/types';
```

### Services
```typescript
import { login, register } from '@/lib/services/api-client';
```

### Constants
```typescript
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants/api';
```

### Components
```typescript
import { Button } from '@/components/ui/button';
import { MembersTable } from '@/components/features/members/members-table';
```

### Utils
```typescript
import { generateMemberId } from '@/lib/utils/member-id';
import { cn } from '@/lib/utils';
```

## Best Practices Followed

1. ✅ **Route Groups**: Using `(dashboard)` for logical grouping
2. ✅ **Feature Components**: Separated from UI components
3. ✅ **Type Definitions**: Centralized and exported
4. ✅ **Constants**: Extracted to prevent magic strings
5. ✅ **Service Layer**: Clean API abstraction
6. ✅ **Utility Functions**: Organized and reusable
7. ✅ **Index Files**: Created for easier imports
