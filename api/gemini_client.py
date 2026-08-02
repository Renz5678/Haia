"""
Gemini API client — single wrapper for all AI calls in Haia.

Every parsing task (text, photo, voice, syllabus, schedule/COR) goes through
this module. Prompts are loaded from versioned files in api/prompts/ so they
are diffable like code (per CONTEXT.md §9.7).

All outputs are validated against Pydantic schemas before touching the database.
Raw model output is never trusted directly.
"""

import json
import logging
from pathlib import Path
from typing import Any, TypeVar

from core.config import get_settings
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Prompt files live here — one file per parsing task
PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    """Load a prompt template from api/prompts/<name>.txt"""
    path = PROMPTS_DIR / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def _parse_json_response(raw: str) -> dict:
    """
    Extract JSON from a Gemini response that may include markdown code fences.
    Raises ValueError if no valid JSON found.
    """
    text = raw.strip()
    # Strip ```json ... ``` fences if present
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned non-JSON output: {e}\nRaw: {raw[:500]}")


def parse_text_to_schema(
    raw_input: str,
    prompt_name: str,
    schema: type[T],
    context: dict[str, Any] | None = None,
) -> T:
    """
    Generic text → structured schema parser.

    Loads the named prompt, injects raw_input (and optional context),
    calls Gemini, validates the JSON output against the Pydantic schema.

    On validation failure: logs the error and raises so the caller can
    save a fallback unparsed item (per CONTEXT.md §9.7).
    """
    prompt_template = _load_prompt(prompt_name)
    ctx_str = json.dumps(context or {}, default=str)
    full_prompt = (
        f"{prompt_template}\n\n"
        f"Context: {ctx_str}\n\n"
        f"Input:\n{raw_input}\n\n"
        "Respond with valid JSON only. No prose, no markdown fences."
    )

    client = _get_client()
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=full_prompt,
        )
        raw_json = response.text
    except Exception as e:
        logger.error("Gemini API call failed: %s", e)
        raise

    try:
        data = _parse_json_response(raw_json)
    except ValueError as e:
        logger.error("Failed to parse Gemini JSON output: %s", e)
        raise

    try:
        return schema(**data)
    except ValidationError as e:
        logger.error("Gemini output failed schema validation: %s", e)
        raise


async def parse_file_to_schema(
    file_bytes: bytes,
    mime_type: str,
    prompt_name: str,
    schema: type[T],
    context: dict[str, Any] | None = None,
) -> T:
    """
    File (bytes) → structured schema parser.
    Supports images, audio, video, and PDFs natively via Gemini 2.5 Flash.
    """
    prompt_template = _load_prompt(prompt_name)
    ctx_str = json.dumps(context or {}, default=str)
    full_prompt = (
        f"{prompt_template}\n\n"
        f"Context: {ctx_str}\n\n"
        "Respond with valid JSON only. No prose, no markdown fences."
    )

    client = _get_client()
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                full_prompt,
            ]
        )
        raw_json = response.text
    except Exception as e:
        logger.error("Gemini vision API call failed: %s", e)
        raise

    data = _parse_json_response(raw_json)
    return schema(**data)

# Alias for backward compatibility with courses router
parse_image_to_schema = parse_file_to_schema


def get_embedding(text: str, model_name: str = "text-embedding-004") -> list[float]:
    """
    Generate a text embedding for semantic goal matching.
    Returns a 768-dimensional float vector (matching the DB column).
    """
    client = _get_client()
    result = client.models.embed_content(
        model=model_name,
        contents=text
    )
    return result.embeddings[0].values
