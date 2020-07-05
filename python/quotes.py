import investpy
import sys

country = 'united kingdom'
stock_exchange = 'London'
ticker = sys.argv[1]

etfs_dict = investpy.etfs.get_etfs_dict()
names = [item['name'] for item in etfs_dict if item['symbol']==ticker and item['stock_exchange'] == stock_exchange]
etf = names[0]
foo = investpy.etfs.get_etf_recent_data(etf, country)
foo = foo.rename(columns = {'Date':'timestamp', 'Close':'close', 'Currency':'currency'})
print (foo.to_csv(columns=['close','currency'], index_label='timestamp'))