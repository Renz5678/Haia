import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def reset_broken_streaks():
    """
    Cron job to reset broken streaks at midnight.
    If a user missed their habit yesterday, their current_streak drops to 0.
    """
    logger.info("Running daily streak reset job...")
    client = get_supabase_service_client()
    try:
        # We can use the REST API to update streaks that haven't been updated since yesterday
        # Actually, doing this in raw SQL via RPC is better, but Supabase python client doesn't 
        # allow arbitrary SQL. We'll fetch and update in chunks, or call an RPC.
        # Since we might not have an RPC for this, we can do it via REST:
        # UPDATE streaks SET current_streak = 0 WHERE last_activity_date < yesterday
        from datetime import datetime, timedelta
        
        yesterday = (datetime.utcnow() - timedelta(days=1)).date()
        
        # Reset streaks where last_activity_date < yesterday
        response = (
            client.schema("haia").table("streaks")
            .update({"current_streak": 0})
            .lt("last_activity_date", yesterday.isoformat())
            .execute()
        )
        logger.info(f"Successfully reset {len(response.data)} broken streaks.")
    except Exception as e:
        logger.error(f"Failed to reset broken streaks: {e}")

async def send_daily_reminders():
    """
    Send daily schedule reminders via Telegram.
    """
    logger.info("Running daily schedule reminders...")
    client = get_supabase_service_client()
    try:
        from integrations.service import _send_telegram_message
        from datetime import datetime
        import json
        
        # Get current day abbreviation (e.g., "Mon", "Tue")
        today_str = datetime.now().strftime("%a")
        
        # Find active Telegram integrations
        integrations = client.schema("haia").table("integrations").select("*").eq("service", "telegram").eq("is_active", True).execute().data
        
        for integration in integrations:
            user_id = integration["user_id"]
            chat_id = integration["metadata"].get("chat_id")
            if not chat_id:
                continue
                
            # Fetch user's courses
            courses = client.schema("haia").table("courses").select("*").eq("user_id", user_id).execute().data
            
            # Filter courses for today
            today_courses = [c for c in courses if today_str in c.get("days", [])]
            
            if not today_courses:
                message = f"Good morning! You have no classes scheduled for today ({today_str}). Enjoy your free day! 🎉"
            else:
                # Sort by start time
                today_courses.sort(key=lambda x: x["start_time"])
                
                lines = [f"Good morning! Here is your schedule for today ({today_str}):", ""]
                for c in today_courses:
                    # Format time (from HH:MM:SS to HH:MM AM/PM)
                    try:
                        start_time = datetime.strptime(c["start_time"], "%H:%M:%S").strftime("%I:%M %p")
                        end_time = datetime.strptime(c["end_time"], "%H:%M:%S").strftime("%I:%M %p")
                    except:
                        start_time = c["start_time"]
                        end_time = c["end_time"]
                        
                    lines.append(f"📚 *{c['code']}* ({c['modality']})")
                    lines.append(f"⏰ {start_time} - {end_time}")
                    if c.get("room"):
                        lines.append(f"📍 {c['room']}")
                    lines.append("")
                    
                lines.append("Have a great day, boss! 🚀")
                message = "\n".join(lines)
                
            _send_telegram_message(chat_id, message)
            
    except Exception as e:
        logger.error(f"Failed to send daily reminders: {e}")

def start_scheduler():
    """Initialize and start the APScheduler."""
    # Run at midnight every day
    scheduler.add_job(reset_broken_streaks, 'cron', hour=0, minute=0)
    # Run at 7:00 AM every day
    scheduler.add_job(send_daily_reminders, 'cron', hour=7, minute=0)
    scheduler.start()
    logger.info("APScheduler started.")
