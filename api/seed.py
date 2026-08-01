import os
import sys
import uuid
from datetime import date, datetime, timedelta
from random import choice, randint

# Add api path to sys.path so we can import core
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.supabase import get_supabase_service_client


def run_seed():
    client = get_supabase_service_client()
    
    email = "test@example.com"
    password = "password123"
    
    print(f"Ensuring user {email} exists...")
    
    # Try to sign up or get user
    try:
        user_res = client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user_id = user_res.user.id
        print("Created new user.")
    except Exception as e:
        # If user exists, find them
        users = client.auth.admin.list_users()
        user = next((u for u in users if u.email == email), None)
        if user:
            user_id = user.id
            print("Found existing user.")
        else:
            print("Error finding or creating user:", e)
            return

    # Wait a sec to ensure the trigger created the users row
    import time
    time.sleep(2)
    
    # Clear existing data for this user to be safe
    print("Clearing existing user data...")
    client.schema("haia").table("tasks").delete().eq("user_id", user_id).execute()
    client.schema("haia").table("habits").delete().eq("user_id", user_id).execute()
    client.schema("haia").table("goals").delete().eq("user_id", user_id).execute()
    client.schema("haia").table("subjects").delete().eq("user_id", user_id).execute()
    client.schema("haia").table("streaks").delete().eq("user_id", user_id).execute()
    client.schema("haia").table("xp_events").delete().eq("user_id", user_id).execute()
    
    print("Creating subjects...")
    subjects = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Computer Science", "area": "school", "color": "#FF5733"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Calculus III", "area": "school", "color": "#33C1FF"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Fitness", "area": "personal", "color": "#33FF57"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Career", "area": "personal", "color": "#FF33F5"}
    ]
    client.schema("haia").table("subjects").insert(subjects).execute()
    
    cs_id = subjects[0]["id"]
    calc_id = subjects[1]["id"]
    fit_id = subjects[2]["id"]
    car_id = subjects[3]["id"]

    print("Creating goals...")
    goals = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": cs_id, "title": "A in Computer Science", "goal_type": "grade", "target_value": 95, "current_value": 91},
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": fit_id, "title": "Run a Marathon", "goal_type": "custom", "target_value": 100, "current_value": 30, "target_date": (date.today() + timedelta(days=60)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": car_id, "title": "Land 3 Internships", "goal_type": "custom", "target_value": 3, "current_value": 1}
    ]
    client.schema("haia").table("goals").insert(goals).execute()

    print("Creating habits...")
    habits = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": calc_id, "name": "Daily Math Practice", "frequency": "daily", "xp_value": 10},
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": fit_id, "name": "Morning Run", "frequency": "daily", "xp_value": 15},
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": car_id, "name": "LeetCode Medium", "frequency": "daily", "xp_value": 20},
        {"id": str(uuid.uuid4()), "user_id": user_id, "subject_id": cs_id, "name": "Read Tech Blog", "frequency": "weekdays", "xp_value": 5},
    ]
    client.schema("haia").table("habits").insert(habits).execute()
    
    # Init streaks for habits
    for h in habits:
        client.schema("haia").table("streaks").insert({
            "user_id": user_id,
            "habit_id": h["id"],
            "streak_type": "habit",
            "current_streak": randint(1, 15),
            "longest_streak": randint(15, 30),
            "last_activity_date": (date.today() - timedelta(days=1)).isoformat()
        }).execute()

    print("Creating 20+ tasks across categories...")
    tasks = []
    task_types = ['task', 'deadline', 'assignment', 'exam', 'project']
    statuses = ['pending', 'in_progress', 'completed']
    priorities = ['low', 'medium', 'high', 'critical']
    
    for i in range(25):
        sub = choice(subjects)
        t_type = choice(task_types)
        status = choice(statuses)
        due = (datetime.now() + timedelta(days=randint(-5, 15))).isoformat()
        completed_at = datetime.now().isoformat() if status == 'completed' else None
        
        tasks.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "subject_id": sub["id"],
            "title": f"Sample {t_type.capitalize()} {i+1}",
            "description": f"This is a generated {t_type} for {sub['name']}.",
            "task_type": t_type,
            "status": status,
            "priority": choice(priorities),
            "due_date": due,
            "completed_at": completed_at,
            "xp_value": randint(10, 50)
        })
    client.schema("haia").table("tasks").insert(tasks).execute()

    print("Seeding XP and levels...")
    # Add a big chunk of XP
    client.schema("haia").table("xp_events").insert({
        "user_id": user_id,
        "xp_amount": 1500,
        "source_type": "task",
        "reason": "Seed Data Bootstrap"
    }).execute()
    
    # Update user level manually (since trigger handles XP, but let's be sure)
    client.schema("haia").table("users").update({"current_level": 5, "total_xp": 1500}).eq("id", user_id).execute()

    print("\n---------------------------------------------------")
    print("Seed Complete!")
    print(f"Test Email: {email}")
    print(f"Test Password: {password}")
    print("---------------------------------------------------")

if __name__ == "__main__":
    run_seed()
