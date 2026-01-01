# CodeShare Backend - Phase 4 (Persistence)

Backend server with real-time collaboration and persistence support.

## Features

- Real-time code synchronization via Socket.IO
- PostgreSQL (Neon.tech) for session metadata
- Cloudflare R2 for editor content storage
- Autosave every 10 seconds
- Load persisted content on session join

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `DATABASE_URL`: PostgreSQL connection string (Neon.tech)
- `R2_ACCOUNT_ID`: Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key
- `R2_BUCKET_NAME`: Cloudflare R2 bucket name
- `R2_ENDPOINT`: Cloudflare R2 endpoint URL
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:3000)

3. Run the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

## Architecture

- **Database**: PostgreSQL stores session metadata (id, timestamps, content key)
- **Storage**: Cloudflare R2 stores actual editor content
- **In-Memory**: Active sessions kept in memory for real-time sync
- **Autosave**: Content persisted every 10 seconds while session is active
- **On Disconnect**: Content persisted when last user leaves session

## Socket Events

### Client → Server
- `join-session`: Join a session (loads persisted content)
- `code-change`: Update editor content

### Server → Client
- `session-joined`: Confirmation with current content and user count
- `code-update`: Broadcast content changes to other users
- `user-count-update`: Broadcast user count changes
- `session-error`: Error notification

## Persistence Flow

1. On `join-session`: Load persisted content from R2 (if exists)
2. During session: Autosave to R2 every 10 seconds
3. On disconnect: Persist content when last user leaves
4. Database: Update session metadata on each save

