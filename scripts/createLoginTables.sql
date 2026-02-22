-- SQL Script to create tables required for Login functionality
-- Run this script directly on your MySQL database server.
-- Replace the database name below with yours if different (must match DB_NAME in .env).

USE `u5gdchot-vizidot`;

-- Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('system', 'business', 'customer') NOT NULL,
  `level` INT NOT NULL DEFAULT 0,
  `permissions` JSON NULL DEFAULT (JSON_OBJECT()),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `type` (`type`),
  KEY `level` (`level`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firebase_uid` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `country_code` VARCHAR(5) NULL DEFAULT '+92',
  `profile_image` VARCHAR(500) NULL,
  `primary_role` VARCHAR(50) NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login` DATETIME NULL,
  `preferences` JSON NULL DEFAULT (JSON_OBJECT()),
  `address` JSON NULL DEFAULT (JSON_OBJECT()),
  `deleted_at` DATETIME NULL,
  `is_delete` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `firebase_uid` (`firebase_uid`),
  UNIQUE KEY `email` (`email`),
  KEY `is_active` (`is_active`),
  KEY `deleted_at` (`deleted_at`),
  KEY `is_delete` (`is_delete`),
  KEY `primary_role` (`primary_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `business_id` INT NULL,
  `assigned_by` INT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `metadata` JSON NULL DEFAULT (JSON_OBJECT()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role_business` (`user_id`, `role_id`, `business_id`),
  KEY `user_id` (`user_id`),
  KEY `role_id` (`role_id`),
  KEY `business_id` (`business_id`),
  KEY `is_active` (`is_active`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO `roles` (`name`, `display_name`, `description`, `type`, `level`, `permissions`, `is_active`) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', 'system', 100, JSON_OBJECT('all', TRUE), TRUE),
('admin', 'Administrator', 'Administrative access to manage the platform', 'system', 90, JSON_OBJECT('manage_users', TRUE, 'manage_businesses', TRUE), TRUE),
('business_admin', 'Business Administrator', 'Administrative access to manage a specific business', 'business', 80, JSON_OBJECT('manage_business', TRUE, 'manage_products', TRUE), TRUE),
('customer', 'Customer', 'Standard customer access', 'customer', 10, JSON_OBJECT('view_products', TRUE, 'place_orders', TRUE), TRUE)
ON DUPLICATE KEY UPDATE `name`=`name`;

SELECT 'Login tables created successfully!' AS message;

