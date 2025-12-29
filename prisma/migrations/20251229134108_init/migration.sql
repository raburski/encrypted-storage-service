-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_chunks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "collection_name" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "encrypted_data" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "metadata" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encrypted_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "encrypted_chunks_user_id_collection_name_idx" ON "encrypted_chunks"("user_id", "collection_name");

-- CreateIndex
CREATE INDEX "encrypted_chunks_user_id_collection_name_chunk_id_idx" ON "encrypted_chunks"("user_id", "collection_name", "chunk_id");

-- CreateIndex
CREATE INDEX "encrypted_chunks_user_id_collection_name_updated_at_idx" ON "encrypted_chunks"("user_id", "collection_name", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_chunks_user_id_collection_name_chunk_id_key" ON "encrypted_chunks"("user_id", "collection_name", "chunk_id");

-- AddForeignKey
ALTER TABLE "encrypted_chunks" ADD CONSTRAINT "encrypted_chunks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
