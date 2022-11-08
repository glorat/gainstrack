from datetime import datetime
import sys
import pandas as pd

def investpy(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
        <https://flask.palletsprojects.com/en/1.1.x/api/#incoming-request-data>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <https://flask.palletsprojects.com/en/1.1.x/api/#flask.make_response>.
    """
    request_json = request.get_json(silent=True)
    request_args = request.args

    ret = ''
    if request_json and 'ticker' in request_json:
        return doit(request_json), 200, {'Content-Type': 'text/csv; charset=utf-8'}
    elif request_args and 'ticker' in request_args:
        # We are in a browser probably so just make it show, rather than download csv
        return doit(request_args), 200, {'Content-Type': 'text/plain; charset=utf-8'}
    else:
        return 'no arguments', 200, {'Content-Type': 'text/plain; charset=utf-8'}

def doit(args):
    import investpy
    from investiny import historical_data, search_assets

    ticker = args['ticker']
    market_region = args['marketRegion']

    country_map = {
        'LN': 'united kingdom',
        'NY': 'united states',
        'HK': 'hong kong',
        'CA': 'canada',
        'SG': 'singapore',
        'EU': 'netherlands' # arbitrary choice! in future could try to parse stock exchange field
    }
    country = country_map[market_region]

    etfs_dict = investpy.etfs.get_etfs_dict()
    rows = [item for item in etfs_dict if item['symbol']==ticker and item['country'] == country]
    row = rows[0]
    # print(row)
    exchange = row['stock_exchange']
    currency = row['currency']
    # foo = investpy.etfs.get_etf_recent_data(etf, country)
    search_results = search_assets(query=ticker, type="ETF", limit=2)
    matches = [item for item in search_results if item["exchange"] == exchange]

    # print(matches)

    investing_id = int(matches[0]["ticker"])
    data = historical_data(investing_id=investing_id, from_date="09/01/2022")
    df = pd.DataFrame(data)
    # print(data)
    df['timestamp'] = df['date'].apply(lambda x: datetime.strptime(x, '%m/%d/%Y').strftime('%Y-%m-%d'))
    df['currency'] = currency
    df['close'] = df['close'].round(4)
    # df = df.rename(columns={'date': 'timestamp'})
    # print(df)
    return df.to_csv(columns=['timestamp', 'close', 'currency'], index=False)

def main():
    ticker = sys.argv[1]
    market_region = sys.argv[2]
    args = {'ticker': ticker, 'marketRegion': market_region}
    print (doit(args))

if __name__ == "__main__":
    main()