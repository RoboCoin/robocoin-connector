CREATE TABLE transactions (
    robocoin_tx_id VARCHAR(256) NOT NULL UNIQUE,
    exchange_tx_id INT DEFAULT NULL,
    robocoin_tx_type VARCHAR(45) NOT NULL,
    robocoin_fiat DECIMAL(20,2) NOT NULL,
    robocoin_currency CHAR(3) NOT NULL,
    exchange_to_kiosk_conversion_rate DECIMAL(20,5),
    exchange_fiat DECIMAL(20,5) DEFAULT NULL,
    exchange_currency CHAR(3) DEFAULT NULL,
    converted_exchange_fiat DECIMAL(20,5) DEFAULT NULL,
    robocoin_xbt DECIMAL(20,8) NOT NULL,
    exchange_xbt DECIMAL(20,8) DEFAULT NULL,
    confirmations INT DEFAULT NULL,
    robocoin_tx_fee DECIMAL(20,8) DEFAULT NULL,
    exchange_tx_fee DECIMAL(20,8) DEFAULT NULL,
    robocoin_miners_fee DECIMAL(20,8) DEFAULT NULL,
    exchange_miners_fee DECIMAL(20,8) DEFAULT NULL,
    robocoin_tx_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exchange_tx_time TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE config (
    param_name varchar(256) not null unique,
    param_value TEXT
);

CREATE TABLE sessions (
    sid text NOT NULL UNIQUE,
    session_data text NOT NULL
);

CREATE EXTENSION citext;
CREATE TABLE users (
    id SERIAL UNIQUE,
    username CITEXT NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL
);
CREATE TABLE failed_logins (
    user_id INT NOT NULL REFERENCES users (id),
    time_attempted TIMESTAMP NOT NULL DEFAULT current_timestamp
);
CREATE INDEX ON failed_logins (time_attempted);

CREATE TABLE logs (
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(7) NOT NULL,
    message TEXT NOT NULL,
    meta TEXT NOT NULL
);
