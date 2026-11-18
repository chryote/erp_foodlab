-- Ensure test database exists alongside primary database for running Pest tests in Docker
CREATE DATABASE IF NOT EXISTS `erp_foodlab` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `erp_foodlab_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `erp_foodlab_testing`.* TO 'foodlab'@'%';
FLUSH PRIVILEGES;
