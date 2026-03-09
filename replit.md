# Lions Club Meißner Land - Admin Tool

## Overview
Administrative tool for Lions Club Meißner Land. Manages events (Veranstaltungen), newsletter subscribers (Abonnenten), QR code generation for newsletter sign-ups, and event guest registrations.

## Contact
- Sebastian Schreiber, Seestraße 18e, 01640 Coswig
- Phone: 01723408543
- Email: schreiber1988@gmx.net

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **Branding**: Lions Club blue/gold color scheme, custom logo

## Key Features
- Dashboard with statistics overview and Lions branding
- Event management (CRUD) with guest list view and CSV export
- Newsletter subscriber management with CSV export
- QR code generation per event for newsletter sign-up (with print/download)
- Public subscribe page accessible via QR code scan (with optional phone field)
- Public events page at /veranstaltungen with click-to-register dialog
- Event registration with guest count, duplicate/capacity validation

## Public Routes (no admin sidebar)
- `/subscribe/:eventId` - Newsletter sign-up form
- `/veranstaltungen` - Public events listing with registration

## Admin Routes (with sidebar)
- `/` - Dashboard
- `/events` - Event management with guest list view
- `/subscribers` - Subscriber management
- `/qr-codes` - QR code generator

## Data Model
- `events`: id, title, description, date, location, maxParticipants, isActive, createdAt
- `subscribers`: id, email, firstName, lastName, phone, isActive, eventId (FK), subscribedAt
- `registrations`: id, eventId (FK), firstName, lastName, email, phone, guestCount, registeredAt

## Project Structure
```
client/src/
  pages/
    dashboard.tsx        - Main dashboard with stats + branding
    events.tsx           - Event management CRUD + guest list dialog
    subscribers.tsx      - Subscriber list + CSV export
    qr-codes.tsx         - QR code generator with print
    subscribe.tsx        - Public newsletter sign-up (with phone)
    public-events.tsx    - Public events listing with registration
  components/
    app-sidebar.tsx      - Navigation sidebar with contact info

client/public/images/
  lions-logo.png         - Club logo
  hero-bg.png            - Hero banner for public pages

server/
  db.ts                  - Database connection
  storage.ts             - DatabaseStorage (IStorage interface)
  routes.ts              - API endpoints
  seed.ts                - Sample data seeder

shared/
  schema.ts              - Drizzle models + Zod schemas
```

## API Endpoints
- GET/POST /api/events - List/create events
- GET/PATCH/DELETE /api/events/:id - Get/update/delete event
- GET /api/subscribers - List subscribers
- PATCH/DELETE /api/subscribers/:id - Update/delete subscriber
- GET /api/subscribers/export - CSV export
- POST /api/subscribe - Public newsletter sign-up
- GET /api/registrations - List all registrations
- GET /api/registrations/event/:eventId - List registrations for event
- GET /api/registrations/counts - Guest count aggregation per event
- POST /api/registrations - Register for event (with duplicate/capacity check)
- DELETE /api/registrations/:id - Delete registration
- GET /api/registrations/export/:eventId - CSV export of event guests

## Running
`npm run dev` starts Express + Vite on port 5000
