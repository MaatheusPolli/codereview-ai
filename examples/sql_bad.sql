-- SQL Example with issues:
-- 1. SELECT * is bad practice
-- 2. Potential SQL Injection
-- 3. Missing index on frequently filtered column

SELECT * FROM users WHERE username = 'admin' AND password = 'password123';

-- Inefficient join
SELECT users.name, orders.amount 
FROM users, orders 
WHERE users.id = orders.user_id;
