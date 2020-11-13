# Troubleshooting Guide
This covers some of the more esoteric and time consuming glitches that may occur. Hopefully if you find the issue here, it will save you hours of debugging

### Development errors
#### Netty related classloader issues
sbt assembly might not be merging the required META-INF properly. See sanityCheck for clues and review the MergeStrategy carefully

#### Google/Firestore not reachable
If you are using a VPN, DNS entries can get messed up. sanityCheck may help save you on this. `dscacheutil -flushcache` might be a useful command

### Production specific errors

#### HTTP 427 errors
The quotes db loading or other "priming" before serving a request is taking a long time, causing web requests to get queued and then rejected

#### Quotes returning empty
application.conf might have got accidentally committed with a change to source quotes from file system rather than the database

#### API requests not returning JSON
Apparently can be caused when certain uncaught exceptions happen. Exact root cause still unknown

#### API requests returning gibberish
Possibly same as previous