"""Read-only PDF audit. Writes metadata only; never publishes extracted textbook text."""
from pathlib import Path
from pypdf import PdfReader
import hashlib, json, re
root = Path(__file__).resolve().parents[1]
source = (root/'src/data/rezidentiat2026.ts').read_text()
entries = re.findall(r'\{ id: "([^"]+)", bookId: "([^"]+)".*?privateFile: "([^"]+)"', source)
result = {}
for chapter, book, name in entries:
    file = root/'references-privees'/name
    if not file.exists():
        result[chapter] = {'file': name, 'status': 'missing'}
        continue
    try:
        pdf = PdfReader(file)
        readable = sum(len(p.extract_text() or '') > 100 for p in pdf.pages)
        result[chapter] = {'file': name, 'status': 'readable' if readable == len(pdf.pages) else 'partial', 'pdfPages':len(pdf.pages), 'textPages':readable, 'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    except Exception:
        result[chapter] = {'file': name, 'status':'unreadable'}
(root/'src/data/referenceAudit.ts').write_text('// Metadata only. Run python3 scripts/audit-references.py after adding private sources.\nexport const referenceAudit: Record<string, {file:string;status:string;pdfPages?:number;textPages?:number;sha256?:string}> = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n')
print({status:sum(v['status']==status for v in result.values()) for status in ['readable','partial','missing','unreadable']})
