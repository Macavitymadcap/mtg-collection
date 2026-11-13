-- Separate database for integration tests
CREATE DATABASE IF NOT EXISTS mtg_test;
GRANT ALL ON mtg_test.* TO 'app'@'%';
