import investpy
import sys


ticker = sys.argv[1]
country = sys.argv[2]

etfs_dict = investpy.etfs.get_etfs_dict()
names = [item['name'] for item in etfs_dict if item['symbol']==ticker and item['country'] == country]
etf = names[0]
foo = investpy.etfs.get_etf_recent_data(etf, country)
foo = foo.rename(columns = {'Date':'timestamp', 'Close':'close', 'Currency':'currency'})
print (foo.to_csv(columns=['close','currency'], index_label='timestamp'))