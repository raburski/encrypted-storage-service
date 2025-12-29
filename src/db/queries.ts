import { prisma } from '../lib/prisma'

// Chunk operations (used for all collections)
export async function getChunk(
  userId: string,
  collectionName: string,
  chunkId: string
) {
  return prisma.encryptedChunk.findUnique({
    where: {
      userId_collectionName_chunkId: {
        userId,
        collectionName,
        chunkId,
      },
    },
  })
}

export async function upsertChunk(
  userId: string,
  collectionName: string,
  chunkId: string,
  encryptedData: Buffer,
  iv: Buffer,
  metadata: string | null = null
) {
  // Convert Buffer to Uint8Array for Prisma 6.x compatibility
  // Create a new ArrayBuffer copy to ensure correct type
  const encryptedDataArray = new Uint8Array(encryptedData) as Uint8Array
  const ivArray = new Uint8Array(iv) as Uint8Array
  
  const existing = await prisma.encryptedChunk.findUnique({
    where: {
      userId_collectionName_chunkId: {
        userId,
        collectionName,
        chunkId,
      },
    },
  })

  if (existing) {
    return prisma.encryptedChunk.update({
      where: { id: existing.id },
      data: {
        encryptedData: encryptedDataArray as any,
        iv: ivArray as any,
        metadata,
        version: existing.version + 1,
      },
    })
  } else {
    return prisma.encryptedChunk.create({
      data: {
        userId,
        collectionName,
        chunkId,
        encryptedData: encryptedDataArray as any,
        iv: ivArray as any,
        metadata,
        version: 1,
      },
    })
  }
}

export async function deleteChunk(
  userId: string,
  collectionName: string,
  chunkId: string
) {
  await prisma.encryptedChunk.deleteMany({
    where: {
      userId,
      collectionName,
      chunkId,
    },
  })
}

export async function listChunks(userId: string, collectionName: string) {
  return prisma.encryptedChunk.findMany({
    where: {
      userId,
      collectionName,
    },
    select: {
      chunkId: true,
      metadata: true,
      version: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function getChunksSince(
  userId: string,
  collectionName: string,
  since: Date | null = null
) {
  const chunks = await prisma.encryptedChunk.findMany({
    where: {
      userId,
      collectionName,
      ...(since && {
        updatedAt: {
          gt: since,
        },
      }),
    },
    orderBy: {
      updatedAt: 'asc',
    },
  })

  const latestSyncTimestamp = chunks.length > 0
    ? chunks.reduce((latest, chunk) => 
        chunk.updatedAt > latest ? chunk.updatedAt : latest, 
        chunks[0].updatedAt
      )
    : since || new Date()

  return { chunks, latestSyncTimestamp }
}

export async function getAllChunksForUser(
  userId: string,
  since: Date | null = null
) {
  const chunks = await prisma.encryptedChunk.findMany({
    where: {
      userId,
      ...(since && {
        updatedAt: {
          gt: since,
        },
      }),
    },
    orderBy: {
      updatedAt: 'asc',
    },
  })

  const latestSyncTimestamp = chunks.length > 0
    ? chunks.reduce((latest, chunk) => 
        chunk.updatedAt > latest ? chunk.updatedAt : latest, 
        chunks[0].updatedAt
      )
    : since || new Date()

  return { chunks, latestSyncTimestamp }
}

export async function patchChunk(
  userId: string,
  collectionName: string,
  chunkId: string,
  encryptedData: Buffer | undefined,
  iv: Buffer | undefined,
  metadata: string | undefined
) {
  const existing = await prisma.encryptedChunk.findUnique({
    where: {
      userId_collectionName_chunkId: {
        userId,
        collectionName,
        chunkId,
      },
    },
  })

  if (!existing) {
    return null
  }

  // Build update data object (only include fields that are provided)
  // Use Prisma's update input type to ensure type compatibility
  const updateData: {
    encryptedData?: Uint8Array
    iv?: Uint8Array
    metadata?: string | null
    version: number
  } = {
    version: existing.version + 1,
  }

  if (encryptedData !== undefined) {
    // Convert Buffer to Uint8Array for Prisma 6.x compatibility
    updateData.encryptedData = new Uint8Array(encryptedData) as any
  }
  if (iv !== undefined) {
    // Convert Buffer to Uint8Array for Prisma 6.x compatibility
    updateData.iv = new Uint8Array(iv) as any
  }
  if (metadata !== undefined) {
    updateData.metadata = metadata || null
  }

  return prisma.encryptedChunk.update({
    where: { id: existing.id },
    data: updateData as any, // Type assertion needed due to Prisma's strict typing
  })
}

export async function listCollections(userId: string) {
  // Get unique collections and their latest update time
  const chunks = await prisma.encryptedChunk.findMany({
    where: { userId },
    select: {
      collectionName: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
  
  // Group by collection and get latest update
  const collectionMap = new Map<string, Date>()
  const chunkCounts = new Map<string, number>()
  
  for (const chunk of chunks) {
    if (!collectionMap.has(chunk.collectionName) || 
        chunk.updatedAt > collectionMap.get(chunk.collectionName)!) {
      collectionMap.set(chunk.collectionName, chunk.updatedAt)
    }
    chunkCounts.set(
      chunk.collectionName,
      (chunkCounts.get(chunk.collectionName) || 0) + 1
    )
  }
  
  return Array.from(collectionMap.entries()).map(([name, latestUpdated]) => ({
    name,
    chunk_count: chunkCounts.get(name) || 0,
    latest_updated: latestUpdated,
  }))
}

