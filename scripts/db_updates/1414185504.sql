update transactions set exchange_fiat = abs(exchange_fiat);
update transactions set converted_exchange_fiat = (exchange_fiat * exchange_to_kiosk_conversion_rate);
