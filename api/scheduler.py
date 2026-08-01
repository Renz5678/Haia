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

def start_scheduler():
    """Initialize and start the APScheduler."""
    # Run at midnight every day
    scheduler.add_job(reset_broken_streaks, 'cron', hour=0, minute=0)
    scheduler.start()
    logger.info("APScheduler started.")
