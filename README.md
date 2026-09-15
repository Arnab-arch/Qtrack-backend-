# QTrack

QTrack is a full-stack queue management platform designed to reduce physical waiting time and give users real-time visibility into their position in a queue.

Users can discover locations and services, join queues, track their tokens, and estimate waiting times. Staff and administrators can manage queues, locations, services, and monitor queue analytics through dedicated dashboards.

## Live Demo

https://qtracck.vercel.app/

## Overview

Traditional queue systems require users to physically wait at a location without knowing how long they will have to wait.

QTrack solves this by providing a digital queue management system where users can:

- Browse nearby locations
- Explore available services
- Join a queue digitally
- Receive a queue token
- Track their position
- View estimated waiting time
- Monitor their queue status

Staff members can manage queues and tokens, while administrators can manage locations and system-level resources.

---

## Features

### User / Patient

- User registration and login
- Browse available locations
- Browse services offered at each location
- Browse active queues
- Join queues digitally
- Generate queue tokens
- Track active tokens
- View estimated waiting time
- View queue status
- Manage user profile

### Staff

- Staff dashboard
- Manage queues
- Call the next token
- Complete/serve tokens
- Update queue status
- Manage services
- Manage locations
- View queue statistics
- View analytics

### Admin

- All staff capabilities
- Add and manage locations
- Role-based access control
- Administrative management of services and queues

### Real-Time Features

QTrack uses Socket.IO to provide real-time communication between the server and connected clients.

The backend uses Socket.IO rooms for:

- Queue-specific updates
- User-specific updates
- Connecting users to their active queue
- Broadcasting queue-related changes

---

## Tech Stack

### Frontend

- React 19
- React Router
- Axios
- Socket.IO Client
- Tailwind CSS
- Bootstrap
- GSAP
- Lucide React
- React Icons
- React Hot Toast
- React Toastify
- Swiper
- Vite

### Backend

- Node.js
- Express.js
- PostgreSQL
- `pg`
- Socket.IO
- JSON Web Tokens (JWT)
- bcryptjs
- CORS
- dotenv

### Deployment

- Frontend: Vercel
- Backend: Node.js deployment environment
- Database: PostgreSQL

---

## Architecture

```text
                    ┌──────────────────────┐
                    │       User           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │                      │
                    │  React Router        │
                    │  Axios               │
                    │  Socket.IO Client    │
                    └──────────┬───────────┘
                               │
                    HTTP / REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Node.js / Express  │
                    │                      │
                    │ Authentication       │
                    │ Authorization        │
                    │ Queue Management     │
                    │ Token Management     │
                    │ Location Management  │
                    │ Service Management   │
                    └───────┬───────┬──────┘
                            │       │
                 SQL Queries│       │WebSockets
                            │       │
                            ▼       ▼
                    ┌──────────┐  ┌──────────┐
                    │PostgreSQL│  │Socket.IO │
                    └──────────┘  └──────────┘
