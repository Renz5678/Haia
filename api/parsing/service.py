"""
Central parsing pipeline.
All input types (text, photo, voice, email, syllabus) pass through here.
Phase 2 will implement the full text parsing; other types follow in Phase 4.
"""
import logging
from datetime import datetime, time

from gemini_client import parse_text_to_schema
from goals.schemas import GoalCreate
from habits.schemas import HabitCreate
from parsing.schemas import (
    IntentClassification,
    ParsedGoal,
    ParsedHabit,
    ParseTextRequest,
    ParseTextResponse,
)
from tasks.schemas import ParsedTask, TaskCreate

logger = logging.getLogger(__name__)

def parse_text(user_id: str, request: ParseTextRequest) -> ParseTextResponse:
    try:
        intent_data = parse_text_to_schema(
            raw_input=request.raw_input,
            prompt_name="classify_intent",
            schema=IntentClassification,
            context=request.context
        )
        intent = intent_data.intent
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return ParseTextResponse(intent="unknown", parsed_type="unknown", confidence="low", data={"raw": request.raw_input})

    if intent == "conversational":
        return ParseTextResponse(intent=intent, parsed_type="none", confidence="high", data={"raw": request.raw_input})

    try:
        if intent == "task":
            parsed = parse_text_to_schema(request.raw_input, "parse_task", ParsedTask, request.context)
            # Create task
            from tasks.service import create_task
            due_date = datetime.fromisoformat(parsed.due_date.replace("Z", "+00:00")) if parsed.due_date else None
            task_data = TaskCreate(
                title=parsed.title,
                description=parsed.description,
                task_type=parsed.task_type,
                priority=parsed.priority,
                due_date=due_date,
                source=request.channel,
                raw_input=request.raw_input
            )
            saved = create_task(user_id, task_data)
            return ParseTextResponse(intent=intent, parsed_type="task", confidence="high", data=parsed.model_dump(), saved_id=str(saved["id"]))

        elif intent == "habit":
            parsed = parse_text_to_schema(request.raw_input, "parse_habit", ParsedHabit, request.context)
            from habits.service import create_habit
            target_time = time.fromisoformat(parsed.target_time) if parsed.target_time else None
            habit_data = HabitCreate(
                name=parsed.name,
                description=parsed.description,
                frequency=parsed.frequency,
                custom_days=parsed.custom_days,
                target_time=target_time
            )
            saved = create_habit(user_id, habit_data)
            return ParseTextResponse(intent=intent, parsed_type="habit", confidence="high", data=parsed.model_dump(), saved_id=str(saved["id"]))

        elif intent == "goal":
            parsed = parse_text_to_schema(request.raw_input, "parse_goal", ParsedGoal, request.context)
            from goals.service import create_goal
            target_date = datetime.fromisoformat(parsed.target_date.replace("Z", "+00:00")).date() if parsed.target_date else None
            goal_data = GoalCreate(
                title=parsed.title,
                description=parsed.description,
                area=parsed.area,
                target_date=target_date
            )
            saved = create_goal(user_id, goal_data)
            return ParseTextResponse(intent=intent, parsed_type="goal", confidence="high", data=parsed.model_dump(), saved_id=str(saved["id"]))

    except Exception as e:
        logger.error(f"Parsing failed for intent {intent}: {e}")
        return ParseTextResponse(intent=intent, parsed_type="unknown", confidence="low", data={"raw": request.raw_input})

    return ParseTextResponse(intent="unknown", parsed_type="unknown", confidence="low", data={"raw": request.raw_input})

