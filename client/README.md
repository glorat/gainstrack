# Quasar App (gainstrack)

A Quasar Framework app

## Install the dependencies
```bash
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```

### Lint the files
```bash
npm run lint
```

### Build the app for production
```bash
quasar build
```


### Docker compile
In order to consistently generate a reproducible build, a Dockerfile has been provided to generate the production output. Since the result is just static files with no server, the results need to be extracted manually.

The following commands can be used

```bash
docker build . -t gainstrack-client
cd /your/path
docker run -u$UID -v $PWD:/dist gainstrack-client /bin/cp -R /build/dist/ /
```

to output the files to `/your/path` which can then be served by your webserver

### Customize the configuration
See [Configuring quasar.conf.js](https://quasar.dev/quasar-cli/quasar-conf-js).
