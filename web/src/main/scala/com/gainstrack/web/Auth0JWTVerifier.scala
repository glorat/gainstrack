package com.gainstrack.web

import java.io.{InputStream, StringReader}
import java.security.interfaces.RSAPublicKey

import com.auth0.jwk.{Jwk, UrlJwkProvider}
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.interfaces.DecodedJWT
import com.fasterxml.jackson.databind.ObjectMapper

class Auth0JWTVerifier(config: Auth0Config) {
  val issuer = s"https://${config.domain}/"

  // val provider = new UrlJwkProvider(issuer)
  val provider = new Auth0SavedJwkProvider(issuer)

  def validate(token: String): DecodedJWT = {
    val decoded = JWT.decode(token)
    val keyId = decoded.getKeyId
    // UrlJwkProvider goes to the internet for latest keys which may not be desirable
    // Auth0SavedJwkProvider hardcodes the public key
    // Major pros/cons involved
    // @see provider
    val keyInfo = provider.get(keyId)
    val publicKey = keyInfo.getPublicKey.asInstanceOf[RSAPublicKey]
    val algorithm = Algorithm.RSA256(publicKey, null)
    val verifier = JWT.require(algorithm)
      .withIssuer(issuer)
      .withAudience(config.audience)
      .build

    val jwt = verifier.verify(token)
    jwt

  }
}


class Auth0SavedJwkProvider(issuer: String) extends UrlJwkProvider(issuer) {
  val DEVELOPMENT = "{\"keys\":[{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"uwJ2mbwlngBXiCldwv22pZYd9sDJT8Cc_f8I76a4-Czrz00WvmkfS7Do1pbzU7hEqGTjGXPyLQ5L5SyI9HegvhRVjE49MVAtz4ojgUo9oniNkBdbwxqeudYPueQj8-lBl8rb-r3RjoWFk0OZEkQ1XEieyYwvkUM0CKffw0ks8n5R-6Nh0FMYIzGPIQdHyo6HFcniluQFNCoVDmrdTZsrypmFImleW0iXdWpMBn4Yg4_TU8Tm-8EmU8tFE6lU-SxmwsWsxMK1Ps0bQ9D7fyV7kbxHI9lWu8jTx6F0kXtS6mHuKAVOhIWVpdTjpJ_n-YJlM1OesL2mB8jRFqDKMBoq_w\",\"e\":\"AQAB\",\"kid\":\"OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA\",\"x5t\":\"OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA\",\"x5c\":[\"MIIDBzCCAe+gAwIBAgIJQG2yarku7ha+MA0GCSqGSIb3DQEBCwUAMCExHzAdBgNVBAMTFmRldi1xLTE3MmFsMC5hdXRoMC5jb20wHhcNMTkxMjE5MDY0MTI4WhcNMzMwODI3MDY0MTI4WjAhMR8wHQYDVQQDExZkZXYtcS0xNzJhbDAuYXV0aDAuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuwJ2mbwlngBXiCldwv22pZYd9sDJT8Cc/f8I76a4+Czrz00WvmkfS7Do1pbzU7hEqGTjGXPyLQ5L5SyI9HegvhRVjE49MVAtz4ojgUo9oniNkBdbwxqeudYPueQj8+lBl8rb+r3RjoWFk0OZEkQ1XEieyYwvkUM0CKffw0ks8n5R+6Nh0FMYIzGPIQdHyo6HFcniluQFNCoVDmrdTZsrypmFImleW0iXdWpMBn4Yg4/TU8Tm+8EmU8tFE6lU+SxmwsWsxMK1Ps0bQ9D7fyV7kbxHI9lWu8jTx6F0kXtS6mHuKAVOhIWVpdTjpJ/n+YJlM1OesL2mB8jRFqDKMBoq/wIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBRDjxPSY7/thdmTuy2wScp7AyFiTzAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEBABmUdUFKNIN8/P6g1iiOS9yT8YrQ8HeVZB1WqrgIvJGyMoM6jBiJDdihb9xmkzHCciJtRlPDNMQAo/gzKxizyZOFZgnXdW3UEHfqgcoJ2AlvNCwQ2i2Z9VvVoFk/KXlW+PnqWJNmklnNi1o21ba+RQqtxGxRFBw3A5D26rDjmakcJsffSIiI5WO1mfOiQkc0JNogLicAZzZtr5GkXjwlMTK6UbUwQwgorRp3vTA8XWh/+5WV83XRV23r2o3w3hNHnoiqo/8gbE4TfPPiX9EVehSac+/yyUtZ31xG/Dhyw66iLx21EexsRO/TPFcN+LIHIM1Y4/vUi0qY4Hmng1aqDNY=\"]}]}"
  val PRODUCTION = "{\"keys\":[{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"2SLtNQsMeVTkfcLM0QOoQcMY2BvWHAQP0pZIUO4P5FdH_mOMiSCaf_ZizTRH4uP7wl3ROvKecFaHI8Ew0iEeMrsFYq0UNYuTXKhERt8_IShdEVxPvyxWHkhyRugnNNjv_GVFE-2NAAQJhxNq_yUutkcyJdLZ6ZP3Mwn1BSsxRw5-lb3sYphdWdapZz2gRhtl8V2Lqk7qhjFewgleWW5Ls2-hb2NzpZUFW7rBb07GQF09fZYbKK5i61pj7uaIbfbNvWIRTyCb-Z4s8xvXSYizOCusVHw5HS0_efnwIqsK-STmpxM9Wn2VQ5hwmfYkT2JDzkGB1McSqDOB2Vfn4NJnRQ\",\"e\":\"AQAB\",\"kid\":\"MjExNjIxNDExRTI1MzVBQjhBN0MzRTNFRERDNzYxOEIzMEIzMTQyMA\",\"x5t\":\"MjExNjIxNDExRTI1MzVBQjhBN0MzRTNFRERDNzYxOEIzMEIzMTQyMA\",\"x5c\":[\"MIIDAzCCAeugAwIBAgIJB65x6YTnAaHfMA0GCSqGSIb3DQEBCwUAMB8xHTAbBgNVBAMTFGdhaW5zdHJhY2suYXV0aDAuY29tMB4XDTIwMDEyOTAzMTg1MVoXDTMzMTAwNzAzMTg1MVowHzEdMBsGA1UEAxMUZ2FpbnN0cmFjay5hdXRoMC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDZIu01Cwx5VOR9wszRA6hBwxjYG9YcBA/SlkhQ7g/kV0f+Y4yJIJp/9mLNNEfi4/vCXdE68p5wVocjwTDSIR4yuwVirRQ1i5NcqERG3z8hKF0RXE+/LFYeSHJG6Cc02O/8ZUUT7Y0ABAmHE2r/JS62RzIl0tnpk/czCfUFKzFHDn6VveximF1Z1qlnPaBGG2XxXYuqTuqGMV7CCV5Zbkuzb6FvY3OllQVbusFvTsZAXT19lhsormLrWmPu5oht9s29YhFPIJv5nizzG9dJiLM4K6xUfDkdLT95+fAiqwr5JOanEz1afZVDmHCZ9iRPYkPOQYHUxxKoM4HZV+fg0mdFAgMBAAGjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFKtLEXFyXEX/gvCW0pDRh1Why/XsMA4GA1UdDwEB/wQEAwIChDANBgkqhkiG9w0BAQsFAAOCAQEAzqB4kGrmUA96asBeDRmJLRIqrybir1U+THIAkQVZ8ga0gaWvC/ob33Gqt+KFo8pmeHE2DH3tYip3ciUML4hM8dCPxq9n4zOEj4kK999yw+O9TvtEZ6NAbQKrJASORbmx+Ikd40BASpz3DNn9yarpHt4yjf7xVzeW4RoR1HCZzLCnWhBG9lptHF4yKAQdoQh049y39fPCULuuKcAdM219eby3nRik5Fl7Hh1TGL+IIfVzb0YRwWp5vbvijblA9O4ERa0ca4HYAZH6GG7aGHFoqst8avNzV7HhfN5k2BfgPBrV7eeEQXCc9IrH+AEhWhaX79QizxGHcerxBU40UTrd3g==\"]}]}"
  val PRODUCTION_JP = "{\"keys\":[{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"vWbcZt8CzrZBBhLNvl1s7l_pF8P--CjTSrL5rBxtiwp8D-KjwePnPtHjq4gT5yb-JSQSdfPWPIFR14kWPilCZzZ7wgW8OR1Xv4jKmzP9ysVy7CwlY8LXZMQ4-yieBHQOjEht5baRUUNd64Y2op7IP5IWA3yFJxaJ4Suj0mN5tdx3vTQX4c8fGIAbZCA6aHWMXnMEUfkiGGZSYv9jdA1K_decLr3qro-6f97n9mzm5zdf9u0iDRIuLV2Seocdh5UwlK5Kisc_pAH83Cu6JDSwXtoNRGcir9ko-LxToJTUH7O9HJ6vo5Rzpst-t2q8PPmrPznDMuXQajJhQC6lXJvwNw\",\"e\":\"AQAB\",\"kid\":\"o4YQCWsjvS1ZDtsnW1kai\",\"x5t\":\"4gjqljd49YHtFIdAQ_00CQQFCyI\",\"x5c\":[\"MIIDCTCCAfGgAwIBAgIJfxKW5G4PYfh7MA0GCSqGSIb3DQEBCwUAMCIxIDAeBgNVBAMTF2dhaW5zdHJhY2suanAuYXV0aDAuY29tMB4XDTIwMTIyMTEyNTI1MloXDTM0MDgzMDEyNTI1MlowIjEgMB4GA1UEAxMXZ2FpbnN0cmFjay5qcC5hdXRoMC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC9Ztxm3wLOtkEGEs2+XWzuX+kXw/74KNNKsvmsHG2LCnwP4qPB4+c+0eOriBPnJv4lJBJ189Y8gVHXiRY+KUJnNnvCBbw5HVe/iMqbM/3KxXLsLCVjwtdkxDj7KJ4EdA6MSG3ltpFRQ13rhjainsg/khYDfIUnFonhK6PSY3m13He9NBfhzx8YgBtkIDpodYxecwRR+SIYZlJi/2N0DUr915wuvequj7p/3uf2bObnN1/27SINEi4tXZJ6hx2HlTCUrkqKxz+kAfzcK7okNLBe2g1EZyKv2Sj4vFOglNQfs70cnq+jlHOmy363arw8+as/OcMy5dBqMmFALqVcm/A3AgMBAAGjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFB9OH5Z6329jQrsvFezFAv+t4GhtMA4GA1UdDwEB/wQEAwIChDANBgkqhkiG9w0BAQsFAAOCAQEAV0klXfk0UCO3q4an/maFpE5jA4N5Y9wzgjDX+10AOtZir/C4Z31ufu/iQZ6W4mdpDwRh8nYUrPRFzNUowLnSmIs518JhxeAIFbIO7pAhezdO5llGRVFQvaa3NLoNE+moPOBM7wt8nSbKjH1EWTW2LKFu4ZQt25ymffEzQbG79Dm9NMz+7vTjSyJx978QsUE+xO8xy74+KfH0EwqfqzvaFUZoX1K4uF5w79pejfPyl+iAHdb6D4ZbmGUxrMDZsBsNLlWaE1zN1DQfkc4UUTYaXYPGfgZTxdC5M9cq5EcUMtNUvCRO3OsWRNf97a+uLMDp/9LwYBOD+DJgU5hPOLCmMQ==\"]},{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"qRImfVKOZgr88uIqIkouyKBa-cgrmssgSGGnohiLko55Jc05cbUpCjKeMudEnomq5uK35moKHupUJ8i14VI79CZJnvyG19-VywSCmh__cvRD6NHs5dIOxm6LvVSzIIfUT8-DeiA7h8qdL0OBMKUbvq8vvldPbD7lJjWRgLUwF1KV9JbWzcKL8gLolt0eVr18HtYcNHggh1iNJ_7Na8Nju4Fd3Ku0rHdwAEo7GVciXLYRDLjN4kaHsuWmaraxWNMeLCz7cp3eb5jOt_w1TzE0wHA7bRJM2JdpNlP5ZugFFzMQdSompM4z8cHaR9ps1sx3fCsthgjUa15tHuaezSmaRw\",\"e\":\"AQAB\",\"kid\":\"9UwHfpUT-dPnDH94iRmnt\",\"x5t\":\"xc03rcTdVpUp9iEYuBjLukqIe4I\",\"x5c\":[\"MIIDCTCCAfGgAwIBAgIJc6JHJ3k/vOFAMA0GCSqGSIb3DQEBCwUAMCIxIDAeBgNVBAMTF2dhaW5zdHJhY2suanAuYXV0aDAuY29tMB4XDTIwMTIyMTEyNTI1MloXDTM0MDgzMDEyNTI1MlowIjEgMB4GA1UEAxMXZ2FpbnN0cmFjay5qcC5hdXRoMC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCpEiZ9Uo5mCvzy4ioiSi7IoFr5yCuayyBIYaeiGIuSjnklzTlxtSkKMp4y50Seiarm4rfmagoe6lQnyLXhUjv0Jkme/IbX35XLBIKaH/9y9EPo0ezl0g7Gbou9VLMgh9RPz4N6IDuHyp0vQ4EwpRu+ry++V09sPuUmNZGAtTAXUpX0ltbNwovyAuiW3R5WvXwe1hw0eCCHWI0n/s1rw2O7gV3cq7Ssd3AASjsZVyJcthEMuM3iRoey5aZqtrFY0x4sLPtynd5vmM63/DVPMTTAcDttEkzYl2k2U/lm6AUXMxB1KiakzjPxwdpH2mzWzHd8Ky2GCNRrXm0e5p7NKZpHAgMBAAGjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFDS0vTs5r6bJN0ss/L9jNSuJ+uPCMA4GA1UdDwEB/wQEAwIChDANBgkqhkiG9w0BAQsFAAOCAQEAcJ1cMK6IOZQERXEj4zc9Ssym4s2zY22RdQLndkB8ZOOuu5R/5ilxAk7SKwhvhrxSPiPY7Mjyg1JFXpdFXR3aImWWwm+m9nn0vGv4jyVRMBdvMKGxax0pXoEMJatIfkbUbj8jaD87ejL1i+9YA2CXu+W+8AMiXK9M5h1ANvvreZ9j9R2Pt1MtO80B7SW7gMGTYzhASkvqY9exNQel8weK/b+/9ISp/HyC6Y58uBWYsZHCttibi8jUQjV0n8v3EeZh1YHZIzdiRInjPPT0y92FpRt3hBi5HnbnQ2liDfXulu6ZmkTNcwgOO8/UvTIcdtf9lqneUkqJkTU+FPz+Tx4+4Q==\"]}]}"

  protected val KEYS = Map(
    "https://dev-q-172al0.auth0.com/" -> DEVELOPMENT,
    "https://gainstrack.auth0.com/" -> PRODUCTION,
    "https://gainstrack.jp.auth0.com/" -> PRODUCTION_JP
  )
  require(KEYS.contains(issuer), s"${issuer} not saved in SavedJwkProvider")

  override def getAll: java.util.List[Jwk] = {
    import java.util
    import java.util.{List, Map}
    import com.google.common.collect.Lists
    import scala.jdk.CollectionConverters._

    val inputStream = new StringReader(KEYS(issuer))
    val reader = new ObjectMapper().readerFor(classOf[Map[String, Object]]);
    val map:Map[String,Object] = reader.readValue(inputStream)
    val keys = map.get("keys").asInstanceOf[util.List[util.Map[String, AnyRef]]].asScala
    val jwks:List[Jwk] = Lists.newArrayList()

    for (values <- keys) {
      jwks.add(Jwk.fromValues(values))
    }
    jwks

  }

}