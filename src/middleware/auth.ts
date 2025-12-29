import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  userId?: string
}

export function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization']
  const apiKey = authHeader && authHeader.split(' ')[1]

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

// Extract user_id from URL path
export function extractUserId(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.params.user_id

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'user_id is required in path' })
  }

  req.userId = userId
  next()
}

