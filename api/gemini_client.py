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
from typing import Any, Type, TypeVar

import google.generativeai as genai
from pydantic import BaseModel, ValidationError

from core.config import get_settings

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


def _get_model(model_name: str = "gemini-flash-latest") -> genai.GenerativeModel:
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(model_name)


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
    schema: Type[T],
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

    model = _get_model()
    try:
        response = model.generate_content(full_prompt)
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


async def parse_image_to_schema(
    image_bytes: bytes,
    mime_type: str,
    prompt_name: str,
    schema: Type[T],
    context: dict[str, Any] | None = None,
) -> T:
    """
    Image (bytes) → structured schema parser.
    Used for: photo-to-task, COR/schedule photo parsing.
    """
    prompt_template = _load_prompt(prompt_name)
    ctx_str = json.dumps(context or {}, default=str)
    full_prompt = (
        f"{prompt_template}\n\n"
        f"Context: {ctx_str}\n\n"
        "Respond with valid JSON only. No prose, no markdown fences."
    )

    model = _get_model("gemini-flash-latest")
    image_part = {"mime_type": mime_type, "data": image_bytes}

    try:
        response = model.generate_content([full_prompt, image_part])
        raw_json = response.text
    except Exception as e:
        logger.error("Gemini vision API call failed: %s", e)
        raise

    data = _parse_json_response(raw_json)
    return schema(**data)


def get_embedding(text: str, model_name: str = "models/text-embedding-004") -> list[float]:
    """
    Generate a text embedding for semantic goal matching.
    Returns a 768-dimensional float vector (matching the DB column).
    """
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(model=model_name, content=text)
    return result["embedding"]
