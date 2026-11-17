-- Add persistent favourite status to each note. Existing notes default to not favourite.
ALTER TABLE "Note" ADD COLUMN "isFavourite" BOOLEAN NOT NULL DEFAULT false;

-- Helps list a user's favourite notes first while sorting by creation date.
CREATE INDEX "Note_userId_isFavourite_createdAt_idx"
ON "Note"("userId", "isFavourite", "createdAt");
