"""
hsv_to_pinecone.py
Scrape ~30 bài từ https://huongsenviet.com/category/chong-dbhb/
→ chunk theo đoạn văn (≥600 từ)
→ Gemini embedding (gemini-embedding-2, dim=768)
→ Pinecone upsert (namespace: troly35)

Cách dùng:
  pip install requests beautifulsoup4 google-genai pinecone python-dotenv
  python hsv_to_pinecone.py
"""

import os
import sys
import re

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import time
import hashlib
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ─── CẤU HÌNH ───────────────────────────────────────────────────────────────
GEMINI_API_KEY     = os.environ["GEMINI_API_KEY"]
PINECONE_API_KEY   = os.environ["PINECONE_API_KEY"]
PINECONE_HOST      = os.environ["PINECONE_HOST"]
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "troly35")

CATEGORY_URL      = "https://huongsenviet.com/category/chong-dbhb/"
MAX_PAGES         = 3                  # ~10 bài/trang → 30 bài
MIN_CHUNK_WORDS   = 600
REQUEST_DELAY     = 2.0               # giây giữa các request
EMBED_BATCH_SIZE  = 2                  # số chunk gửi Gemini 1 lần
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

ARTICLE_URL_RE = re.compile(
    r"^https://huongsenviet\.com/"
    r"(?!category/|tag/|author/|page/|wp-|feed/|$)"
    r"[^?#]+/$",
    re.IGNORECASE
)


def fetch_html(url: str) -> BeautifulSoup | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        print(f"  [WARN] fetch {url}: {e}")
        return None


def collect_article_urls(max_pages: int) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    for page in range(1, max_pages + 1):
        page_url = CATEGORY_URL if page == 1 else f"{CATEGORY_URL}page/{page}/"
        print(f"[collect] Trang {page}: {page_url}")
        soup = fetch_html(page_url)
        if soup is None:
            break

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if ARTICLE_URL_RE.match(href) and href not in seen:
                seen.add(href)
                urls.append(href)

        time.sleep(REQUEST_DELAY)

    print(f"[collect] Tổng: {len(urls)} URL bài viết")
    return urls


def extract_article(url: str) -> dict | None:
    soup = fetch_html(url)
    if soup is None:
        return None

    # Tiêu đề
    title_tag = soup.find("h1") or soup.find("h2")
    title = title_tag.get_text(strip=True) if title_tag else url

    # Nội dung: thử các CSS class của WordPress / theme Newspaper
    content_el = (
        soup.find(class_=re.compile(r"td-post-content|entry-content|post-content|article-content", re.I))
        or soup.find("article")
    )
    if content_el is None:
        print(f"  [WARN] Không tìm thấy nội dung: {url}")
        return None

    # Lấy đoạn văn, bỏ script/style
    for tag in content_el(["script", "style", "figure", "iframe"]):
        tag.decompose()

    paragraphs = [p.get_text(separator=" ", strip=True) for p in content_el.find_all("p")]
    paragraphs = [p for p in paragraphs if len(p.split()) > 10]

    if not paragraphs:
        print(f"  [WARN] Nội dung rỗng: {url}")
        return None

    return {"url": url, "title": title, "paragraphs": paragraphs}


def group_into_chunks(paragraphs: list[str], min_words: int) -> list[str]:
    chunks: list[str] = []
    current_parts: list[str] = []
    current_words = 0

    for para in paragraphs:
        current_parts.append(para)
        current_words += len(para.split())
        if current_words >= min_words:
            chunks.append("\n\n".join(current_parts))
            current_parts = []
            current_words = 0

    if current_parts:
        text = "\n\n".join(current_parts)
        if chunks:
            chunks[-1] += "\n\n" + text  # ghép phần đuôi vào chunk cuối
        else:
            chunks.append(text)

    return chunks


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def embed_texts(client: genai.Client, texts: list[str]) -> list[list[float]]:
    for attempt in range(3):
        try:
            result = client.models.embed_content(
                model="gemini-embedding-2",
                contents=texts,
                config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": 768}
            )
            return [e.values for e in result.embeddings]
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                wait = 30 * (attempt + 1)
                print(f"  [RATE LIMIT] chờ {wait}s rồi thử lại...")
                time.sleep(wait)
            else:
                raise


def main():
    # Khởi tạo clients
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(host=PINECONE_HOST)

    # 1. Thu thập URL
    article_urls = collect_article_urls(MAX_PAGES)

    # 2. Scrape + chunk
    all_chunks: list[dict] = []
    for url in article_urls:
        print(f"[scrape] {url}")
        article = extract_article(url)
        if article is None:
            time.sleep(REQUEST_DELAY)
            continue

        raw_chunks = group_into_chunks(article["paragraphs"], MIN_CHUNK_WORDS)
        for i, text in enumerate(raw_chunks):
            chunk_id = f"hsv_{sha256_hex(text)[:16]}"
            all_chunks.append({
                "id": chunk_id,
                "text": text,
                "metadata": {
                    "source_type": "hsv_chunk",
                    "source_url": url,
                    "title": article["title"],
                    "chunk_index": i,
                    "total_chunks": len(raw_chunks),
                    "word_count": len(text.split()),
                    "namespace": PINECONE_NAMESPACE,
                    "text": text,
                }
            })

        print(f"  → {len(raw_chunks)} chunk(s) | {article['title'][:60]}")
        time.sleep(REQUEST_DELAY)

    print(f"\n[embed+upsert] Tổng {len(all_chunks)} chunk, bắt đầu embedding...")

    # 3. Embed + upsert từng batch
    upserted = 0
    for i in range(0, len(all_chunks), EMBED_BATCH_SIZE):
        batch = all_chunks[i : i + EMBED_BATCH_SIZE]
        texts = [c["text"] for c in batch]

        try:
            embeddings = embed_texts(gemini_client, texts)
        except Exception as e:
            print(f"  [ERROR] Gemini embed batch {i}: {e}")
            time.sleep(5)
            continue

        vectors = [
            {"id": c["id"], "values": emb, "metadata": c["metadata"]}
            for c, emb in zip(batch, embeddings)
        ]

        try:
            index.upsert(vectors=vectors, namespace=PINECONE_NAMESPACE)
            upserted += len(vectors)
            print(f"  [upsert] {i + len(batch)}/{len(all_chunks)} chunk xong")
        except Exception as e:
            print(f"  [ERROR] Pinecone upsert batch {i}: {e}")

        time.sleep(1.0)

    print(f"\n[done] Đã upsert {upserted}/{len(all_chunks)} chunk vào Pinecone namespace '{PINECONE_NAMESPACE}'")


if __name__ == "__main__":
    main()
