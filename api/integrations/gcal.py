import logging
from datetime import datetime, timedelta

from core.supabase import get_supabase_service_client
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

def get_gcal_service(user_id: str):
    client = get_supabase_service_client()
    integration = client.schema("haia").table("integrations").select("*").eq("user_id", user_id).eq("service", "google_calendar").eq("is_active", True).execute().data
    if not integration:
        return None
        
    metadata = integration[0].get("metadata", {})
    token = metadata.get("token")
    refresh_token = metadata.get("refresh_token")
    client_id = metadata.get("client_id")
    client_secret = metadata.get("client_secret")
    
    if not token or not client_id or not client_secret:
        return None
        
    creds = Credentials(
        token=token,
        refresh_token=refresh_token,
        token_uri=metadata.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=client_id,
        client_secret=client_secret,
        scopes=metadata.get("scopes")
    )
    
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            # Update DB with new token
            metadata["token"] = creds.token
            client.schema("haia").table("integrations").update({"metadata": metadata}).eq("id", integration[0]["id"]).execute()
        except Exception as e:
            logger.error(f"Failed to refresh Google token for user {user_id}: {e}")
            return None
            
    service = build('calendar', 'v3', credentials=creds)
    return service


def sync_task_to_gcal(user_id: str, task: dict):
    if not task.get("due_date"):
        return
        
    service = get_gcal_service(user_id)
    if not service:
        return
        
    client = get_supabase_service_client()
    gcal_event_id = task.get("calendar_event_id")
    
    try:
        due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
        # Default duration 1 hour
        end_date = due_date + timedelta(hours=1)
        
        event = {
            'summary': task.get("title", "Haia Task"),
            'description': f"{task.get('description', '')}\n\n[Managed by Haia]",
            'start': {
                'dateTime': due_date.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_date.isoformat(),
                'timeZone': 'UTC',
            },
        }
        
        if gcal_event_id:
            try:
                service.events().update(calendarId='primary', eventId=gcal_event_id, body=event).execute()
            except Exception as e:
                logger.warning(f"Could not update event {gcal_event_id}, recreating: {e}")
                created_event = service.events().insert(calendarId='primary', body=event).execute()
                client.schema("haia").table("tasks").update({"calendar_event_id": created_event.get('id')}).eq("id", task["id"]).execute()
        else:
            created_event = service.events().insert(calendarId='primary', body=event).execute()
            client.schema("haia").table("tasks").update({"calendar_event_id": created_event.get('id')}).eq("id", task["id"]).execute()
            
    except Exception as e:
        logger.error(f"Failed to sync task {task['id']} to GCal for user {user_id}: {e}")


def delete_task_from_gcal(user_id: str, gcal_event_id: str):
    if not gcal_event_id:
        return
        
    service = get_gcal_service(user_id)
    if not service:
        return
        
    try:
        service.events().delete(calendarId='primary', eventId=gcal_event_id).execute()
    except Exception as e:
        logger.error(f"Failed to delete task from GCal for user {user_id}: {e}")


def sync_course_to_gcal(user_id: str, course: dict):
    service = get_gcal_service(user_id)
    if not service:
        return
        
    client = get_supabase_service_client()
    gcal_event_id = course.get("calendar_event_id")
    created = None
    
    try:
        # ------------------------------------------------------------------
        # 1. Resolve user timezone (default Asia/Manila per schema)
        # ------------------------------------------------------------------
        user_row = client.schema("haia").table("users").select("timezone").eq("id", user_id).single().execute().data
        user_tz = (user_row.get("timezone") or "Asia/Manila") if user_row else "Asia/Manila"

        # ------------------------------------------------------------------
        # 2. Convert days to RRULE format
        # ------------------------------------------------------------------
        day_map = {"Mon": "MO", "Tue": "TU", "Wed": "WE", "Thu": "TH", "Fri": "FR", "Sat": "SA", "Sun": "SU"}
        # Python weekday(): Mon=0 … Sun=6
        py_weekday_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
        norm_map = {
            "m": "Mon", "mo": "Mon", "mon": "Mon", "monday": "Mon",
            "t": "Tue", "tu": "Tue", "tue": "Tue", "tuesday": "Tue",
            "w": "Wed", "we": "Wed", "wed": "Wed", "wednesday": "Wed",
            "th": "Thu", "thu": "Thu", "thursday": "Thu",
            "f": "Fri", "fr": "Fri", "fri": "Fri", "friday": "Fri",
            "s": "Sat", "sa": "Sat", "sat": "Sat", "saturday": "Sat",
            "su": "Sun", "sun": "Sun", "sunday": "Sun",
        }
        
        days = course.get("days", [])
        norm_days = [norm_map.get(str(d).lower().strip(), "Mon") for d in days]
        byday = ",".join([day_map.get(d, "MO") for d in norm_days])

        # ------------------------------------------------------------------
        # 3. Compute anchor date = next upcoming occurrence of the course's
        #    first scheduled weekday, in the user's local timezone.
        # ------------------------------------------------------------------
        import pytz

        tz = pytz.timezone(user_tz)
        today = datetime.now(tz).date()

        if norm_days:
            first_day_name = norm_days[0]
            target_weekday = py_weekday_map.get(first_day_name, 0)
            # days_ahead=0 means today is already the right weekday — use it
            days_ahead = (target_weekday - today.weekday()) % 7
            anchor_date = today + timedelta(days=days_ahead)
        else:
            anchor_date = today

        # ------------------------------------------------------------------
        # 4. Build start/end datetimes in the user's local timezone
        # ------------------------------------------------------------------
        start_time_str = course.get("start_time", "08:00:00")
        end_time_str = course.get("end_time", "09:00:00")

        # Normalise to HH:MM:SS (DB stores as time, may include microseconds)
        start_time_str = str(start_time_str)[:8].ljust(8, "0")
        end_time_str   = str(end_time_str)[:8].ljust(8, "0")

        start_dt_naive = datetime.strptime(f"{anchor_date} {start_time_str}", "%Y-%m-%d %H:%M:%S")
        end_dt_naive   = datetime.strptime(f"{anchor_date} {end_time_str}",   "%Y-%m-%d %H:%M:%S")

        # Localise — pytz.localize is correct for wall-clock class times
        start_dt = tz.localize(start_dt_naive)
        end_dt   = tz.localize(end_dt_naive)

        # ------------------------------------------------------------------
        # 5. Build the Google Calendar event body
        # ------------------------------------------------------------------
        event = {
            'summary': f"{course.get('code')} - {course.get('name') or 'Class'}",
            'description': (
                f"Instructor: {course.get('instructor') or 'TBD'}\n"
                f"Room: {course.get('room') or 'TBD'}\n"
                f"Modality: {course.get('modality')}\n\n"
                "[Managed by Haia]"
            ),
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': user_tz,
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': user_tz,
            },
            'recurrence': [
                f'RRULE:FREQ=WEEKLY;BYDAY={byday}'
            ] if byday else [],
        }
        
        # Add Meet link for online/hybrid
        if course.get("modality") in ["online", "hybrid"]:
            event['conferenceData'] = {
                'createRequest': {
                    'requestId': f"haia-course-{course['id']}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        
        if gcal_event_id:
            try:
                created = service.events().update(calendarId='primary', eventId=gcal_event_id, body=event, conferenceDataVersion=1).execute()
            except Exception as e:
                logger.warning(f"Could not update event {gcal_event_id}, recreating: {e}")
                created = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
                gcal_event_id = created.get('id')
        else:
            created = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
            gcal_event_id = created.get('id')
            
        update_payload = {"calendar_event_id": gcal_event_id}
        
        # Save meet link if generated
        if created and 'conferenceData' in created and 'entryPoints' in created['conferenceData']:
            for entry in created['conferenceData']['entryPoints']:
                if entry['entryPointType'] == 'video':
                    update_payload["meet_link"] = entry['uri']
                    break
                    
        client.schema("haia").table("courses").update(update_payload).eq("id", course["id"]).execute()
            
    except Exception as e:
        logger.error(f"Failed to sync course {course['id']} to GCal for user {user_id}: {e}")

def back_sync_gcal(user_id: str):
    """Sync all existing courses and tasks with a due date to Google Calendar for a newly connected account."""
    client = get_supabase_service_client()
    
    # Sync Courses
    courses = client.schema("haia").table("courses").select("*").eq("user_id", user_id).execute().data
    for course in courses:
        sync_course_to_gcal(user_id, course)
        
    # Sync Tasks (only pending ones with a due date)
    tasks = client.schema("haia").table("tasks").select("*").eq("user_id", user_id).eq("status", "pending").not_.is_("due_date", "null").execute().data
    for task in tasks:
        sync_task_to_gcal(user_id, task)

