# codeshare-frontend

Real-time collaborative code editor built with React and Socket.IO.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Backend API URL
# Used for creating sessions and API calls
VITE_API_URL=http://localhost:3001

# Socket.IO Server URL
# Used for real-time WebSocket connections
VITE_SOCKET_URL=http://localhost:3001
```

### Default Values

If not specified, both variables default to `http://localhost:3001`.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional if using defaults):
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

## Usage

- Navigate to `http://localhost:3000` to create a new session
- Share the session URL to collaborate in real-time
- Code changes sync automatically across all connected users