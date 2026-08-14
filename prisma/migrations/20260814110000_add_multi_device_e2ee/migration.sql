CREATE TABLE `Device` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `publicKey` MEDIUMTEXT NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Browser',
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `linkCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    UNIQUE INDEX `Device_linkCode_key`(`linkCode`),
    INDEX `Device_userId_approved_idx`(`userId`, `approved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MessageKeyEnvelope` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messageId` INTEGER NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `encryptedKey` MEDIUMTEXT NOT NULL,
    UNIQUE INDEX `MessageKeyEnvelope_messageId_deviceId_key`(`messageId`, `deviceId`),
    INDEX `MessageKeyEnvelope_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Device` ADD CONSTRAINT `Device_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MessageKeyEnvelope` ADD CONSTRAINT `MessageKeyEnvelope_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MessageKeyEnvelope` ADD CONSTRAINT `MessageKeyEnvelope_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
