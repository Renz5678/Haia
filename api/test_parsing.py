from unittest.mock import patch

from parsing.schemas import IntentClassification, ParseTextRequest
from parsing.service import parse_text
from tasks.schemas import ParsedTask


def test_parse_text_task_routing():
    # Setup the request
    req = ParseTextRequest(raw_input="buy milk tomorrow")
    user_id = "test-user-id"

    # Mock responses for Gemini
    intent_mock = IntentClassification(intent="task")
    parsed_task_mock = ParsedTask(
        title="buy milk",
        task_type="todo",
        priority="medium",
        due_date="2026-07-28T00:00:00Z",
        subject_hint=None,
        description=None
    )

    # We need to mock parse_text_to_schema to return intent first, then the parsed task
    def mock_parse_text_to_schema(raw_input, prompt_name, schema, context):
        if prompt_name == "classify_intent":
            return intent_mock
        elif prompt_name == "parse_task":
            return parsed_task_mock
        raise ValueError("Unexpected prompt")

    with patch("parsing.service.parse_text_to_schema", side_effect=mock_parse_text_to_schema):
        with patch("tasks.service.create_task") as mock_create_task:
            # Setup mock for DB insert return
            mock_create_task.return_value = {"id": "new-task-id", "title": "buy milk"}
            
            # Execute
            res = parse_text(user_id, req)
            
            # Assertions
            assert res.intent == "task"
            assert res.parsed_type == "task"
            assert res.saved_id == "new-task-id"
            mock_create_task.assert_called_once()
            
            # Verify correct arguments were passed to create_task
            args, kwargs = mock_create_task.call_args
            assert args[0] == user_id
            task_data = args[1]
            assert task_data.title == "buy milk"
            assert task_data.task_type == "todo"

def test_parse_text_conversational_routing():
    req = ParseTextRequest(raw_input="hello how are you")
    user_id = "test-user-id"
    intent_mock = IntentClassification(intent="conversational")

    with patch("parsing.service.parse_text_to_schema", return_value=intent_mock):
        res = parse_text(user_id, req)
        
        assert res.intent == "conversational"
        assert res.parsed_type == "none"
        assert res.data["raw"] == "hello how are you"
