#!/usr/bin/env python3
"""Audit private full-book PDFs and compare split PDFs without exporting their text."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "references-privees"
BOOKS = {
    "kumar": "KUMAR EDITABIL.pdf",
    "lawrence": "LAWRENCE_EDITABIL.pdf",
    "sinopsis": "Sinopsis de Medicina Editia a 5-a - Editabil.pdf",
}
CHAPTER_SOURCE = (ROOT / "src/data/rezidentiat2026.ts").read_text(encoding="utf-8")
CHUNKS = re.findall(r'\{ id: "([^"]+)", bookId: "([^"]+)".*?privateFile: "([^"]+)"', CHAPTER_SOURCE)


def fingerprint(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text).strip().casefold()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest() if normalized else ""


def flatten_outline(nodes):
    for node in nodes:
        if isinstance(node, list):
            yield from flatten_outline(node)
        else:
            yield node


def main() -> int:
    books = {}
    page_fingerprints: dict[str, dict[str, list[int]]] = {}
    for key, filename in BOOKS.items():
        path = PRIVATE / filename
        if not path.is_file():
            books[key] = {"file": filename, "status": "missing"}
            continue
        try:
            reader = PdfReader(path, strict=False)
            page_text = [(page.extract_text() or "") for page in reader.pages]
            outlines = []
            try:
                for item in flatten_outline(reader.outline):
                    title = getattr(item, "title", None)
                    if title:
                        try:
                            page_number = reader.get_destination_page_number(item) + 1
                        except Exception:
                            page_number = None
                        outlines.append({"pdfPage": page_number, "title": title})
            except Exception:
                pass
            toc_pages = [
                index + 1 for index, text in enumerate(page_text)
                if re.search(r"\b(cuprins|contents|table of contents)\b", text, re.I)
            ]
            books[key] = {
                "file": filename,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "pdfPages": len(reader.pages),
                "textPages": sum(bool(text.strip()) for text in page_text),
                "outlineEntries": outlines,
                "tocCandidatePdfPages": toc_pages,
            }
            page_fingerprints[key] = {}
            for index, text in enumerate(page_text, 1):
                digest = fingerprint(text)
                if digest:
                    page_fingerprints[key].setdefault(digest, []).append(index)
            print(f"BOOK {key}: {len(reader.pages)} PDF pages; {len(outlines)} bookmarks; TOC candidates={toc_pages}")
        except Exception as error:
            books[key] = {"file": filename, "status": "unreadable", "error": str(error)}
            print(f"BOOK {key}: unreadable ({error})")

    chunks = {}
    for chapter_id, book_id, filename in CHUNKS:
        path = PRIVATE / filename
        if not path.is_file():
            chunks[chapter_id] = {"file": filename, "status": "missing"}
            continue
        try:
            reader = PdfReader(path, strict=False)
            matches = []
            for index, page in enumerate(reader.pages, 1):
                digest = fingerprint(page.extract_text() or "")
                pages = page_fingerprints.get(book_id, {}).get(digest, [])
                matches.append({"chunkPdfPage": index, "bookPdfPages": pages})
            matched = [page for page in matches if page["bookPdfPages"]]
            chunks[chapter_id] = {
                "file": filename,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "pdfPages": len(reader.pages),
                "exactlyMatchedChunkPages": len(matched),
                "pageMatches": matches,
                "status": "exact-page-matches-found" if matched else "no-exact-page-match",
            }
            print(f"CHUNK {chapter_id}: {len(matched)}/{len(reader.pages)} exact page-text matches in {book_id}")
        except Exception as error:
            chunks[chapter_id] = {"file": filename, "status": "unreadable", "error": str(error)}
            print(f"CHUNK {chapter_id}: unreadable ({error})")

    output = PRIVATE / ".norya-book-source-audit.json"
    output.write_text(json.dumps({
        "schemaVersion": 1,
        "privacy": "Local source metadata only. No extracted textbook text stored.",
        "books": books,
        "splitChapters": chunks,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Private metadata audit written: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
