import unittest
import pymupdf
from compose import compose_page, check_partition
from pipeline import page_content

class ComposeTests(unittest.TestCase):
    def test_columns_reordered_without_rewriting_and_visual_retained(self):
        doc=pymupdf.open();page=doc.new_page(width=400,height=300)
        # Deliberately insert right column first in the PDF extraction stream.
        page.insert_text((230,60),'Right original 1.5 mg')
        page.insert_text((30,60),'Left original heading',fontsize=11)
        page.insert_text((30,100),'Left original paragraph')
        page.insert_text((30,250),'Original table 3.2 mg')
        _,blocks=page_content(page)
        zones=[{'bbox':[0,0,200,200],'kind':'text'},
               {'bbox':[200,0,400,200],'kind':'text'},
               {'bbox':[0,200,400,300],'kind':'visual','role':'table'}]
        parts,ids=compose_page(page,blocks,zones,{})
        self.assertTrue(parts[0]['text'].startswith('Left original'))
        self.assertTrue(parts[2]['text'].startswith('Right original'))
        self.assertEqual(parts[-1]['role'],'table')
        self.assertEqual(parts[-1]['kind'],'visual')
        self.assertEqual(len(ids),sum(len(x['sourceLineIds']) for x in parts))
        self.assertTrue(all(x['status']=='unverified' for x in parts))
        for part in parts:
            self.assertEqual(part['text'],'\n'.join(''.join(run['text'] for run in line) for line in part['lines']))
        doc.close()

    def test_gaps_overlap_and_cut_lines_block_composition(self):
        for zones in [[{'bbox':[0,0,90,100]}], [{'bbox':[0,0,100,100]},{'bbox':[0,0,20,20]}]]:
            with self.assertRaises(ValueError):check_partition(zones,100,100)
        doc=pymupdf.open();page=doc.new_page(width=300,height=200)
        page.insert_text((100,60),'Crosses boundary')
        _,blocks=page_content(page)
        with self.assertRaises(ValueError):compose_page(page,blocks,[{'bbox':[0,0,150,200],'kind':'text'},
            {'bbox':[150,0,300,200],'kind':'text'}],{})

    def test_uncertain_text_uses_original_visual(self):
        doc=pymupdf.open();page=doc.new_page(width=300,height=200)
        page.insert_text((20,40),'Uncertain original symbols')
        _,blocks=page_content(page)
        parts,_=compose_page(page,blocks,[{'bbox':[0,0,300,200],'kind':'text'}],
                             {blocks[0]['id']:{'priority':'high','reasons':['unrecognized-character']}})
        self.assertEqual(parts[0]['kind'],'visual')
        self.assertIn('Uncertain original symbols',parts[0]['text'])
