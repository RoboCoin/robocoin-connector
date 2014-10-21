ALTER TABLE transactions ALTER exchange_tx_id TYPE VARCHAR(256);
UPDATE transactions SET exchange_fiat = ABS(exchange_fiat);
