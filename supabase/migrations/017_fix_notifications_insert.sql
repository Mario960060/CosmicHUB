-- Fix: allow trigger to insert notifications (RLS was blocking - only service_role was allowed)
-- The trigger runs as function owner (postgres); add policy for that role

CREATE POLICY "Trigger creates notifications"
ON notifications FOR INSERT
TO postgres
WITH CHECK (true);
