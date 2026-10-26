import unittest
from build_network_scope import select_network

class NetworkTests(unittest.TestCase):
    def test_preserves_existing_and_selects_reciprocal_pairs(self):
        existing={'AAA-BBB','BBB-AAA'}
        candidates={'AAA-CCC','CCC-AAA','BBB-CCC','CCC-BBB'}
        rows=[{'route':r,'month':f'2024-{m:02}','passengers':100 if 'AAA' in r else 200}
              for r in existing|candidates for m in range(1,12)]
        result=select_network(existing,candidates,rows,4)
        self.assertEqual(set(result['directional_routes']),existing|{'BBB-CCC','CCC-BBB'})
        self.assertTrue(all(p['complete_months']==11 for p in result['pairs']))
    def test_missing_direction_is_not_complete(self):
        rows=[{'route':'AAA-BBB','month':str(m),'passengers':10} for m in range(12)]
        with self.assertRaises(ValueError):select_network({'AAA-BBB','BBB-AAA'},set(),rows,2)

if __name__=='__main__':unittest.main()
