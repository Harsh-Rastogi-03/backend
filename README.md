# Bellariti Backend

E-commerce backend for Bellariti fashion jewelry.

## Stack
- Node.js (Express)
- TypeScript
- Prisma (ORM)
- PostgreSQL (Database)

## Architecture
MVC Pattern:
- **Routes**: API endpoints definition (`src/routes`)
- **Controllers**: Request handling and response formatting (`src/controllers`)
- **Services**: Business logic and database interactions (`src/services`)
- **Models**: Database schema (`prisma/schema.prisma`)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/bellariti?schema=public"
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run**
   - Development: `npm run dev`
   - Production: `npm run build` && `npm start`
