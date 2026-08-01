from datetime import time
from unittest.mock import MagicMock, patch

from courses.schemas import CourseCreate
from courses.service import create_course
from goals.schemas import GoalCreate
from goals.service import create_goal, get_goal_progress
from habits.schemas import HabitCreate
from habits.service import create_habit
from subjects.schemas import SubjectCreate
from subjects.service import create_subject
from tasks.schemas import TaskCreate
from tasks.service import create_task


def test_tasks_service():
    with patch("tasks.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        mock_db.schema().table().insert().execute.return_value.data = [{"id": "t1", "title": "Test Task"}]
        
        task_data = TaskCreate(title="Test Task", task_type="todo", priority="medium")
        res = create_task("u1", task_data)
        assert res["id"] == "t1"
        assert res["title"] == "Test Task"

def test_habits_service():
    with patch("habits.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        mock_db.schema().table().insert().execute.return_value.data = [{"id": "h1"}]
        
        habit_data = HabitCreate(name="Workout", frequency="daily")
        res = create_habit("u1", habit_data)
        assert res["id"] == "h1"

def test_goals_service():
    with patch("goals.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        mock_db.schema().table().insert().execute.return_value.data = [{"id": "g1"}]
        
        goal_data = GoalCreate(title="Pass Exam")
        res = create_goal("u1", goal_data)
        assert res["id"] == "g1"

def test_goal_progress():
    with patch("goals.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        
        # Mock task_goals lookup
        mock_db.schema().table().select().eq().execute.return_value.data = [
            {"task_id": "t1"}, {"task_id": "t2"}
        ]
        
        # Mock tasks lookup
        mock_db.schema().table().select().in_().eq().execute.return_value.data = [
            {"status": "completed"}, {"status": "pending"}
        ]
        
        progress = get_goal_progress("u1", "g1")
        assert progress["progress_pct"] == 50.0

def test_subjects_service():
    with patch("subjects.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        mock_db.schema().table().insert().execute.return_value.data = [{"id": "s1"}]
        
        subject_data = SubjectCreate(name="Math")
        res = create_subject("u1", subject_data)
        assert res["id"] == "s1"

def test_courses_service():
    with patch("courses.service.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        mock_db.schema().table().insert().execute.return_value.data = [{"id": "c1"}]
        
        course_data = CourseCreate(
            code="CS101", modality="in_person", days=["Mon", "Wed"], 
            start_time=time(9, 0), end_time=time(10, 30)
        )
        res = create_course("u1", course_data)
        assert res["id"] == "c1"
