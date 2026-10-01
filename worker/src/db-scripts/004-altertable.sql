ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token TEXT,
ADD COLUMN verification_token_expires TIMESTAMPTZ;

ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'disabled', 'pending'));