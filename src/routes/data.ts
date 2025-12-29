import { Router } from 'express'
import { authenticateApiKey, extractUserId, AuthRequest } from '../middleware/auth'
import { listCollections } from '../db/queries'
import chunkRoutes from './chunks'

const router = Router()

// All routes require API key authentication
router.use(authenticateApiKey)

// GET /data/:user_id (list all collections)
// This must come BEFORE mounting chunk routes to avoid route conflicts
router.get('/:user_id', extractUserId, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const collections = await listCollections(userId)
    
    res.json({ collections })
  } catch (error) {
    console.error('Error listing collections:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mount chunk routes (all collections use chunks)
// Extract user_id before mounting chunk routes
// This must come AFTER the GET /:user_id route to avoid conflicts
router.use('/:user_id', extractUserId, chunkRoutes)

export default router

