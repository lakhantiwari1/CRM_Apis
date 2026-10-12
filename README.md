# 🚀 CRM Sales Management System — Backend API

A **production-ready**, feature-complete RESTful backend for a CRM Sales Management System built with **Node.js**, **Express.js**, and **MongoDB**.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [How to Run](#how-to-run)
- [Authentication Mechanism](#authentication-mechanism)
- [User Roles & Permissions](#user-roles--permissions)
- [API Documentation](#api-documentation)
- [Business Rules](#business-rules)
- [Database Design & Indexing](#database-design--indexing)
- [Security Implementation](#security-implementation)
- [Assumptions Made](#assumptions-made)

---

## 📌 Project Overview

This CRM backend manages the complete sales lifecycle:

```
Lead Generation → Lead Qualification → Customer Conversion → Deal Management → Deal Closure
```

It supports 3 user roles with strict role-based access control, full CRUD for all entities, an activity/follow-up system, a timeline audit log, and analytics APIs.

---

## 🛠 Technologies Used

| Technology | Purpose |
|-----------|---------|
| **Node.js v20** | Runtime environment |
| **Express.js v4** | Web framework |
| **MongoDB** | Database |
| **Mongoose v8** | ODM / schema modeling |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT authentication |
| **express-validator** | Request validation |
| **helmet** | Security headers |
| **cors** | Cross-Origin Resource Sharing |
| **express-rate-limit** | Rate limiting |
| **cookie-parser** | HTTP-only cookie support |
| **morgan** | HTTP request logging |
| **swagger-ui-express** | Interactive API docs |
| **yamljs** | YAML parsing for Swagger |
| **dotenv** | Environment variable management |
| **nodemon** | Development auto-reload |

---

## ✨ Features

### Authentication & Authorization
- ✅ JWT access + refresh token pair
- ✅ HTTP-only cookie support (dual auth)
- ✅ Role-based access control (RBAC)
- ✅ Secure password hashing with bcrypt
- ✅ Token refresh endpoint
- ✅ Password change with immediate token invalidation

### Lead Management
- ✅ Full CRUD with role-filtered access
- ✅ Lead assignment/reassignment
- ✅ Status and priority management
- ✅ Search, filter (status/priority/source/assignee), sort, paginate
- ✅ Date-range filtering
- ✅ **MongoDB Transaction-based lead conversion** → Customer + Deal

### Customer Management
- ✅ Full CRUD
- ✅ Linked to original lead
- ✅ Role-filtered access (executives see only assigned)

### Deal Management
- ✅ Full CRUD with stage management
- ✅ Business rule enforcement on stage changes
- ✅ Auto-calculated `expectedRevenue = dealValue × probability / 100`
- ✅ Deal assignment
- ✅ Won/Lost handling with reason

### Activity System
- ✅ 7 activity types: Call, Email, Meeting, Demo, Follow-up, Reminder, Note
- ✅ Polymorphic entity linking (Lead / Customer / Deal)
- ✅ Auto-overdue detection on fetch
- ✅ Complete activity marking

### Timeline / Audit Log
- ✅ 23 distinct action types recorded
- ✅ Retrievable per-entity (Lead, Customer, Deal)
- ✅ Captures previous and new values

### Dashboard Analytics
- ✅ Overall CRM stats (leads, customers, deals, revenue)
- ✅ Sales pipeline by stage
- ✅ Team performance (Admin/Manager)
- ✅ Lead source analysis with conversion rates

### Technical
- ✅ Consistent response format
- ✅ Centralized error handling
- ✅ Input validation on all endpoints
- ✅ Pagination with metadata
- ✅ MongoDB indexes for performance
- ✅ Rate limiting (global + auth-specific)
- ✅ Swagger/OpenAPI documentation at `/api-docs`
- ✅ Graceful server shutdown

---

## 📁 Project Structure

```
CRM_Apis/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js   # Register, login, refresh, profile
│   │   ├── user.controller.js   # User CRUD (Admin)
│   │   ├── lead.controller.js   # Lead CRUD + convert
│   │   ├── customer.controller.js
│   │   ├── deal.controller.js   # Deal CRUD + stage management
│   │   ├── activity.controller.js
│   │   ├── timeline.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── authenticate.js      # JWT verification
│   │   ├── authorize.js         # RBAC guards
│   │   ├── validate.js          # express-validator result handler
│   │   └── errorHandler.js      # Centralized error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Lead.js
│   │   ├── Customer.js
│   │   ├── Deal.js
│   │   ├── Activity.js
│   │   └── Timeline.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── lead.routes.js
│   │   ├── customer.routes.js
│   │   ├── deal.routes.js
│   │   ├── activity.routes.js
│   │   ├── timeline.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   ├── jwt.js               # Token generation & cookie helpers
│   │   ├── response.js          # Standardized response helpers
│   │   ├── errors.js            # Custom error hierarchy
│   │   ├── queryBuilder.js      # Pagination, sort, filter helpers
│   │   └── timeline.js          # Timeline entry creation helper
│   ├── validators/
│   │   ├── user.validator.js
│   │   ├── lead.validator.js
│   │   ├── deal.validator.js
│   │   ├── customer.validator.js
│   │   └── activity.validator.js
│   └── app.js                   # Express app setup
├── server.js                    # Entry point with graceful shutdown
├── seed.js                      # Database seeder
├── swagger.yaml                 # OpenAPI 3.0 specification
├── .env.example                 # Environment variable template
├── .env                         # Your local environment (not committed)
├── .gitignore
└── package.json
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js v20.x
- MongoDB v6+ (local or MongoDB Atlas)
- npm v10+

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd CRM_Apis

# 2. Install dependencies
npm install

# 3. Copy environment file
copy .env.example .env
# Then edit .env with your values

# 4. Seed initial users
npm run seed

# 5. Start development server
npm run dev
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB — local or Atlas URI
MONGODB_URI=mongodb://localhost:27017/crm_sales_db

# JWT Secrets — use strong, random strings (min 32 chars)
JWT_ACCESS_SECRET=your_super_secure_access_secret_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cookie
COOKIE_SECRET=your_cookie_secret

# CORS — frontend URL
CLIENT_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Bcrypt
BCRYPT_SALT_ROUNDS=12
```

---

## 🗄 Database Setup

### Local MongoDB
```bash
# Windows (if MongoDB installed)
mongod --dbpath C:\data\db
```

### MongoDB Atlas
Replace `MONGODB_URI` with your Atlas connection string:
```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/crm_sales_db
```

### Seed Test Users
```bash
npm run seed
```

This creates:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@crm.com | Admin@123 |
| Sales Manager | manager@crm.com | Manager@123 |
| Sales Executive | executive@crm.com | Executive@123 |

---

## ▶️ How to Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start

# Seed database
npm run seed
```

Server starts at: `http://localhost:5000`

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Health check |
| `http://localhost:5000/api-docs` | Interactive Swagger UI |

---

## 🔒 Authentication Mechanism

### Flow

```
POST /api/auth/login
  → Returns: accessToken (15m) + refreshToken (7d)
  → Sets: httpOnly cookies automatically

POST /api/auth/refresh
  → Uses refreshToken cookie or body
  → Returns: new accessToken

POST /api/auth/logout
  → Clears cookies + invalidates refreshToken in DB
```

### Using Tokens

**Option 1 — Authorization Header:**
```
Authorization: Bearer <accessToken>
```

**Option 2 — Cookie (automatic after login):**
```
Cookie: accessToken=<token>
```

### Token Security
- Access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days**
- Refresh tokens are stored in DB (invalidated on logout/password change)
- Passwords hashed with bcrypt (12 salt rounds)
- Tokens use separate secrets for access vs. refresh

---

## 👥 User Roles & Permissions

### Admin
| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Users | ✅ | ✅ All | ✅ | ✅ |
| Leads | ✅ | ✅ All | ✅ | ✅ |
| Customers | ✅ | ✅ All | ✅ | ✅ |
| Deals | ✅ | ✅ All | ✅ | ✅ |
| Activities | ✅ | ✅ All | ✅ | ✅ |
| Dashboard | — | ✅ All | — | — |
| Timeline | — | ✅ All | — | — |

### Sales Manager
| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Users | ❌ | ❌ | ❌ | ❌ |
| Leads | ✅ | ✅ All | ✅ + Assign | ✅ |
| Customers | ✅ | ✅ All | ✅ | ❌ |
| Deals | ✅ | ✅ All | ✅ + Assign | ❌ |
| Activities | ✅ | ✅ All | ✅ | ✅ |
| Dashboard | — | ✅ Team | — | — |

### Sales Executive
| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Leads | ✅ (self-assigned) | ✅ **Own only** | ✅ Own | ❌ |
| Customers | ❌ | ✅ **Own only** | ✅ Own | ❌ |
| Deals | ✅ | ✅ **Own only** | ✅ Own | ❌ |
| Activities | ✅ | ✅ **Own only** | ✅ Own | ❌ |
| Dashboard | — | ✅ Own | — | — |

---

## 📖 API Documentation

### Swagger UI
Visit: `http://localhost:5000/api-docs`

### Base URL
```
http://localhost:5000/api
```

### Quick Reference

#### Authentication
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login
POST   /api/auth/logout          Logout
POST   /api/auth/refresh         Refresh access token
GET    /api/auth/me              Get own profile
PATCH  /api/auth/me              Update own profile
PATCH  /api/auth/change-password Change password
```

#### Users (Admin only)
```
GET    /api/users                List users (search, filter, paginate)
POST   /api/users                Create user
GET    /api/users/:id            Get by ID
PUT    /api/users/:id            Update
PATCH  /api/users/:id/activate   Activate
PATCH  /api/users/:id/deactivate Deactivate
DELETE /api/users/:id            Delete
GET    /api/users/sales-executives  Active sales executives
```

#### Leads
```
GET    /api/leads                List (role-filtered, search, filter, paginate)
POST   /api/leads                Create
GET    /api/leads/:id            Get by ID
PUT    /api/leads/:id            Update
PATCH  /api/leads/:id/status     Update status (Manager+)
PATCH  /api/leads/:id/assign     Assign/reassign (Manager+)
POST   /api/leads/:id/convert    Convert to Customer+Deal (all roles)
DELETE /api/leads/:id            Delete (Manager+)
```

#### Customers
```
GET    /api/customers            List
POST   /api/customers            Create (Manager+)
GET    /api/customers/:id        Get by ID
PUT    /api/customers/:id        Update
DELETE /api/customers/:id        Delete (Admin only)
```

#### Deals
```
GET    /api/deals                List
POST   /api/deals                Create
GET    /api/deals/:id            Get by ID
PUT    /api/deals/:id            Update
PATCH  /api/deals/:id/stage      Update stage (with business rules)
PATCH  /api/deals/:id/assign     Assign (Manager+)
DELETE /api/deals/:id            Delete (Admin only)
```

#### Activities
```
GET    /api/activities           List (auto-mark overdue)
POST   /api/activities           Create
GET    /api/activities/:id       Get by ID
PUT    /api/activities/:id       Update
PATCH  /api/activities/:id/complete  Mark complete
DELETE /api/activities/:id       Delete (Manager+)
```

#### Timeline
```
GET    /api/timeline                       All entries (Admin)
GET    /api/timeline/:entityType/:entityId Entity history
```

#### Dashboard
```
GET    /api/dashboard/stats          Overall CRM statistics
GET    /api/dashboard/pipeline       Sales pipeline by stage
GET    /api/dashboard/team-performance  Team metrics (Manager+)
GET    /api/dashboard/lead-sources   Leads by source
```

### Query Parameters (all list endpoints)

| Param | Example | Description |
|-------|---------|-------------|
| `page` | `?page=2` | Page number |
| `limit` | `?limit=20` | Results per page (max 100) |
| `sort` | `?sort=-createdAt` | Sort field (prefix - for desc) |
| `search` | `?search=john` | Text search |
| `status` | `?status=New` | Filter by status |
| `priority` | `?priority=High` | Filter by priority |
| `source` | `?source=Website` | Filter by source |
| `assignedTo` | `?assignedTo=<id>` | Filter by assignee |
| `startDate` | `?startDate=2024-01-01` | Created after |
| `endDate` | `?endDate=2024-12-31` | Created before |

---

## 📐 Business Rules

### Lead Conversion
1. Only leads with status `"Qualified"` can be converted
2. A lead can only be converted **once** (`isConverted` flag)
3. Conversion creates both a **Customer** and a **Deal** atomically using MongoDB transactions
4. If conversion fails mid-way, all changes are rolled back (no partial data)
5. The customer retains a reference to the original lead
6. The deal references both the customer and original lead

### Deal Stage Transitions
```
Allowed flows:
  Qualification → Discovery → Proposal → Negotiation → Won
  Any active stage → Lost (requires lostReason)
  
Blocked:
  Won → any active stage   ❌ (immutable)
  Lost → any active stage  ❌ (immutable)
  Won → Lost               ❌ (use admin if needed)
```

### Deal Validation
- `dealValue` must be **> 0**
- `probability` must be **0–100**
- `expectedRevenue` is **auto-calculated**: `dealValue × probability / 100`
- `expectedClosingDate` must be in the future when creating
- Lost deals **require** `lostReason`
- Won deals auto-set `actualClosingDate` to current date

### Activity Overdue Detection
- Activities with `status: Pending` and `dueDate < now` are automatically marked `Overdue` on every GET request
- Completed activities cannot be updated

### Lead Assignment
- Leads can only be assigned to users with role `sales_executive`
- Inactive users cannot be assigned
- Assignment is recorded in the timeline

### Access Control
- Sales Executives can only access resources **assigned to them**
- They cannot assign leads to others
- They cannot delete any resources
- They cannot view other executives' data

---

## 🗄 Database Design & Indexing

### Collections & Relationships

```
User
 ├── assigned Leads (1:N)
 ├── assigned Customers (1:N)
 ├── assigned Deals (1:N)
 └── assigned Activities (1:N)

Lead
 ├── assignedTo → User (ref)
 ├── createdBy → User (ref)
 ├── convertedCustomer → Customer (ref, optional)
 └── convertedDeal → Deal (ref, optional)

Customer
 ├── originalLead → Lead (ref)
 ├── assignedTo → User (ref)
 └── createdBy → User (ref)

Deal
 ├── customer → Customer (ref, required)
 ├── lead → Lead (ref, optional)
 ├── assignedTo → User (ref)
 └── createdBy → User (ref)

Activity  (polymorphic)
 ├── assignedTo → User (ref)
 ├── relatedEntityType → 'Lead' | 'Customer' | 'Deal'
 └── relatedEntityId → dynamic ref

Timeline  (audit log)
 ├── entityType → 'Lead' | 'Customer' | 'Deal' | ...
 ├── entityId → dynamic ref
 └── performedBy → User (ref)
```

### Design Decisions
- **References over embedding** for all major entities — allows independent querying, updates without touching parent documents, and proper indexing
- **Activity polymorphic ref** using Mongoose `refPath` to support Lead/Customer/Deal association in a single collection
- **Timeline as a separate collection** — append-only audit log with no modification, queried by entityId + entityType

### Indexes

| Collection | Index | Reason |
|-----------|-------|--------|
| User | `email` (unique) | Login lookups |
| User | `role, isActive` | Role filtering |
| User | `name, email` (text) | Search |
| Lead | `status, priority, source` | Filtering |
| Lead | `assignedTo, status` (compound) | Dashboard queries |
| Lead | `isConverted` | Conversion filter |
| Lead | `name, email, company` (text) | Search |
| Customer | `email, status, assignedTo` | Lookups & filtering |
| Deal | `stage, isClosed, assignedTo` | Pipeline queries |
| Deal | `dealValue, expectedClosingDate` | Range queries |
| Activity | `dueDate, status` (compound) | Overdue detection |
| Activity | `relatedEntityId, relatedEntityType` | Entity activity lookup |
| Timeline | `entityId, entityType, createdAt` (compound) | Timeline queries |

---

## 🔐 Security Implementation

| Security Layer | Implementation |
|---------------|----------------|
| Password hashing | bcrypt with 12 salt rounds |
| Authentication | JWT (15min access + 7d refresh) |
| Token storage | HTTP-only cookies + Authorization header |
| Authorization | Role-based middleware on every protected route |
| Input validation | express-validator on all inputs |
| Rate limiting | 100 req/15min global, 20 req/15min for auth |
| Security headers | helmet (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Configurable origin whitelist |
| Error handling | No stack traces / DB details in production |
| Sensitive data | Passwords & refresh tokens never in responses |

---

## 💡 Assumptions Made

1. **Lead assignment to executives only** — Only `sales_executive` role users can be assigned leads (not managers/admins)
2. **Sales Executive self-assign** — When a sales executive creates a lead, it is auto-assigned to themselves
3. **Single-tenant** — One organization, not multi-tenant
4. **Soft delete not implemented** — Hard deletes used; consider soft delete (isDeleted flag) for production
5. **MongoDB replica set** — Transactions require a replica set. For local development without one, comment out the transaction code in `convertLead` and use sequential saves
6. **No email notifications** — Email alerts (follow-up reminders, assignment notifications) not included
7. **No file attachments** — Activities/notes are text-only
8. **No audit on reads** — Only write/update operations are logged to Timeline
9. **Password policy** — Minimum 8 chars with uppercase, lowercase, number required
10. **Overdue detection** — Triggered on GET, not via a background cron job

---

## 🚀 Deployment Notes

For production:
```bash
NODE_ENV=production
```

For **MongoDB Atlas** (transactions work out of the box):
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm_db
```

For **local MongoDB** without replica set (disable transactions):
- Comment out `session.startTransaction()` in `lead.controller.js → convertLead`
- Use sequential saves instead

---

*Built with ❤️ using Node.js + Express + MongoDB*
