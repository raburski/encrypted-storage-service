# Encrypted Storage Service

A lightweight microservice for storing encrypted JSON blobs. Provides CRUD operations for arbitrary encrypted data with end-to-end encryption support.

## Features

- ✅ Unified chunk-based storage (all collections use chunks)
- ✅ End-to-end encryption (encryption/decryption happens client-side)
- ✅ Incremental synchronization with timestamp-based queries
- ✅ Partial updates (PATCH endpoint)
- ✅ Full sync across all collections
- ✅ Type-safe database access with Prisma
- ✅ PostgreSQL backend

## Technology Stack

- **Runtime**: Node.js (Express)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: API key (app-level)
- **Language**: TypeScript

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your database URL and API key
```

3. **Set up database**:
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Run development server**:
```bash
npm run dev
```

## API Endpoints

All endpoints require `Authorization: Bearer <api_key>` header.

Base URL: `/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/data/{user_id}/{collection}/chunks` | Create or update a chunk |
| `GET` | `/data/{user_id}/{collection}/chunks/{chunk_id}` | Get a specific chunk |
| `GET` | `/data/{user_id}/{collection}/chunks` | List all chunks in a collection |
| `GET` | `/data/{user_id}/{collection}/chunks/since?since={iso_timestamp}` | Get chunks updated since timestamp |
| `PATCH` | `/data/{user_id}/{collection}/chunks/{chunk_id}` | Partially update a chunk |
| `DELETE` | `/data/{user_id}/{collection}/chunks/{chunk_id}` | Delete a specific chunk |
| `GET` | `/data/{user_id}` | List all collections for user |
| `GET` | `/data/{user_id}/chunks/all?since={iso_timestamp}` | Get all chunks from all collections (full sync) |
| `GET` | `/health` | Health check |

See the [full documentation](../wander-garden/docs/encrypted-storage-microservice.md) for detailed API specifications.

## Deployment

### Railway

1. Create Railway project and connect GitHub repository
2. Add PostgreSQL service
3. Configure environment variables:
   - `DATABASE_URL` (auto-provided by Railway)
   - `API_KEY` (generate secure random string)
   - `PORT` (auto-set by Railway)
4. Railway will auto-deploy on git push

## License

MIT

