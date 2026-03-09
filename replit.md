# Lions Club Meißner Land - Admin Tool

## Overview
Administrative tool for Lions Club Meißner Land. Manages events (Veranstaltungen), newsletter subscribers (Abonnenten), and QR code generation for newsletter sign-ups.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)

## Key Features
- Dashboard with statistics overview
- Event management (CRUD)
- Newsletter subscriber management with CSV export
- QR code generation per event for newsletter sign-up
- Public subscribe page accessible via QR code scan

## Data Model
- `events`: id, title, description, date, location, maxParticipants, isActive, createdAt
- `subscribers`: id, email, firstName, lastName, isActive, eventId (FK), subscribedAt

## Project Structure
```
client/src/
  pages/
    dashboard.tsx      - Main dashboard with stats
    events.tsx         - Event management CRUD
    subscribers.tsx    - Subscriber list + export
    qr-codes.tsx       - QR code generator
    subscribe.tsx      - Public newsletter sign-up page
  components/
    app-sidebar.tsx    - Navigation sidebar

server/
  db.ts              - Database connection
  storage.ts         - DatabaseStorage (IStorage interface)
  routes.ts          - API endpoints
  seed.ts            - Sample data seeder

shared/
  schema.ts          - Drizzle models + Zod schemas
```

## API Endpoints
- GET/POST /api/events - List/create events
- GET/PATCH/DELETE /api/events/:id - Get/update/delete event
- GET /api/subscribers - List subscribers
- PATCH/DELETE /api/subscribers/:id - Update/delete subscriber
- GET /api/subscribers/export - CSV export
- POST /api/subscribe - Public newsletter sign-up

## Running
`npm run dev` starts Express + Vite on port 5000
