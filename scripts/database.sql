CREATE TABLE transactions (
    robocoin_tx_id VARCHAR(256) NOT NULL UNIQUE,
    exchange_tx_id INT DEFAULT NULL,
    robocoin_tx_type VARCHAR(45) NOT NULL,
    robocoin_fiat DECIMAL(20,2) DEFAULT NULL,
    exchange_fiat DECIMAL(20,5) DEFAULT NULL,
    robocoin_xbt DECIMAL(20,8) NOT NULL,
    exchange_xbt DECIMAL(20,8) DEFAULT NULL,
    confirmations INT DEFAULT NULL,
    exchange_order_id INT DEFAULT NULL,
    robocoin_tx_fee DECIMAL(20,8) DEFAULT NULL,
    exchange_tx_fee DECIMAL(20,8) DEFAULT NULL,
    robocoin_miners_fee DECIMAL(20,8) DEFAULT NULL,
    exchange_miners_fee DECIMAL(20,8) DEFAULT NULL,
    robocoin_tx_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exchange_tx_time TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE config (
    param_name varchar(256) not null unique,
    param_value varchar(256)
);
INSERT INTO config (param_name, param_value) VALUES
    ('exchangeClass', 'MockBitstamp'),
    ('bitstamp.baseUrl', 'https://www.bitstamp.net/api'),
    ('robocoin.baseUrl', 'https://www.somefutureurl.net/api/0'),
    ('robocoin.testMode', '1');

CREATE TABLE sessions (
    sid text NOT NULL UNIQUE,
    session_data text NOT NULL
);

CREATE TABLE users (
    id SERIAL UNIQUE,
    username VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL,
    locked_until TIMESTAMP NULL DEFAULT NULL
);
CREATE TABLE failed_logins (
    user_id INT NOT NULL REFERENCES users (id),
    time_attempted TIMESTAMP NOT NULL DEFAULT current_timestamp
);
