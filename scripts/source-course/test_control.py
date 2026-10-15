import unittest
from control import analyse_blocks


def block(identity, text, box=(10, 50, 100, 65)):
    return {'id': identity, 'bbox': box, 'lines': [{'spans':[{'text':text}], 'bbox':box, 'dir':[1,0]}]}


class ControlTests(unittest.TestCase):
    def test_disagreement_is_not_corrected(self):
        items = [block('a', 'dose 1.5 mg')]
        checked, differences = analyse_blocks(items, 'dose 15 mg', 200, 200)
        self.assertEqual(items[0]['lines'][0]['spans'][0]['text'], 'dose 1.5 mg')
        self.assertEqual(checked[0]['priority'], 'high')
        self.assertEqual(checked[0]['humanStatus'], 'pending')
        self.assertTrue(differences['independentTokensAbsentFromSource'])

    def test_order_inversion_and_repetition(self):
        checked, _ = analyse_blocks([block('a','repeated paragraph', (10,100,100,120)),
                                    block('b','repeated paragraph', (10,50,100,70))],
                                   'repeated paragraph repeated paragraph',200,200)
        self.assertIn('reading-order-jump', checked[1]['reasons'])
        self.assertIn('repeated-block-candidate', checked[0]['reasons'])

    def test_agreement_is_not_human_validation(self):
        checked, _ = analyse_blocks([block('a','normal paragraph')], 'normal paragraph',200,200)
        self.assertEqual(checked[0]['priority'], 'page-review')
        self.assertEqual(checked[0]['humanStatus'], 'pending')
