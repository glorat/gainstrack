import sys

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
    names = [item['name'] for item in etfs_dict if item['symbol']==ticker and item['country'] == country]
    etf = names[0]
    foo = investpy.etfs.get_etf_recent_data(etf, country)
    foo = foo.rename(columns = {'Date':'timestamp', 'Close':'close', 'Currency':'currency'})
    return foo.to_csv(columns=['close','currency'], index_label='timestamp')

def main():
    ticker = sys.argv[1]
    market_region = sys.argv[2]
    args = {'ticker': ticker, 'marketRegion': market_region}
    print (doit(args))

if __name__ == "__main__":
    main()