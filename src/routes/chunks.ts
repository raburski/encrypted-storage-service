import { Router } from 'express'
import { authenticateApiKey, extractUserId, AuthRequest } from '../middleware/auth'
import {
  getChunk,
  upsertChunk,
  deleteChunk,
  listChunks,
  getChunksSince,
  getAllChunksForUser,
  patchChunk
} from '../db/queries'

const router = Router()
router.use(authenticateApiKey)

// Extract user_id from path (it's in the parent route /:user_id)
// This middleware runs for all routes in this router
router.use((req, res, next) => {
  // user_id is already in req.params from the parent route
  // extractUserId will handle it
  extractUserId(req as any, res, next)
})

// POST /data/:user_id/:collection/chunks
router.post('/:collection/chunks', async (req: AuthRequest, res) => {
  try {
    const { collection } = req.params
    const userId = req.userId!
    const { chunk_id, encrypted, iv, metadata } = req.body

    if (!chunk_id || typeof chunk_id !== 'string') {
      return res.status(400).json({ error: 'chunk_id is required' })
    }

    if (!Array.isArray(encrypted) || !Array.isArray(iv)) {
      return res.status(400).json({ error: 'Invalid data format' })
    }

    // Validate integer arrays
    if (!encrypted.every((n: any) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return res.status(400).json({ error: 'encrypted must be array of integers 0-255' })
    }
    if (!iv.every((n: any) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return res.status(400).json({ error: 'iv must be array of integers 0-255' })
    }

    const result = await upsertChunk(
      userId,
      collection,
      chunk_id,
      Buffer.from(encrypted),
      Buffer.from(iv),
      metadata || null
    )

    res.json({
      success: true,
      chunk_id,
      version: result.version,
      updated_at: result.updatedAt
    })
  } catch (error) {
    console.error('Error saving chunk:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /data/:user_id/:collection/chunks/:chunkId
router.get('/:collection/chunks/:chunkId', async (req: AuthRequest, res) => {
  try {
    const { collection, chunkId } = req.params
    const userId = req.userId!

    const chunk = await getChunk(userId, collection, chunkId)
    
    if (!chunk) {
      return res.status(404).json({ error: 'Chunk not found' })
    }

    res.json({
      chunk_id: chunk.chunkId,
      encrypted: Array.from(chunk.encryptedData),
      iv: Array.from(chunk.iv),
      metadata: chunk.metadata,
      version: chunk.version,
      updated_at: chunk.updatedAt
    })
  } catch (error) {
    console.error('Error getting chunk:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /data/:user_id/:collection/chunks (list all chunks)
router.get('/:collection/chunks', async (req: AuthRequest, res) => {
  try {
    const { collection } = req.params
    const userId = req.userId!

    const chunks = await listChunks(userId, collection)
    
    res.json({
      chunks: chunks.map(chunk => ({
        chunk_id: chunk.chunkId,
        metadata: chunk.metadata,
        version: chunk.version,
        updated_at: chunk.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error listing chunks:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /data/:user_id/:collection/chunks/:chunkId
router.delete('/:collection/chunks/:chunkId', async (req: AuthRequest, res) => {
  try {
    const { collection, chunkId } = req.params
    const userId = req.userId!

    await deleteChunk(userId, collection, chunkId)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting chunk:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /data/:user_id/:collection/chunks/since?since={iso_timestamp}
router.get('/:collection/chunks/since', async (req: AuthRequest, res) => {
  try {
    const { collection } = req.params
    const userId = req.userId!
    const sinceParam = req.query.since as string | undefined

    const sinceDate = sinceParam ? new Date(sinceParam) : null
    if (sinceParam && isNaN(sinceDate!.getTime())) {
      return res.status(400).json({ error: 'Invalid `since` timestamp' })
    }

    const { chunks, latestSyncTimestamp } = await getChunksSince(
      userId,
      collection,
      sinceDate
    )

    res.json({
      chunks: chunks.map((c) => ({
        chunk_id: c.chunkId,
        encrypted: Array.from(c.encryptedData),
        iv: Array.from(c.iv),
        metadata: c.metadata || null,
        version: c.version,
        updated_at: c.updatedAt,
      })),
      latest_sync: latestSyncTimestamp.toISOString(),
    })
  } catch (error) {
    console.error('Error getting chunks since timestamp:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /data/:user_id/chunks/all?since={iso_timestamp}
router.get('/chunks/all', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const sinceParam = req.query.since as string | undefined

    const sinceDate = sinceParam ? new Date(sinceParam) : null
    if (sinceParam && isNaN(sinceDate!.getTime())) {
      return res.status(400).json({ error: 'Invalid `since` timestamp' })
    }

    const { chunks, latestSyncTimestamp } = await getAllChunksForUser(
      userId,
      sinceDate
    )

    res.json({
      chunks: chunks.map((c) => ({
        collection: c.collectionName,
        chunk_id: c.chunkId,
        encrypted: Array.from(c.encryptedData),
        iv: Array.from(c.iv),
        metadata: c.metadata || null,
        version: c.version,
        updated_at: c.updatedAt,
      })),
      latest_sync: latestSyncTimestamp ? latestSyncTimestamp.toISOString() : null,
    })
  } catch (error) {
    console.error('Error getting all chunks:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /data/:user_id/:collection/chunks/:chunkId
router.patch('/:collection/chunks/:chunkId', async (req: AuthRequest, res) => {
  try {
    const { collection, chunkId } = req.params
    const userId = req.userId!
    const { encrypted, iv, metadata } = req.body

    // Validate: if encrypted is provided, iv must also be provided
    if (encrypted !== undefined && iv === undefined) {
      return res.status(400).json({ 
        error: 'If encrypted is provided, iv must also be provided' 
      })
    }

    // Validate encrypted and iv are integer arrays (0-255) if provided
    if (encrypted !== undefined) {
      if (!Array.isArray(encrypted) || !encrypted.every((n: any) => Number.isInteger(n) && n >= 0 && n <= 255)) {
        return res.status(400).json({ error: 'encrypted must be array of integers 0-255' })
      }
    }
    if (iv !== undefined) {
      if (!Array.isArray(iv) || !iv.every((n: any) => Number.isInteger(n) && n >= 0 && n <= 255)) {
        return res.status(400).json({ error: 'iv must be array of integers 0-255' })
      }
    }

    const result = await patchChunk(
      userId,
      collection,
      chunkId,
      encrypted !== undefined ? Buffer.from(encrypted) : undefined,
      iv !== undefined ? Buffer.from(iv) : undefined,
      metadata
    )

    if (!result) {
      return res.status(404).json({ error: 'Chunk not found' })
    }

    res.json({
      success: true,
      chunk_id: result.chunkId,
      version: result.version,
      updated_at: result.updatedAt,
    })
  } catch (error) {
    console.error('Error patching chunk:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

