-- New messages store only ciphertext. Preserve the former plaintext column for
-- legacy rows, but do not require it for end-to-end encrypted messages.
ALTER TABLE `Message` MODIFY COLUMN `content` VARCHAR(191) NULL;
