import yfinance as yf
import sys

country_map = {
    'LN': 'L',
    'NY': '',
    'HK': 'HK',
    'CA': '',
    'SG': 'SI',
    'EU': 'AQ'  # arbitrary choice! in future could try to parse stock exchange field
}


def doit(args):
    market_region = args['marketRegion']
    country = country_map[market_region]
    ticker = args['ticker'] if (country == '') else '.'.join([args['ticker'], country])
    # print(ticker, file=sys.stderr)

    t = yf.Ticker(ticker)
    currency = t.info['currency']

    # df = t.history(period="1mo")
    df = t.history(period="max")
    df['timestamp'] = df.index.strftime('%Y-%m-%d')
    df['close'] = df['Close'].round(4)
    df['currency'] = currency
    ret = df.to_csv(columns=['timestamp', 'close', 'currency'], index=False)
    return ret


def main():
    ticker = sys.argv[1]
    market_region = sys.argv[2]
    args = {'ticker': ticker, 'marketRegion': market_region}
    print(doit(args))


if __name__ == "__main__":
    main()
