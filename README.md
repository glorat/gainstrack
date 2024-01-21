### Overview
Gainstrack is 

The following guide is targeted for developers. For user help, please visit [Gainstrack Help](http://www.gainstrack.com/help)

### Developer notes

To proxy a mysql instance in google cloud as localhost:

`cloud-sql-proxy -c ./gainstrack-firebase-adminsdk-some-id.json gainstrack:asia-northeast1:gainstrack-tk`

#### Environment variables
`AV_API_KEY` - API Key for alphavantage. Free keys can be obtained from their website

`MYSQL_PASS` - Password to MySQL database

`MYSQL_URL` - (Optional) custom JDBC connect string. Examples include (check region carefully)
- `jdbc:mysql:///cloudsql/gainstrack:asia-east2:gainstrack-hk`
- `jdbc:mysql://google/quotes?cloudSqlInstance=gainstrack:asia-east2:gainstrack-hk&socketFactory=com.google.cloud.sql.mysql.SocketFactory`

`GOOGLE_APPLICATION_CREDENTIALS` - Path to JSON file containing Google credentials for Firestore. Supplied automatically in Google environments

`QUOTES_ADMIN` - Enable quotes admin web API

`AUTH0_DOMAIN` - e.g gainstrack.auth0.com
`AUTH0_AUDIENCE` - e.g. https://poc.gainstrack.com
`AUTH0_CLIENT` - e.g. UjVvEmeNTbgIEU6g60h1xvvvBPL4vJqi

### Development instructions
The following all need to be running
#### Back-end
Open the project in IntelliJ or other IDE and run JettyLauncher. Set environment variables as needed by application.conf or override application.conf

#### Cloud functions
```bash
export DEV=true
export GOOGLE_APPLICATION_CREDENTIALS=...
cd client/functions
npm run serve
```

#### Front-end
```bash
cd client
npm run serve
```
Or open `client` in your IDE and run `npm serve` from there


### Build instructions

Front end client build can be built locally with
```bash
cd client
quasar build
```

Full single build of backend app server image can be built and submitted with
`gcloud builds submit --config cloudbuild.yaml`
This will also update the latest image in the container registry

#### Faster build instructions
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

#### Functions
```bash
cd client/functions
firebase deploy --only functions
```

#### Functions (TBD)
```bash
gcloud functions deploy investpy --runtime python38 --trigger-http --allow-unauthenticated --region=asia-northeast1
```
Test with:

https://asia-northeast1-gainstrack.cloudfunctions.net/investpy?ticker=VWRD&marketRegion=LN