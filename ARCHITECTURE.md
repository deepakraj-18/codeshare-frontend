CodeShare — Architecture Decision Record (ADR)
Overview

CodeShare is a lightweight, real-time collaborative code editor designed for fast session-based sharing without user accounts. The system prioritizes low friction, real-time performance, and operational simplicity over complex feature sets.

Target users:

Developers

Pair programming sessions

Debugging and teaching

Quick code sharing

1. High-Level Architecture
Frontend

Framework: React (Vite)

Editor: Monaco Editor

Realtime: Socket.IO client

Routing: React Router

Design: Dark-theme, editor-first UX

Backend

Runtime: Node.js

Framework: Express.js

Realtime: Socket.IO

Persistence:

PostgreSQL → session metadata

Cloudflare R2 → editor content

Autosave: Every 10 seconds

Documentation: Swagger (REST APIs only)

2. Key Architectural Decisions
2.1 Session-Based Model (No Authentication)

Decision
The application uses anonymous, session-based access with no user accounts.

Rationale

Zero friction for users

No onboarding or login barriers

No user data storage or compliance overhead

Ideal for quick collaboration scenarios

Trade-offs

No ownership or user identity

Sessions cannot be recovered if the ID is lost

No per-user permissions

Status
✅ Accepted and frozen for v1

2.2 Socket.IO for Realtime Collaboration

Decision
Socket.IO is used for real-time synchronization instead of WebRTC or CRDT-based systems.

Rationale

Mature, reliable, and well-supported

Server-authoritative model simplifies logic

Easier to debug and operate

Works well with existing Node.js stack

Trade-offs

Higher server load compared to peer-to-peer

Requires backend availability for collaboration

Status
✅ Accepted

2.3 In-Memory Active Sessions with Persistent Storage

Decision
Active session state is stored in-memory, with periodic persistence to external storage.

Rationale

In-memory data ensures low-latency realtime editing

Persistence protects against crashes and restarts

Separation of hot (memory) and cold (storage) data

Implementation

Active sessions → in-memory Map

Autosave every 10 seconds

PostgreSQL stores session metadata

Cloudflare R2 stores editor content

Trade-offs

Single-node limitation

In-memory state lost on restart (mitigated by autosave)

Status
✅ Accepted

2.4 Autosave Strategy (10 Seconds)

Decision
Editor content is autosaved every 10 seconds per active session.

Rationale

Balances durability and performance

Avoids blocking realtime collaboration

Reduces write amplification to storage

Trade-offs

Last few seconds of edits may be lost during a crash

No version history

Status
✅ Accepted

2.5 No CRDT / Operational Transform (OT)

Decision
CRDTs or OT-based collaborative editing are intentionally not implemented in v1.

Rationale

Significant implementation complexity

Higher cognitive and maintenance cost

Not required for initial use cases

Last-write-wins is acceptable for early users

Trade-offs

Concurrent edits may overwrite each other

No fine-grained conflict resolution

Status
✅ Accepted (future consideration only)

3. API Design Decisions
REST APIs

Used only for session lifecycle (create, health check)

Documented via Swagger

Stateless and simple

Socket.IO Events

Used for realtime collaboration only

Not documented in Swagger by design

Considered an internal realtime protocol

4. Production Readiness Decisions
Implemented

Rate limiting (HTTP + Socket)

Payload size limits

Autosave safety

Graceful shutdown

Structured error handling

Environment-based configuration

Not Implemented (Intentionally)

Horizontal scaling

Distributed session storage (Redis)

Authentication & authorization

DDoS mitigation beyond basic limits

5. Known Limitations (Accepted)

The following limitations are explicitly accepted for v1:

Single server instance only

No horizontal scaling

No user accounts

No session ownership

No version history

No offline editing

Last-write-wins conflict behavior

These are documented to avoid accidental scope creep.

6. Future Considerations (Non-Goals for v1)

The following are explicitly out of scope for the current version:

CRDT / OT-based collaboration

User authentication

File trees / multi-file projects

Version history UI

AI-assisted features

Code execution environments

These may be revisited only after proven user demand.

7. Architecture Freeze

As of this document:

Core architecture is frozen

Only bug fixes, UX improvements, and infra configuration changes are allowed

No new core features without revisiting this ADR

Final Notes

This architecture prioritizes:

Simplicity

Developer experience

Operational clarity

Fast iteration

The system is intentionally designed to be small, understandable, and reliable rather than maximally powerful.