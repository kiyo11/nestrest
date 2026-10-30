-- Add intermediate SENDING state for crash-safe, exactly-once email dispatch.
ALTER TYPE "MessageState" ADD VALUE IF NOT EXISTS 'SENDING' BEFORE 'SKIPPED';

-- Track when a row was claimed PENDING->SENDING so a stale reaper can recover
-- crashed/timed-out sends back to PENDING.
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
