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
  `capital` decimal(18,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `capital_companies_company_stakeholder_active_unique` (`company_id`,`stakeholder_name`,`active_flag`),
  KEY `capital_companies_stakeholder_name_index` (`stakeholder_name`),
  KEY `capital_companies_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `capital_companies_deleted_id_idx` (`deleted_at`,`id`),
  CONSTRAINT `capital_companies_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
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
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_name_series_active_unique` (`name`,`series`,`active_flag`),
  KEY `companies_deleted_at_index` (`deleted_at`),
  KEY `companies_name_index` (`name`)
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
  `price_per_unit` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_assets_company_id_asset_date_index` (`company_id`,`asset_date`),
  KEY `company_assets_asset_date_index` (`asset_date`),
  KEY `company_assets_name_index` (`name`),
  KEY `company_assets_comp_del_date_id_idx` (`company_id`,`deleted_at`,`asset_date`,`id`),
  KEY `company_assets_del_date_id_idx` (`deleted_at`,`asset_date`,`id`),
  CONSTRAINT `company_assets_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `employee_shift_id` bigint unsigned DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `clock_in_at` timestamp NULL DEFAULT NULL,
  `clock_out_at` timestamp NULL DEFAULT NULL,
  `late_minutes` smallint unsigned NOT NULL DEFAULT '0',
  `overtime_minutes` smallint unsigned NOT NULL DEFAULT '0',
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_attendances_company_emp_date_active_unique` (`company_id`,`employee_id`,`attendance_date`,`active_flag`),
  KEY `employee_attendances_employee_shift_id_foreign` (`employee_shift_id`),
  KEY `employee_attendances_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `employee_attendances_company_date_idx` (`company_id`,`attendance_date`),
  KEY `employee_attendances_emp_date_idx` (`employee_id`,`attendance_date`),
  CONSTRAINT `employee_attendances_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employee_attendances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employee_attendances_employee_shift_id_foreign` FOREIGN KEY (`employee_shift_id`) REFERENCES `employee_shifts` (`id`) ON DELETE RESTRICT
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
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_documents_emp_type_active_unique` (`employee_id`,`document_type`,`active_flag`),
  KEY `employee_documents_document_type_index` (`document_type`),
  KEY `employee_documents_emp_deleted_idx` (`employee_id`,`deleted_at`),
  CONSTRAINT `employee_documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_positions_code_active_unique` (`code`,`active_flag`),
  UNIQUE KEY `employee_positions_name_active_unique` (`name`,`active_flag`),
  KEY `employee_positions_name_index` (`name`),
  KEY `employee_positions_del_name_id_idx` (`deleted_at`,`name`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_shift_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shift_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `employee_shift_id` bigint unsigned NOT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_shift_assignments_company_emp_eff_active_unique` (`company_id`,`employee_id`,`effective_date`,`active_flag`),
  KEY `employee_shift_assignments_employee_shift_id_foreign` (`employee_shift_id`),
  KEY `employee_shift_assignments_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `employee_shift_assignments_emp_date_range_idx` (`employee_id`,`effective_date`,`end_date`),
  CONSTRAINT `employee_shift_assignments_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employee_shift_assignments_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employee_shift_assignments_employee_shift_id_foreign` FOREIGN KEY (`employee_shift_id`) REFERENCES `employee_shifts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_minutes` smallint unsigned NOT NULL DEFAULT '0',
  `grace_period_minutes` smallint unsigned NOT NULL DEFAULT '0',
  `is_overnight` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_shifts_company_code_active_unique` (`company_id`,`code`,`active_flag`),
  KEY `employee_shifts_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `employee_shifts_company_status_idx` (`company_id`,`status`),
  CONSTRAINT `employee_shifts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
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
  `employee_attendance_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_company_nik_active_unique` (`company_id`,`nik_ktp`,`active_flag`),
  KEY `employees_employee_position_id_index` (`employee_position_id`),
  KEY `employees_name_index` (`name`),
  KEY `employees_employment_status_id_index` (`employment_status_id`),
  KEY `employees_payroll_grade_id_index` (`payroll_grade_id`),
  KEY `employees_tax_status_id_index` (`tax_status_id`),
  KEY `employees_employee_attendance_code_index` (`employee_attendance_code`),
  KEY `employees_comp_del_name_id_idx` (`company_id`,`deleted_at`,`name`,`id`),
  KEY `employees_del_name_id_idx` (`deleted_at`,`name`,`id`),
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
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employment_statuses_code_active_unique` (`code`,`active_flag`),
  UNIQUE KEY `employment_statuses_name_active_unique` (`name`,`active_flag`),
  KEY `employment_statuses_name_index` (`name`),
  KEY `employment_statuses_del_name_id_idx` (`deleted_at`,`name`,`id`)
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
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_categories_company_name_active_unique` (`company_id`,`name`,`active_flag`),
  KEY `expense_categories_name_index` (`name`),
  KEY `expense_categories_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `expense_categories_deleted_id_idx` (`deleted_at`,`id`),
  CONSTRAINT `expense_categories_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
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
  `amount` decimal(18,2) NOT NULL,
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
  KEY `expense_items_name_index` (`name`),
  KEY `expense_items_purchased_on_index` (`purchased_on`),
  KEY `expense_items_closing_date_index` (`closing_date`),
  KEY `expense_items_employee_id_index` (`employee_id`),
  KEY `expense_items_comp_del_purchased_idx` (`company_id`,`deleted_at`,`purchased_on`),
  KEY `expense_items_comp_del_cat_type_idx` (`company_id`,`deleted_at`,`expense_category_id`,`expense_type_id`),
  KEY `expense_items_deleted_id_idx` (`deleted_at`,`id`),
  CONSTRAINT `expense_items_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `expense_items_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `expense_items_expense_category_id_foreign` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `expense_items_expense_type_id_foreign` FOREIGN KEY (`expense_type_id`) REFERENCES `expense_types` (`id`) ON DELETE RESTRICT
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
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_types_company_cat_name_active_unique` (`company_id`,`expense_category_id`,`name`,`active_flag`),
  KEY `expense_types_expense_category_id_index` (`expense_category_id`),
  KEY `expense_types_name_index` (`name`),
  KEY `expense_types_company_deleted_idx` (`company_id`,`deleted_at`),
  KEY `expense_types_comp_cat_del_idx` (`company_id`,`expense_category_id`,`deleted_at`),
  KEY `expense_types_deleted_id_idx` (`deleted_at`,`id`),
  CONSTRAINT `expense_types_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `expense_types_expense_category_id_foreign` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `item_packet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_packet` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `packet_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_packet_comp_packet_item_active_unique` (`company_id`,`packet_id`,`item_id`,`active_flag`),
  KEY `item_packet_item_id_foreign` (`item_id`),
  KEY `item_packet_del_packet_id_idx` (`deleted_at`,`packet_id`,`id`),
  KEY `item_packet_del_item_id_idx` (`deleted_at`,`item_id`,`id`),
  KEY `item_packet_packet_id_foreign` (`packet_id`),
  KEY `item_packet_comp_del_packet_id_idx` (`company_id`,`deleted_at`,`packet_id`,`id`),
  KEY `item_packet_comp_del_item_id_idx` (`company_id`,`deleted_at`,`item_id`,`id`),
  CONSTRAINT `item_packet_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `item_packet_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `item_packet_packet_id_foreign` FOREIGN KEY (`packet_id`) REFERENCES `packets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Bahan',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `items_company_name_active_unique` (`company_id`,`name`,`active_flag`),
  UNIQUE KEY `items_company_code_active_unique` (`company_id`,`code`,`active_flag`),
  KEY `items_name_index` (`name`),
  KEY `items_del_name_id_idx` (`deleted_at`,`name`,`id`),
  KEY `items_comp_del_name_id_idx` (`company_id`,`deleted_at`,`name`,`id`),
  KEY `items_comp_del_type_idx` (`company_id`,`deleted_at`,`type`),
  KEY `items_comp_del_code_id_idx` (`company_id`,`deleted_at`,`code`,`id`),
  KEY `items_del_code_id_idx` (`deleted_at`,`code`,`id`),
  CONSTRAINT `items_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
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
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lab_samples_batch_code_active_unique` (`batch_code`,`active_flag`),
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
DROP TABLE IF EXISTS `packet_names`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `packet_names` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packet_names_name_active_unique` (`name`,`active_flag`),
  KEY `packet_names_del_name_id_idx` (`deleted_at`,`name`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `packet_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `packet_vendors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packet_vendors_name_active_unique` (`name`,`active_flag`),
  KEY `packet_vendors_del_name_id_idx` (`deleted_at`,`name`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `packets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `packets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packets_name_active_unique` (`name`,`active_flag`),
  KEY `packets_name_index` (`name`),
  KEY `packets_del_name_id_idx` (`deleted_at`,`name`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payroll_grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_grades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `grade` tinyint unsigned NOT NULL,
  `sub_grade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_label` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_salary` decimal(18,2) NOT NULL,
  `position_allowance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_gross` decimal(18,2) NOT NULL,
  `bpjs_kesehatan_company` decimal(18,2) NOT NULL,
  `bpjs_kesehatan_employee` decimal(18,2) NOT NULL,
  `bpjs_ketenagakerjaan_company` decimal(18,2) NOT NULL,
  `bpjs_ketenagakerjaan_employee` decimal(18,2) NOT NULL,
  `net_employee_received` decimal(18,2) NOT NULL,
  `total_company_cost` decimal(18,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_grades_grade_sub_active_unique` (`grade`,`sub_grade`,`active_flag`),
  KEY `payroll_grades_del_grade_sub_idx` (`deleted_at`,`grade`,`sub_grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payroll_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `payroll_run_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `employee_position_id` bigint unsigned DEFAULT NULL,
  `payroll_group` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'office',
  `attendance_days` smallint unsigned NOT NULL DEFAULT '0',
  `bank_account_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_salary` decimal(18,2) NOT NULL DEFAULT '0.00',
  `bpjs_kesehatan` decimal(18,2) NOT NULL DEFAULT '0.00',
  `bpjs_ketenagakerjaan` decimal(18,2) NOT NULL DEFAULT '0.00',
  `bonus` decimal(18,2) NOT NULL DEFAULT '0.00',
  `overtime` decimal(18,2) NOT NULL DEFAULT '0.00',
  `deduction` decimal(18,2) NOT NULL DEFAULT '0.00',
  `thr` decimal(18,2) NOT NULL DEFAULT '0.00',
  `pph21` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_net` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finalized_by` bigint unsigned DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_items_comp_run_emp_active_unique` (`company_id`,`payroll_run_id`,`employee_id`,`active_flag`),
  KEY `payroll_items_employee_id_foreign` (`employee_id`),
  KEY `payroll_items_comp_del_run_id_idx` (`company_id`,`deleted_at`,`payroll_run_id`,`id`),
  KEY `payroll_items_employee_position_id_foreign` (`employee_position_id`),
  KEY `payroll_items_run_del_group_id_idx` (`payroll_run_id`,`deleted_at`,`payroll_group`,`id`),
  KEY `payroll_items_comp_del_emp_idx` (`company_id`,`deleted_at`,`employee_id`),
  KEY `payroll_items_deleted_id_idx` (`deleted_at`,`id`),
  KEY `payroll_items_finalized_by_foreign` (`finalized_by`),
  KEY `payroll_items_run_del_status_idx` (`payroll_run_id`,`deleted_at`,`status`),
  CONSTRAINT `payroll_items_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payroll_items_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payroll_items_employee_position_id_foreign` FOREIGN KEY (`employee_position_id`) REFERENCES `employee_positions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payroll_items_finalized_by_foreign` FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payroll_items_payroll_run_id_foreign` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payroll_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_date` date NOT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `total_base_salary` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_bpjs_kesehatan` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_bpjs_ketenagakerjaan` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_bonus` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_overtime` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_deduction` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_thr` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_pph21` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_net` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_runs_company_period_active_unique` (`company_id`,`period_date`,`active_flag`),
  UNIQUE KEY `payroll_runs_company_code_active_unique` (`company_id`,`code`,`active_flag`),
  UNIQUE KEY `payroll_runs_company_name_active_unique` (`company_id`,`name`,`active_flag`),
  KEY `payroll_runs_approved_by_foreign` (`approved_by`),
  KEY `payroll_runs_comp_del_period_id_idx` (`company_id`,`deleted_at`,`period_date`,`id`),
  KEY `payroll_runs_del_period_id_idx` (`deleted_at`,`period_date`,`id`),
  KEY `payroll_runs_comp_del_status_idx` (`company_id`,`deleted_at`,`status`),
  CONSTRAINT `payroll_runs_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payroll_runs_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
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
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint unsigned GENERATED ALWAYS AS ((case when (`deleted_at` is null) then 1 else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_statuses_code_active_unique` (`code`,`active_flag`),
  UNIQUE KEY `tax_statuses_name_active_unique` (`name`,`active_flag`),
  KEY `tax_statuses_name_index` (`name`),
  KEY `tax_statuses_del_code_id_idx` (`deleted_at`,`code`,`id`)
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
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2026_11_21_120000_database_wide_cleanup',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2026_11_21_130000_create_employee_shifts_table',21);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2026_11_21_140000_create_employee_attendances_table',22);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2026_11_21_150000_create_employee_shift_assignments_table',23);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2026_11_21_160000_add_employee_attendance_code_to_employees_table',24);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39,'2026_11_21_170000_cfo_indexes_and_fk_hardening',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'2026_11_21_180000_cho_query_indexes',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (41,'2026_11_21_170000_enforce_cfo_and_lab_active_uniqueness',27);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42,'2026_11_21_173000_enforce_cho_name_active_uniqueness',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (43,'2026_11_23_100000_create_payroll_runs_table',29);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44,'2026_11_23_100100_create_payroll_items_table',29);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45,'2026_11_23_110000_update_payroll_items_table_for_spec',30);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46,'2026_11_23_120000_add_finalization_fields_to_payroll_items_table',31);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47,'2026_11_23_130000_make_cho_master_tables_company_agnostic',32);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48,'2026_11_24_100000_create_items_table',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49,'2026_11_24_110000_create_packets_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (50,'2026_11_24_120000_create_item_packet_table',35);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (51,'2026_11_24_130000_scope_items_and_item_packet_to_company',36);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (52,'2026_11_24_140000_add_code_to_items_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (53,'2026_11_24_150000_create_packet_names_table',38);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (54,'2026_11_24_160000_create_packet_vendors_table',39);
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
