"""
Unit tests cho 00_fetch_input.py.
Không gọi GAS thật — mock requests.get.
"""

import importlib
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

fetch = importlib.import_module("scripts.00_fetch_input")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_gas_ok(markdown="# tin tức", count=3, date="Thứ Hai, ngày 26 tháng 5 năm 2026"):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "success": True,
        "data": {"markdown": markdown, "article_count": count, "date": date},
    }
    return resp


def _mock_gas_error(description="GAS fail"):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"success": False, "error": description}
    return resp


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_fetch_returns_markdown():
    with patch("requests.get", return_value=_mock_gas_ok("# test")), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"):
        result = fetch.fetch_news_markdown()
    assert result == "# test"


def test_fetch_exits_if_no_url():
    with patch.object(fetch, "GAS_URL", ""), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_if_no_token():
    with patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", ""), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_on_gas_error():
    with patch("requests.get", return_value=_mock_gas_error("không có bản tin")), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_on_empty_markdown():
    with patch("requests.get", return_value=_mock_gas_ok(markdown="")), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_run_writes_file(tmp_path):
    md_content = "🛡️ BẢN TIN\nHôm nay có tin tức."
    with patch("requests.get", return_value=_mock_gas_ok(md_content)), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"):
        out = fetch.run(tmp_path / "today_news.md")
    assert out.exists()
    assert out.read_text(encoding="utf-8") == md_content


def test_run_creates_parent_dir(tmp_path):
    nested = tmp_path / "subdir" / "today_news.md"
    with patch("requests.get", return_value=_mock_gas_ok("content")), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"):
        fetch.run(nested)
    assert nested.exists()


def test_token_not_in_log_url(caplog):
    """Token không được lọt vào log URL."""
    with patch("requests.get", return_value=_mock_gas_ok("content")) as mock_get, \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "SECRETTOKEN123"), \
         caplog.at_level("INFO"):
        fetch.fetch_news_markdown()
    assert "SECRETTOKEN123" not in caplog.text


def test_fetch_exits_on_non_json_response():
    """GAS trả về HTML/text thay vì JSON (xảy ra khi GAS deploy lỗi)."""
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.status_code = 200
    resp.text = "<html>Service unavailable</html>"
    resp.json.side_effect = ValueError("Expecting value")
    with patch("requests.get", return_value=resp), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_when_data_not_dict():
    """GAS response có 'success': true nhưng 'data' là list/None — sai cấu trúc."""
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"success": True, "data": ["wrong", "shape"]}
    with patch("requests.get", return_value=resp), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_when_markdown_not_string():
    """markdown là number/object thay vì string."""
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "success": True,
        "data": {"markdown": 12345, "date": "x", "article_count": 0},
    }
    with patch("requests.get", return_value=resp), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_on_connection_error():
    import requests as _requests
    with patch("requests.get", side_effect=_requests.ConnectionError("boom")), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1


def test_fetch_exits_on_http_error_clean():
    """raise_for_status raise HTTPError → phải catch và sys.exit(1), không traceback."""
    import requests as _requests
    resp = MagicMock()
    resp.status_code = 500
    resp.raise_for_status.side_effect = _requests.HTTPError("500 Server Error")
    with patch("requests.get", return_value=resp), \
         patch.object(fetch, "GAS_URL", "https://gas.example/exec"), \
         patch.object(fetch, "GAS_TOKEN", "TOKEN"), \
         pytest.raises(SystemExit) as exc:
        fetch.fetch_news_markdown()
    assert exc.value.code == 1
