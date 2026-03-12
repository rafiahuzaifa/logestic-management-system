# LSM – Logistics & Supply Chain Management

A full-stack logistics management system built with **Next.js 14**, **TypeScript**, **PostgreSQL**, **Prisma**, and **NextAuth.js**.

---

## Tech Stack

| Layer        | Technology              |
| ------------ | ----------------------- |
| Framework    | Next.js 14 (App Router) |
| Language     | TypeScript              |
| Database     | PostgreSQL               |
| ORM          | Prisma                  |
| Auth         | NextAuth.js             |
| Styling      | Tailwind CSS            |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm / yarn / pnpm

---

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd lsm
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lsm_db?schema=public"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Create the database (if it doesn't exist)
createdb lsm_db

# Push the Prisma schema to the database
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate dev --name init
```

### 4. Seed the Database

```bash
npx prisma db seed
```

This creates:
- 5 users (Admin, Warehouse Manager, Sales Manager, Logistics Officer, Viewer)
- 5 categories, 15 products
- 5 suppliers, 5 customers
- 3 carriers
- 10 purchase orders + GRNs
- 20 sales orders + invoices
- 10 shipments
- Stock movements, watchers, email logs, audit logs

**Default login:**
- Email: `alice@lsm.com`
- Password: `Password123!`

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
lsm/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/  # NextAuth handlers
│   └── (dashboard)/        # Protected dashboard routes
├── lib/
│   └── prisma.ts           # Prisma client singleton
├── prisma/
│   ├── schema.prisma       # Database schema (18 models)
│   └── seed.ts             # Database seed script
├── .env.example            # Environment variable template
└── README.md
```

---

## Data Models

| Model            | Description                                    |
| ---------------- | ---------------------------------------------- |
| `User`           | System users with role-based access            |
| `Category`       | Product categories                             |
| `Product`        | SKU-level product catalogue with stock         |
| `Supplier`       | Vendor/supplier registry                       |
| `PurchaseOrder`  | Inbound procurement orders                     |
| `POLineItem`     | Line items for purchase orders                 |
| `GRN`            | Goods Receipt Notes for received POs           |
| `Customer`       | Customer registry                              |
| `SalesOrder`     | Outbound sales orders                          |
| `SOLineItem`     | Line items for sales orders                    |
| `Invoice`        | Invoices linked to sales orders                |
| `Carrier`        | Shipping carrier registry                      |
| `Shipment`       | Shipment tracking per sales order              |
| `StockMovement`  | Inventory IN / OUT / ADJUSTMENT log            |
| `Watcher`        | Alert subscriptions for events & thresholds    |
| `EmailLog`       | Outbound email delivery log                    |
| `AuditLog`       | Immutable audit trail of all mutations         |

---

## User Roles

| Role                 | Access Level                          |
| -------------------- | ------------------------------------- |
| `ADMIN`              | Full access to all modules            |
| `WAREHOUSE_MANAGER`  | Products, POs, GRNs, stock movements  |
| `SALES_MANAGER`      | Sales orders, invoices, customers     |
| `LOGISTICS_OFFICER`  | Shipments, carriers, tracking         |
| `VIEWER`             | Read-only access                      |

---

## Useful Commands

```bash
# Open Prisma Studio (visual DB browser)
npx prisma studio

# Regenerate Prisma client after schema changes
npx prisma generate

# Reset DB and re-seed (development only)
npx prisma migrate reset

# Run a new migration
npx prisma migrate dev --name <migration-name>
```

---

## License

MIT
