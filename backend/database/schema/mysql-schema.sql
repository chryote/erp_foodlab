/*M!999999\- enable the sandbox mode */ 
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `capital_companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `capital_companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `stakeholder_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `capital` double NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `capital_companies_company_id_index` (`company_id`),
  KEY `capital_companies_capital_index` (`capital`),
  KEY `capital_companies_created_at_index` (`created_at`),
  KEY `capital_companies_updated_at_index` (`updated_at`),
  KEY `capital_companies_deleted_at_index` (`deleted_at`),
  KEY `capital_companies_stakeholder_name_index` (`stakeholder_name`),
  CONSTRAINT `capital_companies_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `series` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `companies_created_at_index` (`created_at`),
  KEY `companies_updated_at_index` (`updated_at`),
  KEY `companies_deleted_at_index` (`deleted_at`),
  KEY `companies_name_index` (`name`),
  KEY `companies_series_index` (`series`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `company_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `asset_date` date NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int unsigned NOT NULL DEFAULT '1',
  `price_per_unit` double NOT NULL DEFAULT '0',
  `total_price` double NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_assets_company_id_asset_date_index` (`company_id`,`asset_date`),
  KEY `company_assets_asset_date_index` (`asset_date`),
  KEY `company_assets_amount_index` (`amount`),
  KEY `company_assets_total_price_index` (`total_price`),
  KEY `company_assets_created_at_index` (`created_at`),
  KEY `company_assets_updated_at_index` (`updated_at`),
  KEY `company_assets_deleted_at_index` (`deleted_at`),
  KEY `company_assets_name_index` (`name`),
  CONSTRAINT `company_assets_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `document_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_documents_employee_id_document_type_deleted_at_unique` (`employee_id`,`document_type`,`deleted_at`),
  KEY `employee_documents_employee_id_index` (`employee_id`),
  KEY `employee_documents_document_type_index` (`document_type`),
  KEY `employee_documents_created_at_index` (`created_at`),
  KEY `employee_documents_updated_at_index` (`updated_at`),
  KEY `employee_documents_deleted_at_index` (`deleted_at`),
  CONSTRAINT `employee_documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_positions_code_unique` (`code`),
  KEY `employee_positions_company_id_index` (`company_id`),
  KEY `employee_positions_created_at_index` (`created_at`),
  KEY `employee_positions_updated_at_index` (`updated_at`),
  KEY `employee_positions_deleted_at_index` (`deleted_at`),
  KEY `employee_positions_name_index` (`name`),
  CONSTRAINT `employee_positions_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `employee_position_id` bigint unsigned DEFAULT NULL,
  `employment_status_id` bigint unsigned DEFAULT NULL,
  `payroll_grade_id` bigint unsigned DEFAULT NULL,
  `tax_status_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nik_ktp` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_place` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `religion` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ktp_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `domicile_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `whatsapp_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_phone_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tiktok` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bpjs_ketenagakerjaan` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bpjs_kesehatan` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `npwp_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_nik_ktp_unique` (`nik_ktp`),
  KEY `employees_company_id_index` (`company_id`),
  KEY `employees_employee_position_id_index` (`employee_position_id`),
  KEY `employees_created_at_index` (`created_at`),
  KEY `employees_updated_at_index` (`updated_at`),
  KEY `employees_deleted_at_index` (`deleted_at`),
  KEY `employees_name_index` (`name`),
  KEY `employees_employment_status_id_index` (`employment_status_id`),
  KEY `employees_payroll_grade_id_index` (`payroll_grade_id`),
  KEY `employees_tax_status_id_index` (`tax_status_id`),
  KEY `employees_gender_index` (`gender`),
  KEY `employees_religion_index` (`religion`),
  CONSTRAINT `employees_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employees_employee_position_id_foreign` FOREIGN KEY (`employee_position_id`) REFERENCES `employee_positions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employees_employment_status_id_foreign` FOREIGN KEY (`employment_status_id`) REFERENCES `employment_statuses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employees_payroll_grade_id_foreign` FOREIGN KEY (`payroll_grade_id`) REFERENCES `payroll_grades` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employees_tax_status_id_foreign` FOREIGN KEY (`tax_status_id`) REFERENCES `tax_statuses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employment_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employment_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employment_statuses_code_unique` (`code`),
  KEY `employment_statuses_company_id_index` (`company_id`),
  KEY `employment_statuses_created_at_index` (`created_at`),
  KEY `employment_statuses_updated_at_index` (`updated_at`),
  KEY `employment_statuses_deleted_at_index` (`deleted_at`),
  KEY `employment_statuses_name_index` (`name`),
  CONSTRAINT `employment_statuses_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_categories_created_at_index` (`created_at`),
  KEY `expense_categories_updated_at_index` (`updated_at`),
  KEY `expense_categories_deleted_at_index` (`deleted_at`),
  KEY `expense_categories_name_index` (`name`),
  KEY `expense_categories_company_id_index` (`company_id`),
  CONSTRAINT `expense_categories_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expense_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_category_id` bigint unsigned NOT NULL,
  `expense_type_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` double NOT NULL,
  `purchased_on` date DEFAULT NULL,
  `closing_date` date DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `detail` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_items_expense_type_id_foreign` (`expense_type_id`),
  KEY `expense_items_company_id_foreign` (`company_id`),
  KEY `expense_items_cat_type_comp_idx` (`expense_category_id`,`expense_type_id`,`company_id`),
  KEY `expense_items_amount_index` (`amount`),
  KEY `expense_items_created_at_index` (`created_at`),
  KEY `expense_items_updated_at_index` (`updated_at`),
  KEY `expense_items_deleted_at_index` (`deleted_at`),
  KEY `expense_items_name_index` (`name`),
  KEY `expense_items_purchased_on_index` (`purchased_on`),
  KEY `expense_items_closing_date_index` (`closing_date`),
  KEY `expense_items_employee_id_index` (`employee_id`),
  CONSTRAINT `expense_items_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expense_items_expense_category_id_foreign` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expense_items_expense_type_id_foreign` FOREIGN KEY (`expense_type_id`) REFERENCES `expense_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expense_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_category_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_types_expense_category_id_index` (`expense_category_id`),
  KEY `expense_types_created_at_index` (`created_at`),
  KEY `expense_types_updated_at_index` (`updated_at`),
  KEY `expense_types_deleted_at_index` (`deleted_at`),
  KEY `expense_types_name_index` (`name`),
  KEY `expense_types_company_id_index` (`company_id`),
  CONSTRAINT `expense_types_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expense_types_expense_category_id_foreign` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lab_samples`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_samples` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ph_level` decimal(4,2) NOT NULL,
  `moisture_percent` decimal(5,2) NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lab_samples_batch_code_unique` (`batch_code`),
  KEY `lab_samples_category_index` (`category`),
  KEY `lab_samples_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payroll_grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_grades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `grade` tinyint unsigned NOT NULL,
  `sub_grade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_label` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_salary` double NOT NULL,
  `position_allowance` double NOT NULL DEFAULT '0',
  `total_gross` double NOT NULL,
  `bpjs_kesehatan_company` double NOT NULL,
  `bpjs_kesehatan_employee` double NOT NULL,
  `bpjs_ketenagakerjaan_company` double NOT NULL,
  `bpjs_ketenagakerjaan_employee` double NOT NULL,
  `net_employee_received` double NOT NULL,
  `total_company_cost` double NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_grades_grade_sub_grade_deleted_at_unique` (`grade`,`sub_grade`,`deleted_at`),
  KEY `payroll_grades_company_id_index` (`company_id`),
  KEY `payroll_grades_created_at_index` (`created_at`),
  KEY `payroll_grades_updated_at_index` (`updated_at`),
  KEY `payroll_grades_deleted_at_index` (`deleted_at`),
  KEY `payroll_grades_grade_index` (`grade`),
  CONSTRAINT `payroll_grades_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tax_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_statuses_code_unique` (`code`),
  KEY `tax_statuses_company_id_index` (`company_id`),
  KEY `tax_statuses_created_at_index` (`created_at`),
  KEY `tax_statuses_updated_at_index` (`updated_at`),
  KEY `tax_statuses_deleted_at_index` (`deleted_at`),
  KEY `tax_statuses_name_index` (`name`),
  CONSTRAINT `tax_statuses_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

/*M!999999\- enable the sandbox mode */ 
SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2026_01_01_000002_create_lab_samples_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2026_01_01_000003_create_companies_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2026_01_01_000004_create_capital_companies_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2026_01_01_000005_move_stakeholder_name_to_capital_companies_table',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2026_01_01_000006_add_series_to_companies_table',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2026_11_19_022819_create_expense_categories_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2026_11_19_044225_create_expense_types_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2026_11_19_051751_create_expense_items_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2026_11_19_080000_add_company_id_to_expense_categories_and_types_tables',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2026_11_19_090000_add_details_and_dates_to_expense_items_table',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2026_11_19_100000_add_soft_deletes_to_lab_samples_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2026_11_20_000001_create_personal_access_tokens_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2026_11_20_100000_create_company_assets_table',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2026_11_20_110000_create_employee_positions_table',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2026_11_20_120000_create_employees_table',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2026_11_20_130000_create_employment_statuses_table',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2026_11_20_140000_add_employment_status_id_to_employees_table',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2026_11_20_150000_create_payroll_grades_table',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2026_11_20_160000_add_payroll_grade_id_to_employees_table',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2026_11_20_170000_create_tax_statuses_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2026_11_20_180000_add_tax_status_id_to_employees_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2026_11_20_190000_add_profile_fields_to_employees_table',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2026_11_20_200000_create_employee_documents_table',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'2026_11_21_000001_make_code_nullable_on_employee_positions_table',17);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'2026_11_21_000002_make_code_nullable_on_employment_statuses_table',18);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2026_11_21_000003_make_code_nullable_on_tax_statuses_table',19);
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
