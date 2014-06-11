CREATE DATABASE `robocoin_connector`;

USE `robocoin_connector`;

CREATE TABLE `transactions` (
    `robocoin_id` VARCHAR(256) NOT NULL,
    `bitstamp_tx_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_type` VARCHAR(45) NOT NULL,
    `bitstamp_tx_type` VARCHAR(45) DEFAULT NULL,
    `robocoin_fiat` DECIMAL(20,2) DEFAULT NULL,
    `bitstamp_fiat` DECIMAL(20,5) DEFAULT NULL,
    `robocoin_xbt` DECIMAL(20,8) NOT NULL,
    `bitstamp_xbt` DECIMAL(20,8) DEFAULT NULL,
    `confirmations` MEDIUMINT UNSIGNED DEFAULT NULL,
    `bitstamp_order_id` INT UNSIGNED DEFAULT NULL,
    `bitstamp_tx_fee` DECIMAL(20,5) DEFAULT NULL,
    `bitstamp_withdrawal_id` INT UNSIGNED DEFAULT NULL,
    `robocoin_tx_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `bitstamp_tx_time` TIMESTAMP NULL DEFAULT NULL
) ENGINE = INNODB;

CREATE UNIQUE INDEX `robocoin_id` ON `transactions`(`robocoin_id`);
# TODO does this index do anything on bigger tables?
CREATE INDEX `unprocessed_txs` ON `transactions`(`robocoin_tx_type`, `bitstamp_withdrawal_id`, `confirmations`, `bitstamp_order_id`);
