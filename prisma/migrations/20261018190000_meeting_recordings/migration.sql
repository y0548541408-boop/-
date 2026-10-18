-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('processing', 'ready', 'failed', 'published', 'discarded');

-- CreateTable
CREATE TABLE "meeting_recordings" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'processing',
    "error_message" TEXT,
    "draft_title" TEXT,
    "draft_summary" TEXT,
    "draft_next_focus" TEXT,
    "draft_tasks" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

