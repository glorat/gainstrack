import investpy
import sys

etfs = investpy.etfs.get_etfs()
# print (foo.to_csv(columns=['close','currency'], index_label='timestamp'))

print (etfs.to_csv())