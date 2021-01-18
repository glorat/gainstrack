import sys
import requests
import pandas as pd
import json
import re

def getIndex(idx):
    # fromDate = '2020-01-01'; # Use this for quicker debugging
    fromDate = '1900-01-01'
    url = f'https://cdn.trackinsight.com/data/api/indexView/{idx}?from={fromDate}&to=2199-01-01'
    print(f'http get from: {url}', file=sys.stderr)
    resp = requests.get(url=url)
    data = resp.json()
    if 'data' in data:
        rows = data['data']['snapshots']
        rows = [x['data'] for x in rows]
        df = pd.DataFrame(rows)
        df['stamp'] = df['stamp'].apply(lambda x: x[:10])
        # print(df.day_perf.to_string())
        df = df.rename(columns = {'stamp':'timestamp', 'day_perf':'close'})
        ret = df.to_csv(columns=['timestamp', 'close'], index=False)
        return ret
    else:
        raise RuntimeError('trackinsight did not return expected data')

def idxFromQuoteSource(qs):
    if qs['asset']['type'] == 'Index':
        pattern = re.compile("https://www.trackinsight.com/.*/index/([0-9]+)")
        ref = next((x for x in qs['asset']['references'] if pattern.match(x)), '')
        if ref:
            g = pattern.match(ref)
            idx = g.groups()
            return idx[0]

def main():
    if len(sys.argv) >1:
        idx = sys.argv[1]
    else:
        obj = json.load(sys.stdin)
        idx = idxFromQuoteSource(obj)
    if idx:
        print(getIndex(idx))
    # print (doit(args))

if __name__ == "__main__":
    main()

