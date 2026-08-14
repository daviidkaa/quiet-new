-- Preserve existing plaintext messages as legacy data. They cannot be safely
-- converted to end-to-end encrypted messages because the server never had the
-- recipients' private keys.
ALTER TABLE `Message`
    ADD COLUMN `encryptedContent` MEDIUMTEXT NULL,
    ADD COLUMN `encryptedKey` MEDIUMTEXT NULL,
    ADD COLUMN `senderEncryptedKey` MEDIUMTEXT NULL,
    ADD COLUMN `iv` VARCHAR(191) NULL;
