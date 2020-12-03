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

`MYSQL_URL` - (Optional) custom JDBC connect string. Examples include (check region carefully)
- `jdbc:mysql:///cloudsql/gainstrack:asia-east2:gainstrack-hk`
- `jdbc:mysql://google/quotes?cloudSqlInstance=gainstrack:asia-east2:gainstrack-hk&socketFactory=com.google.cloud.sql.mysql.SocketFactory`

`GOOGLE_APPLICATION_CREDENTIALS` - Path to JSON file containing Google credentials for Firestore. Supplied automatically in Google environments

`QUOTES_ADMIN` - Enable quotes admin web API

`AUTH0_DOMAIN` - e.g gainstrack.auth0.com
`AUTH0_AUDIENCE` - e.g. https://poc.gainstrack.com
`AUTH0_CLIENT` - e.g. UjVvEmeNTbgIEU6g60h1xvvvBPL4vJqi

### Build instructions

Front end client build can be built locally with
```bash
cd client
quasar build
```


Full single build of backend app server image can be built and submitted with
`gcloud builds submit --config cloudbuild.yaml`
This will also update the latest image in the container registry

#### Faster build isntructions
A newer build system allows the creation of base images to speed the build of the final image

Base images should be regenerated when dependencies change
```bash
gcloud builds submit --config nodebase.cloudbuild.yaml
gcloud builds submit --config scalabase.cloudbuild.yaml
gcloud builds submit --config runtime.cloudbuild.yaml
```

The incremental gainstrack image can be built (with a faster CPU) as follows
```bash
gcloud builds submit --machine-type=N1_HIGHCPU_8 --config fast.cloudbuild.yaml
```
which will update the latest image in the container registry

### Deployment

App server
```bash
gcloud run deploy appserver \
          --region asia-northeast1 \
          --image gcr.io/gainstrack/gainstrack \
          --platform managed \
          --allow-unauthenticated \
          --project gainstrack && \
gcloud run services update-traffic appserver --platform managed --region asia-northeast1 --to-latest
```
TODO: After deployment, the FX cache in the server needs priming or the first wave of calls will timeout with a 429 HTTP error

Quotes server
```bash
gcloud run deploy quotes \
          --region asia-northeast1 \
          --image gcr.io/gainstrack/gainstrack \
          --platform managed \
          --allow-unauthenticated \
          --project gainstrack
```
Front-end
```bash
cd client
quasar build && firebase deploy --only hosting:poc
```
And for production
```bash
firebase deploy --only hosting:prod
```