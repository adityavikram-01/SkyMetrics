import unittest
from datetime import date
from commerce_dataset import configuration,history,quote,HORIZON

class CommerceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.config,_=configuration()
    def test_network(self):
        c=self.config
        self.assertEqual(len(c['routes']),48)
        self.assertEqual(len(c['services']),576)
        self.assertEqual(len({s['flight_number'] for s in c['services']}),576)
        self.assertTrue(all(4<=r['services']<=36 for r in c['routes'].values()))
        self.assertEqual({s['airline'] for s in c['services']},{'6E','AI','IX','QP','SG'})
    def test_inventory_and_reproducibility(self):
        for s in self.config['services'][::23]:
            rows=list(history(self.config,s,date(2026,10,26)))
            self.assertEqual(rows,list(history(self.config,s,date(2026,10,26))))
            self.assertEqual(len(rows),HORIZON)
            for i,row in enumerate(rows):
                day,h,outcome,base,tax,fee,seats,remaining,arrivals,cancel=row
                self.assertEqual(date(2026,10,26).toordinal()-day,h)
                self.assertTrue(0<=remaining<=s['capacity'])
                if i:self.assertEqual(remaining,rows[i-1][7]+cancel-arrivals)
                self.assertEqual(base is not None,outcome=='AVAILABLE')
                if outcome=='AVAILABLE':self.assertGreater(base+tax+fee,0);self.assertEqual(seats,remaining)
                else:self.assertIsNone(seats)
    def test_group_quotes_share_inventory(self):
        row={'outcome':'AVAILABLE','bookable_seats':3,'base_paise':400000,'tax_paise':20000,'fee_paise':25000}
        basic={'surcharge_paise':0};flex={'surcharge_paise':220000}
        self.assertEqual(quote(row,basic,3)['total_paise'],1335000)
        self.assertEqual(quote(row,flex,3)['total_paise'],1995000)
        self.assertIsNone(quote(row,basic,4));self.assertIsNone(quote(row,flex,4))
        for n in (0,10):
            with self.assertRaises(ValueError):quote(row,basic,n)
        row['outcome']='TIMEOUT';self.assertIsNone(quote(row,basic))

if __name__=='__main__':unittest.main()
