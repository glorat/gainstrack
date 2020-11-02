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

### Consuming as a library
```bash
npm login --registry=https://npm.pkg.github.com --scope=@glorat
npm install @glorat/gainstrack
```

### Regenerating icons
Generate a high-res PNG from the SVG input then use icongenie to generate the rest
```bash
svgexport boglebot.svg boglebot.png 1024:1024
icongenie generate -i boglebot.png
rm boglebot.png
```
If needed, you'll need to install pre-requisites
```bash
npm install -g svgexport @quasar/icongenie
```
