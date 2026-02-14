-- CURSOR: Test script for notifications cleanup system
-- Run these queries step by step to verify the setup

-- ============================================
-- STEP 1: Verify Setup
-- ============================================

-- Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%notification%'
ORDER BY routine_name;

-- Expected: cleanup_old_notifications, trigger_cleanup_on_read, trigger_periodic_cleanup

-- Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- Expected: trigger_set_read_at, trigger_notification_periodic_cleanup

-- ============================================
-- STEP 2: Create Test Data
-- ============================================

-- Get a test user ID (replace with actual user_id if needed)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  -- Create fresh unread notification
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    test_user_id,
    'test',
    'Fresh Test Notification',
    'This is unread and recent',
    false
  );
  
  -- Create old read notification (should be deleted)
  INSERT INTO notifications (user_id, type, title, message, read, read_at)
  VALUES (
    test_user_id,
    'test',
    'Old Read Notification',
    'This should be deleted by cleanup',
    true,
    NOW() - INTERVAL '25 hours'
  );
  
  -- Create recent read notification (should NOT be deleted yet)
  INSERT INTO notifications (user_id, type, title, message, read, read_at)
  VALUES (
    test_user_id,
    'test',
    'Recent Read Notification',
    'This was just read',
    true,
    NOW() - INTERVAL '1 hour'
  );
  
  -- Create very old unread notification (should be deleted)
  INSERT INTO notifications (user_id, type, title, message, read, created_at)
  VALUES (
    test_user_id,
    'test',
    'Ancient Notification',
    'This is 31 days old',
    false,
    NOW() - INTERVAL '31 days'
  );
  
  RAISE NOTICE 'Test notifications created for user: %', test_user_id;
END $$;

-- ============================================
-- STEP 3: View Test Data
-- ============================================

SELECT 
  id,
  title,
  read,
  created_at,
  read_at,
  CASE 
    WHEN read = true AND read_at < NOW() - INTERVAL '24 hours' THEN '🗑️ Should be deleted (read > 24h)'
    WHEN read = false AND created_at < NOW() - INTERVAL '30 days' THEN '🗑️ Should be deleted (unread > 30d)'
    WHEN read = true THEN '✅ Keep (read < 24h)'
    ELSE '✅ Keep (unread < 30d)'
  END as cleanup_status
FROM notifications 
WHERE title LIKE '%Test%' OR title LIKE '%Ancient%'
ORDER BY created_at DESC;

-- ============================================
-- STEP 4: Test Manual Cleanup
-- ============================================

-- Run cleanup function
SELECT cleanup_old_notifications() as deleted_count;

-- View remaining test notifications
SELECT 
  id,
  title,
  read,
  created_at,
  read_at,
  CASE 
    WHEN read = true THEN 'Read'
    ELSE 'Unread'
  END as status
FROM notifications 
WHERE title LIKE '%Test%' OR title LIKE '%Ancient%'
ORDER BY created_at DESC;

-- Expected: Only "Fresh Test Notification" and "Recent Read Notification" should remain

-- ============================================
-- STEP 5: Test Trigger (Auto read_at)
-- ============================================

-- Insert unread notification
INSERT INTO notifications (user_id, type, title, message, read)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'test',
  'Trigger Test Notification',
  'Testing auto read_at',
  false
)
RETURNING id;

-- Mark it as read (trigger should set read_at automatically)
UPDATE notifications 
SET read = true 
WHERE title = 'Trigger Test Notification'
RETURNING id, read, read_at;

-- Verify read_at was set automatically
SELECT 
  id,
  title,
  read,
  read_at,
  read_at IS NOT NULL as read_at_set
FROM notifications 
WHERE title = 'Trigger Test Notification';

-- Expected: read_at should be set automatically

-- ============================================
-- STEP 6: Test Periodic Cleanup Trigger
-- ============================================

-- Create old notification
INSERT INTO notifications (user_id, type, title, message, read, read_at)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'test',
  'Periodic Cleanup Test',
  'Testing periodic cleanup',
  true,
  NOW() - INTERVAL '25 hours'
);

-- Count before
SELECT COUNT(*) as count_before 
FROM notifications 
WHERE title = 'Periodic Cleanup Test';

-- Insert 20 new notifications to trigger cleanup (5% probability × 20 = high chance)
DO $$
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      (SELECT id FROM users LIMIT 1),
      'test',
      'Spam Test ' || i,
      'Triggering periodic cleanup'
    );
  END LOOP;
END $$;

-- Count after (might be 0 if cleanup was triggered)
SELECT COUNT(*) as count_after 
FROM notifications 
WHERE title = 'Periodic Cleanup Test';

-- ============================================
-- STEP 7: Cleanup Test Data
-- ============================================

-- Remove all test notifications
DELETE FROM notifications 
WHERE title LIKE '%Test%' 
   OR title LIKE '%Ancient%'
   OR title LIKE '%Spam%';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_notifications
FROM notifications 
WHERE title LIKE '%Test%' 
   OR title LIKE '%Ancient%'
   OR title LIKE '%Spam%';

-- Expected: 0

-- ============================================
-- STEP 8: Production Statistics
-- ============================================

-- Current notification statistics
SELECT 
  read,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notifications 
GROUP BY read
ORDER BY read;

-- Notifications pending cleanup
SELECT 
  COUNT(*) as pending_cleanup,
  MIN(read_at) as oldest_read
FROM notifications 
WHERE read = true 
AND read_at < NOW() - INTERVAL '24 hours';

-- Very old unread notifications
SELECT 
  COUNT(*) as ancient_unread,
  MIN(created_at) as oldest_created
FROM notifications 
WHERE read = false 
AND created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- COMPLETE!
-- ============================================

SELECT 'All tests completed! Check results above.' as status;
