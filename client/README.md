### Development environment
This project was set up with vue-cli so all standard commands should work such as
`npm run serve`

### Docker compile
In order to consistently generate a reproducible build, a Dockerfile has been provided to generate the production output. Since the result is just static files with no server, the results need to be extracted manually.

The following commands can be used

```bash
docker build . -t gainstrack-client
cd /your/path
docker run -u$UID -v $PWD:/dist gainstrack-client /bin/cp -R /build/dist/ /
```

to output the files to `/your/path` which can then be served by your webserver
