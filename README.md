### Usage Guidelines

The key things to record are
1. The account balances of your key bank accounts and investment assets

Things you should do your best to record
1. All your approximate earnings and income, both personal and from investments
2. All interbank transfers and asset purchases

Things you don't need to record
- Every single expense. Just the one off large items might be worthwhile

Things that are nice to record
- Net income is okay (i.e. gross-expenses)

### How the data will be used
Account balances allow you to determine your networth at points in time

Recording transfers and asset purchases is needed to avoid spikes in your networth caused by reading account balances at times before and after the transfer

Your earnings are needed to determine your monthly/yearly income for forward planning

With all that information, your overall expenses can be determined. Any specifically measured expenses are just for your reporting granularity

By knowing your networth, income and expenses, we can forecast many things like
* Return on your investments (IRR calculation)
* How close you are to retirement

### Developer notes

Proxy the mysql instance as localhost with this

`cloud_sql_proxy -credential_file=./gainstrack-firebase-adminsdk-i4v7p-cd5c94630a.json -instances=gainstrack:asia-east2:gainstrack-hk=tcp:3306`

#### Environment variables
`AV_API_KEY` - API Key for alphavantage. Free keys can be obtained from their webiste
`MYSQL_PASS` - Password to MySQL database
`MYSQL_URL` - (Optional) custom JDBC connect string
`GOOGLE_APPLICATION_CREDENTIALS` - Path to JSON file containing Google credentials for Firestore. Supplied automatically in Google environments
`QUOTES_ADMIN` - Enable quotes admin web API
