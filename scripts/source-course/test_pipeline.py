"""Synthetic documents only: no textbook material in tests."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import pipeline as p


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.guard = patch.object(p, 'PRIVATE', self.root)
        self.guard.start()
        self.book = self.root / 'book.pdf'
        doc = p.pymupdf.open()
        for i in range(1568):
            page = doc.new_page(width=200, height=200)
            if 173 <= i <= 190:
                page.insert_text((10, 20), str(i - 22))
                page.insert_text((10, 70), 'Synthetic text: 1.5 mg; <test>')
        doc.save(self.book)
        doc.close()
        self.tematica = self.root / 'program.pdf'
        doc = p.pymupdf.open()
        page = doc.new_page()
        page.insert_text((20, 30), '2026 2021 Hipocrate 10-a\nCAP. 8 - SEPSISUL p.151-168')
        doc.new_page().insert_text((20, 30), 'Synthetic exclusion evidence')
        doc.save(self.tematica)
        doc.close()
        self.output = self.root / 'result'
        self.report = p.extract(self.book, self.tematica, self.output)

    def tearDown(self):
        self.guard.stop()
        self.temp.cleanup()

    def test_extracted_is_not_verified_and_reader_escapes_text(self):
        self.assertEqual(self.report['processedPages'], 18)
        self.assertEqual(self.report['missingPages'], [])
        self.assertFalse(self.report['complete'])
        self.assertEqual(self.report['verifiedPages'], 0)
        self.assertTrue(all(not page['technicalErrors'] for page in self.report['pages']))
        self.assertIn('&lt;test&gt;', (self.output / 'review.html').read_text())
        with self.assertRaises(ValueError):
            p.extract(self.book, self.tematica, self.output)

    def test_modified_text_detected_even_with_updated_manifest_hash(self):
        path = self.output / '151/raw.txt'
        path.write_text('Different text')
        manifest_path = self.output / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['pages'][0]['artifacts']['raw.txt'] = p.digest(path)
        p.write_json(manifest_path, manifest)
        report = p.verify(self.output)
        self.assertIn('Text differs from fresh original-PDF extraction', report['pages'][0]['technicalErrors'])
        self.assertFalse(report['complete'])

    def test_missing_and_duplicate_pages_block_completion(self):
        path = self.output / 'manifest.json'
        manifest = json.loads(path.read_text())
        manifest['pages'][1] = manifest['pages'][0]
        p.write_json(path, manifest)
        report = p.verify(self.output)
        self.assertEqual(report['missingPages'], [152])
        self.assertTrue(report['errors'])
        self.assertFalse(report['complete'])

    def test_source_change_invalidates_reviews(self):
        with self.book.open('ab') as file:
            file.write(b'\n% modified source\n')
        self.assertIn('Source PDF fingerprint changed', p.verify(self.output)['errors'])

    def test_output_cannot_escape_private_root(self):
        with self.assertRaises(ValueError):
            p.private_path(self.root / '..' / 'public-course')

    def test_verified_checklist_without_block_reviews_is_insufficient(self):
        path = self.output / '151/review.json'
        review = json.loads(path.read_text())
        review.update(reviewer='Synthetic reviewer', reviewedAt='2026-10-15T12:00:00Z', issues=[])
        review['checks'] = {key: 'verified' for key in p.CHECKS}
        p.write_json(path, review)
        page = p.verify(self.output)['pages'][0]
        self.assertFalse(page['verified'])
        self.assertTrue(page['pendingBlocks'])


if __name__ == '__main__':
    unittest.main()
