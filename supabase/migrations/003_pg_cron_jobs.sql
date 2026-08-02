-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create pg_cron job to reset broken streaks at midnight
SELECT cron.schedule(
    'reset-streaks-midnight',
    '0 0 * * *',
    $$
    UPDATE haia.streaks
    SET current_streak = 0
    WHERE last_activity_date < CURRENT_DATE - INTERVAL '1 day';
    $$
);

-- Create a function to send daily schedule reminders via Telegram
CREATE OR REPLACE FUNCTION haia.send_daily_telegram_reminders()
RETURNS void AS $$
DECLARE
    r RECORD;
    c RECORD;
    msg TEXT;
    day_abbr TEXT;
    bot_token TEXT;
BEGIN
    day_abbr := to_char(CURRENT_DATE, 'Dy'); -- e.g., 'Mon'
    
    -- The bot token should be stored in vault or as a current_setting.
    -- Assuming we set it using ALTER DATABASE ... SET app.settings.telegram_bot_token = '...'
    BEGIN
        bot_token := current_setting('app.settings.telegram_bot_token', true);
    EXCEPTION WHEN OTHERS THEN
        bot_token := NULL;
    END;

    IF bot_token IS NULL OR bot_token = '' THEN
        RETURN;
    END IF;

    FOR r IN 
        SELECT i.user_id, i.metadata->>'chat_id' AS chat_id
        FROM haia.integrations i
        WHERE i.service = 'telegram' AND i.is_active = true
    LOOP
        msg := 'Good morning! Here is your schedule for today (' || day_abbr || '):%0A%0A';
        
        -- Check if there are courses for today
        IF NOT EXISTS (
            SELECT 1 FROM haia.courses c 
            WHERE c.user_id = r.user_id AND c.days @> ARRAY[day_abbr]
        ) THEN
            msg := 'Good morning! You have no classes scheduled for today (' || day_abbr || '). Enjoy your free day! 🎉';
        ELSE
            FOR c IN 
                SELECT code, start_time, end_time, room, modality
                FROM haia.courses
                WHERE user_id = r.user_id AND c.days @> ARRAY[day_abbr]
                ORDER BY start_time
            LOOP
                msg := msg || '📚 *' || c.code || '* (' || c.modality || ')%0A';
                msg := msg || '⏰ ' || to_char(c.start_time, 'HH12:MI AM') || ' - ' || to_char(c.end_time, 'HH12:MI AM') || '%0A';
                IF c.room IS NOT NULL THEN
                    msg := msg || '📍 ' || c.room || '%0A';
                END IF;
                msg := msg || '%0A';
            END LOOP;
            msg := msg || 'Have a great day, boss! 🚀';
        END IF;

        -- Send message using pg_net
        PERFORM net.http_post(
            url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := jsonb_build_object('chat_id', r.chat_id, 'text', msg, 'parse_mode', 'Markdown')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create pg_cron job to send daily reminders at 7:00 AM
SELECT cron.schedule(
    'send-daily-reminders-7am',
    '0 7 * * *',
    $$
    SELECT haia.send_daily_telegram_reminders();
    $$
);
