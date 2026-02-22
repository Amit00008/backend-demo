# PrettiFlow Express Template

A minimal Express + Drizzle backend template for PrettiFlow projects.

## Stack
- **Express** - Web framework
- **Drizzle ORM** - Database ORM  
- **Neon** - Serverless Postgres

## Setup

1. Copy `.env.example` to `.env`
2. Add your `DATABASE_URL`
3. Run `npm install`
4. Run `npm run db:push` to sync schema
5. Run `npm run dev` to start server

## Structure
```
src/
  index.js       # Main server entry
  lib/
    db.js        # Database connection
    schema.js    # Drizzle schema
  routes/        # API routes (add as needed)
```
