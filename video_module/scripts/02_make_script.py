"""
Bước 2: Sinh kịch bản video scenes.json từ bản tin + facts.
Gọi claude-sonnet-4-6, temperature thấp, bắt buộc JSON thuần.

Input:  input/today_news.md + data/extracted_facts.json
Output: data/scenes.json
"""

import re
import json
import sys
import logging
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

INPUT_NEWS = ROOT / "input" / "today_news.md"
INPUT_FACTS = ROOT / "data" / "extracted_facts.json"
OUTPUT_SCENES = ROOT / "data" / "scenes.json"
PROMPT_TEMPLATE = ROOT / "prompts" / "make_script.md"

LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-6")
MAX_RETRIES = 2
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def _strip_code_block(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def build_prompt(facts: dict, news_text: str) -> str:
    template = PROMPT_TEMPLATE.read_text(encoding="utf-8")
    return (
        template
        .replace("{{EXTRACTED_FACTS_JSON}}", json.dumps(facts, ensure_ascii=False, indent=2))
        .replace("{{NEWS_TEXT}}", news_text)
    )


def call_llm(prompt: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("Thiếu ANTHROPIC_API_KEY trong .env")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    for attempt in range(1, MAX_RETRIES + 2):
        log.info(f"Gọi LLM lần {attempt} (model={LLM_MODEL})")
        message = client.messages.create(
            model=LLM_MODEL,
            max_tokens=4096,
            temperature=LLM_TEMPERATURE,
            system=(
                "Bạn là biên tập viên video bản tin chính luận. "
                "Trả về JSON thuần, không có markdown code block, không có text nào khác ngoài JSON."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _strip_code_block(message.content[0].text)
        try:
            result = json.loads(raw)
            log.info(f"Parse JSON thành công ({len(raw)} ký tự)")
            return result
        except json.JSONDecodeError as e:
            log.warning(f"Parse JSON lỗi lần {attempt}: {e}")
            log.warning(f"Raw output (500 ký tự đầu): {raw[:500]}")
            if attempt > MAX_RETRIES:
                log.error("Hết retry — không parse được JSON.")
                raise

    raise RuntimeError("Không parse được JSON sau tất cả retry")


def run(
    input_news: Path = INPUT_NEWS,
    input_facts: Path = INPUT_FACTS,
    output: Path = OUTPUT_SCENES,
) -> dict:
    for f in [input_news, input_facts]:
        if not f.exists():
            log.error(f"Thiếu file: {f}")
            log.error("Chạy 01_extract_facts.py trước khi chạy script này.")
            sys.exit(1)

    news_text = input_news.read_text(encoding="utf-8")
    facts = json.loads(input_facts.read_text(encoding="utf-8"))

    prompt = build_prompt(facts, news_text)
    log.info(f"Prompt length: {len(prompt)} ký tự")

    scenes = call_llm(prompt)

    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(scenes, ensure_ascii=False, indent=2), encoding="utf-8")
    n = len(scenes.get("scenes", []))
    dur = scenes.get("duration_seconds", "?")
    log.info(f"→ {output.name}  ({n} scenes, {dur}s)")
    return scenes


if __name__ == "__main__":
    run()
