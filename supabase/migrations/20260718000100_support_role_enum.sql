-- Add the customer-support role. Kept in its own migration because a new enum
-- value cannot be added and then used within the same transaction.
alter type public.app_role add value if not exists 'support';
