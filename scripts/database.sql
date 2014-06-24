CREATE DATABASE `robocoin_connector`;

USE `robocoin_connector`;

CREATE TABLE `transactions` (
    `robocoin_tx_id` VARCHAR(256) NOT NULL,
    `exchange_tx_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_type` VARCHAR(45) NOT NULL,
    `robocoin_fiat` DECIMAL(20,2) DEFAULT NULL,
    `exchange_fiat` DECIMAL(20,5) DEFAULT NULL,
    `robocoin_xbt` DECIMAL(20,8) NOT NULL,
    `exchange_xbt` DECIMAL(20,8) DEFAULT NULL,
    `confirmations` MEDIUMINT UNSIGNED DEFAULT NULL,
    `exchange_order_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_fee` DECIMAL(20,8) DEFAULT NULL,
    `exchange_tx_fee` DECIMAL(20,8) DEFAULT NULL,
    `robocoin_miners_fee` DECIMAL(20,8) DEFAULT NULL,
    `exchange_miners_fee` DECIMAL(20,8) DEFAULT NULL,
    `robocoin_tx_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `exchange_tx_time` TIMESTAMP NULL DEFAULT NULL
) ENGINE = INNODB;

CREATE UNIQUE INDEX `robocoin_tx_id` ON `transactions`(`robocoin_tx_id`);
