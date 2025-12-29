import { Router } from 'express'
import { authenticateApiKey, extractUserId, AuthRequest } from '../middleware/auth'
import { listCollections } from '../db/queries'
import chunkRoutes from './chunks'

const router = Router()

// All routes require API key authentication
router.use(authenticateApiKey)

// Mount chunk routes (all collections use chunks)
router.use('/:user_id', chunkRoutes)

// GET /data/:user_id (list all collections)
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

export default router

