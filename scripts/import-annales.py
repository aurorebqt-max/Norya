#!/usr/bin/env python3
"""Incrementally index private Romanian rezidentiat PDFs without publishing them."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as error:
    raise SystemExit("Missing local dependency: install pypdf to scan private PDFs.") from error

VERSION = 3
QUESTION_START = re.compile(r"(?m)^[ \t]*(\d{1,3})[.)][ \t]+")
CHOICE_START = re.compile(r"(?m)(?:^|[ \t])([A-E])[.)][ \t]+")
YEAR = re.compile(r"\b(20\d{2})\b")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def document_metadata(path: Path, text: str, page_count: int) -> dict:
    heading = " ".join(text.split()[:160])
    years = YEAR.findall(heading)
    filename_year = YEAR.search(path.stem)
    year = years[0] if years else filename_year.group(1) if filename_year else None
    session = re.search(r"SESIUNEA.{0,70}?(?:20\d{2})", heading, re.I)
    session_candidate = session.group(0).strip() if session else None
    if not session_candidate and year:
        month = re.search(r"\b(MAI|NOIEMBRIE|NOI|NOVEMBRIE)\b", path.stem, re.I)
        if month:
            session_name = "Noiembrie" if month.group(1).upper() in {"NOI", "NOIEMBRIE", "NOVEMBRIE"} else "Mai"
            session_candidate = f"{session_name} {year}"
    return {
        "yearCandidate": year,
        "sessionCandidate": session_candidate,
        "yearStatus": "candidate" if year else "unknown",
        "provenance": path.name,
        "pageCount": page_count,
    }


def extract_questions(pages: list[str], source_id: str) -> tuple[list[dict], int, bool]:
    text = "\n".join(pages)
    matches = list(QUESTION_START.finditer(text))
    records = []
    seen_fingerprints = set()
    for index, match in enumerate(matches):
        number = int(match.group(1))
        if number < 1 or number > 300:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.start():end].strip()
        fingerprint = digest(normalize(body).encode("utf-8"))
        if fingerprint in seen_fingerprints:
            continue
        seen_fingerprints.add(fingerprint)
        choices = []
        markers = list(CHOICE_START.finditer(body))
        for choice_index, marker in enumerate(markers):
            choice_end = markers[choice_index + 1].start() if choice_index + 1 < len(markers) else len(body)
            choices.append({"label": marker.group(1), "text": body[marker.end():choice_end].strip()})
        prefix = text[max(0, match.start() - 500):match.start()].upper()
        qtype = "single" if "COMPLEMENT SIMPLU" in prefix[-350:] else "multiple" if "COMPLEMENT MULTIPLU" in prefix[-350:] else "unknown"
        records.append({
            "id": f"{source_id}:q{number}:{fingerprint[:12]}",
            "sourceId": source_id,
            "number": number,
            "prompt": body,
            "choices": choices,
            "type": qtype,
            "answer": None,
            "answerStatus": "awaiting-verification",
            "rightsReuse": "unknown",
            "association": {"status": "unfindable", "matches": []},
            "duplicateFingerprint": fingerprint,
        })
    detected_numbers = {row["number"] for row in records}
    complete_sequence = bool(detected_numbers) and detected_numbers == set(range(1, max(detected_numbers) + 1))
    exact_total = max(detected_numbers) if complete_sequence else None
    return records, exact_total, bool(text.strip())


def scan_pdf(path: Path) -> dict:
    payload = path.read_bytes()
    source_id = digest(payload)
    reader = PdfReader(path, strict=False)
    pages = [(page.extract_text() or "") for page in reader.pages]
    text = "\n".join(pages)
    metadata = document_metadata(path, text, len(reader.pages))
    questions, exact_total, extractable = extract_questions(pages, source_id)
    image_only = not any(page.strip() for page in pages)
    return {
        "id": source_id,
        "sha256": source_id,
        "fileName": path.name,
        **metadata,
        "status": "needs-ocr" if image_only else "needs-human-review",
        "extraction": "image-only" if image_only else "text-extracted",
        "detectedQuestionCount": len(questions),
        "exactQuestionCount": exact_total,
        "questionCountStatus": "verified" if exact_total is not None else "incomplete-extraction",
        "rightsReuse": "unknown",
        "questions": questions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path("references-privees/annales"))
    parser.add_argument("--index", type=Path, help="Private index path (defaults inside the source directory)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    directory = args.directory.resolve()
    index_path = (args.index or directory / ".norya-import-index.json").resolve()
    if not directory.is_dir():
        print(f"Private exam folder not found: {directory}", file=sys.stderr)
        return 2
    old_index = {"schemaVersion": VERSION, "documents": {}}
    if index_path.exists():
        old_index = json.loads(index_path.read_text(encoding="utf-8"))
        if old_index.get("schemaVersion") not in (1, 2, VERSION) or not isinstance(old_index.get("documents"), dict):
            raise SystemExit(f"Unsupported or invalid private index: {index_path}")
    previous = old_index["documents"]
    reindex_all = old_index.get("schemaVersion") != VERSION
    documents = {}
    for path in sorted(directory.glob("*.pdf")):
        source_digest = digest(path.read_bytes())
        prior = previous.get(path.name)
        if prior and prior.get("sha256") == source_digest and not reindex_all:
            documents[path.name] = prior
            print(f"UNCHANGED {path.name}: {prior['detectedQuestionCount']} questions detected")
            continue
        current = scan_pdf(path)
        if prior:
            old_questions = {q.get("duplicateFingerprint"): q for q in prior.get("questions", [])}
            for question in current["questions"]:
                old = old_questions.get(question["duplicateFingerprint"])
                if old:
                    question["association"] = old.get("association", question["association"])
                    question["answer"] = old.get("answer")
                    question["answerStatus"] = old.get("answerStatus", question["answerStatus"])
                    question["rightsReuse"] = old.get("rightsReuse", "unknown")
        documents[path.name] = current
        print(f"INDEXED {path.name}: {current['detectedQuestionCount']} questions detected; exact total={current['exactQuestionCount']}; {current['status']}")
    removed = sorted(set(previous) - set(documents))
    for name in removed:
        print(f"REMOVED {name} (retained nowhere outside the private index)")
    result = {
        "schemaVersion": VERSION,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "privacy": "Private local data. Do not copy to source control, public assets, or app bundles.",
        "documents": documents,
    }
    duplicate_groups: dict[str, list[dict]] = {}
    for document in documents.values():
        for question in document.get("questions", []):
            fingerprint = question.get("duplicateFingerprint")
            if fingerprint:
                duplicate_groups.setdefault(fingerprint, []).append({
                    "sourceId": document.get("id"),
                    "fileName": document.get("fileName"),
                    "questionId": question.get("id"),
                })
    result["duplicateGroups"] = [
        {"fingerprint": fingerprint, "sources": sources}
        for fingerprint, sources in duplicate_groups.items()
        if len(sources) > 1
    ]
    if not args.dry_run:
        index_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = index_path.with_suffix(index_path.suffix + ".tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(index_path)
        print(f"Private index saved: {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
