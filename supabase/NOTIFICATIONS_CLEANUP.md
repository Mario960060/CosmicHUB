# Notifications Auto-Cleanup Setup

## Overview
This system automatically removes read notifications after 24 hours to keep the UI clean and the database efficient.

## How It Works

### 1. Automatic Cleanup (Trigger-Based)
The migration `021_notifications_auto_cleanup.sql` sets up:

- **Trigger on UPDATE**: Sets `read_at` timestamp when notification is marked as read
- **Periodic Cleanup**: Runs cleanup with 5% probability on every new notification insert
- **Manual Cleanup**: Function `cleanup_old_notifications()` can be called manually

### 2. What Gets Deleted

- **Read notifications**: Deleted after 24 hours from `read_at` timestamp
- **Very old unread notifications**: Deleted after 30 days from `created_at` (prevents database bloat)

### 3. UI Behavior

#### Notification Dropdown (Header)
- Shows **only unread** notifications
- After clicking a notification:
  - Notification is marked as read
  - It **disappears from the dropdown immediately**
  - It's scheduled for deletion after 24 hours

#### Notifications Page (`/notifications`)
- Shows both read and unread notifications
- Can filter by "All" or "Unread"
- Read notifications appear with reduced opacity
- Manual delete button available for each notification

## Optional: Supabase Cron Job (Recommended)

For more reliable cleanup, set up a cron job in Supabase Dashboard:

### Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs** (if available)
3. Create a new cron job:
   - **Name**: `cleanup-old-notifications`
   - **Schedule**: `0 * * * *` (runs every hour)
   - **SQL**: `SELECT cleanup_old_notifications();`

### Using SQL (if pg_cron is available)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 * * * *',
  'SELECT cleanup_old_notifications();'
);
```

### Manual Cleanup

You can manually trigger cleanup anytime:

```sql
SELECT cleanup_old_notifications();
```

## Testing

To test the cleanup:

```sql
-- 1. Create test notifications
INSERT INTO notifications (user_id, type, title, message, read, read_at)
VALUES 
  (
    (SELECT id FROM users LIMIT 1),
    'test',
    'Old Test Notification',
    'This should be deleted',
    true,
    NOW() - INTERVAL '25 hours'
  );

-- 2. Run cleanup
SELECT cleanup_old_notifications();

-- 3. Verify deletion
SELECT COUNT(*) FROM notifications WHERE title = 'Old Test Notification';
-- Should return 0
```

## Monitoring

Check how many notifications are being cleaned up:

```sql
-- See recent read notifications that will be deleted
SELECT 
  COUNT(*) as pending_cleanup,
  MIN(read_at) as oldest_read
FROM notifications 
WHERE read = true 
AND read_at < NOW() - INTERVAL '24 hours';

-- Total notifications by status
SELECT 
  read,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM notifications 
GROUP BY read;
```

## Troubleshooting

### Notifications not being deleted?

1. Check if trigger is active:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%notification%';
```

2. Manually run cleanup:
```sql
SELECT cleanup_old_notifications();
```

3. Check for errors in Supabase logs

### Performance issues?

The periodic cleanup trigger runs with 5% probability. If you have high notification volume:

1. Reduce probability in `trigger_periodic_cleanup()`:
```sql
IF random() < 0.01 THEN  -- Changed from 0.05 to 0.01 (1%)
```

2. Or disable periodic trigger and rely only on cron job

## Architecture Notes

- Read notifications are kept for 24 hours to allow users to review them on the full notifications page
- Dropdown only shows unread to keep it focused and actionable
- Unread notifications older than 30 days are deleted to prevent infinite growth
- The system uses triggers instead of cron for better Supabase compatibility
