CREATE DATABASE `robocoin_connector`;

USE `robocoin_connector`;

CREATE TABLE `transactions` (
    `robocoin_tx_id` VARCHAR(256) NOT NULL,
    `bitstamp_tx_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_type` VARCHAR(45) NOT NULL,
    `bitstamp_tx_type` VARCHAR(45) DEFAULT NULL,
    `robocoin_fiat` DECIMAL(20,2) DEFAULT NULL,
    `bitstamp_fiat` DECIMAL(20,5) DEFAULT NULL,
    `robocoin_xbt` DECIMAL(20,8) NOT NULL,
    `bitstamp_xbt` DECIMAL(20,8) DEFAULT NULL,
    `confirmations` MEDIUMINT UNSIGNED DEFAULT NULL,
    `bitstamp_order_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_fee` DECIMAL(20,8) DEFAULT NULL,
    `bitstamp_tx_fee` DECIMAL(20,8) DEFAULT NULL,
    `robocoin_miners_fee` DECIMAL(20,8) DEFAULT NULL,
    `bitstamp_miners_fee` DECIMAL(20,8) DEFAULT NULL,
    `bitstamp_withdrawal_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `bitstamp_tx_time` TIMESTAMP NULL DEFAULT NULL
) ENGINE = INNODB;

CREATE UNIQUE INDEX `robocoin_tx_id` ON `transactions`(`robocoin_tx_id`);
