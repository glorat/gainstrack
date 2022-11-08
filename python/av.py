# export ALPHAVANTAGE_API_KEY=.........

from alpha_vantage.timeseries import TimeSeries
import sys

def av(request):
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
    symbol = args['ticker']
    if 'sources' in args:
        avs = [x for x in args['sources'] if x.sourceType=='av']
        if len(avs)>0:
            symbol = avs[0].ref

    ts = TimeSeries(output_format='pandas')
    data, meta_data = ts.get_weekly(symbol)

    data = data.rename(columns = {'date':'timestamp', '4. close':'close'})
    ret = data.to_csv(columns=['close'], index_label='timestamp')
    return ret


def main():
    ticker = sys.argv[1]
    args = {'ticker': ticker}
    print (doit(args))

if __name__ == "__main__":
    main()