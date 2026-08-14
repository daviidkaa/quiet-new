-- RSA-OAEP SPKI public keys encoded as Base64 exceed VARCHAR(191).
ALTER TABLE `User` MODIFY COLUMN `publicKey` MEDIUMTEXT NULL;
