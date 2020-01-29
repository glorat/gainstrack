package com.gainstrack.web

import java.io.{InputStream, StringReader}
import java.security.interfaces.RSAPublicKey

import com.auth0.jwk.{Jwk, UrlJwkProvider}
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.interfaces.DecodedJWT
import com.fasterxml.jackson.databind.ObjectMapper

class Auth0JWTVerifier(auth0id:String, audience: String) {
  val issuer = s"https://${auth0id}.auth0.com/"

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
      .withAudience(audience)
      .build

    val jwt = verifier.verify(token)
    jwt

  }
}


class Auth0SavedJwkProvider(issuer: String) extends UrlJwkProvider(issuer) {
  val DEVELOPMENT = "{\"keys\":[{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"uwJ2mbwlngBXiCldwv22pZYd9sDJT8Cc_f8I76a4-Czrz00WvmkfS7Do1pbzU7hEqGTjGXPyLQ5L5SyI9HegvhRVjE49MVAtz4ojgUo9oniNkBdbwxqeudYPueQj8-lBl8rb-r3RjoWFk0OZEkQ1XEieyYwvkUM0CKffw0ks8n5R-6Nh0FMYIzGPIQdHyo6HFcniluQFNCoVDmrdTZsrypmFImleW0iXdWpMBn4Yg4_TU8Tm-8EmU8tFE6lU-SxmwsWsxMK1Ps0bQ9D7fyV7kbxHI9lWu8jTx6F0kXtS6mHuKAVOhIWVpdTjpJ_n-YJlM1OesL2mB8jRFqDKMBoq_w\",\"e\":\"AQAB\",\"kid\":\"OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA\",\"x5t\":\"OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA\",\"x5c\":[\"MIIDBzCCAe+gAwIBAgIJQG2yarku7ha+MA0GCSqGSIb3DQEBCwUAMCExHzAdBgNVBAMTFmRldi1xLTE3MmFsMC5hdXRoMC5jb20wHhcNMTkxMjE5MDY0MTI4WhcNMzMwODI3MDY0MTI4WjAhMR8wHQYDVQQDExZkZXYtcS0xNzJhbDAuYXV0aDAuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuwJ2mbwlngBXiCldwv22pZYd9sDJT8Cc/f8I76a4+Czrz00WvmkfS7Do1pbzU7hEqGTjGXPyLQ5L5SyI9HegvhRVjE49MVAtz4ojgUo9oniNkBdbwxqeudYPueQj8+lBl8rb+r3RjoWFk0OZEkQ1XEieyYwvkUM0CKffw0ks8n5R+6Nh0FMYIzGPIQdHyo6HFcniluQFNCoVDmrdTZsrypmFImleW0iXdWpMBn4Yg4/TU8Tm+8EmU8tFE6lU+SxmwsWsxMK1Ps0bQ9D7fyV7kbxHI9lWu8jTx6F0kXtS6mHuKAVOhIWVpdTjpJ/n+YJlM1OesL2mB8jRFqDKMBoq/wIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBRDjxPSY7/thdmTuy2wScp7AyFiTzAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEBABmUdUFKNIN8/P6g1iiOS9yT8YrQ8HeVZB1WqrgIvJGyMoM6jBiJDdihb9xmkzHCciJtRlPDNMQAo/gzKxizyZOFZgnXdW3UEHfqgcoJ2AlvNCwQ2i2Z9VvVoFk/KXlW+PnqWJNmklnNi1o21ba+RQqtxGxRFBw3A5D26rDjmakcJsffSIiI5WO1mfOiQkc0JNogLicAZzZtr5GkXjwlMTK6UbUwQwgorRp3vTA8XWh/+5WV83XRV23r2o3w3hNHnoiqo/8gbE4TfPPiX9EVehSac+/yyUtZ31xG/Dhyw66iLx21EexsRO/TPFcN+LIHIM1Y4/vUi0qY4Hmng1aqDNY=\"]}]}"
  val PRODUCTION = "{\"keys\":[{\"alg\":\"RS256\",\"kty\":\"RSA\",\"use\":\"sig\",\"n\":\"2SLtNQsMeVTkfcLM0QOoQcMY2BvWHAQP0pZIUO4P5FdH_mOMiSCaf_ZizTRH4uP7wl3ROvKecFaHI8Ew0iEeMrsFYq0UNYuTXKhERt8_IShdEVxPvyxWHkhyRugnNNjv_GVFE-2NAAQJhxNq_yUutkcyJdLZ6ZP3Mwn1BSsxRw5-lb3sYphdWdapZz2gRhtl8V2Lqk7qhjFewgleWW5Ls2-hb2NzpZUFW7rBb07GQF09fZYbKK5i61pj7uaIbfbNvWIRTyCb-Z4s8xvXSYizOCusVHw5HS0_efnwIqsK-STmpxM9Wn2VQ5hwmfYkT2JDzkGB1McSqDOB2Vfn4NJnRQ\",\"e\":\"AQAB\",\"kid\":\"MjExNjIxNDExRTI1MzVBQjhBN0MzRTNFRERDNzYxOEIzMEIzMTQyMA\",\"x5t\":\"MjExNjIxNDExRTI1MzVBQjhBN0MzRTNFRERDNzYxOEIzMEIzMTQyMA\",\"x5c\":[\"MIIDAzCCAeugAwIBAgIJB65x6YTnAaHfMA0GCSqGSIb3DQEBCwUAMB8xHTAbBgNVBAMTFGdhaW5zdHJhY2suYXV0aDAuY29tMB4XDTIwMDEyOTAzMTg1MVoXDTMzMTAwNzAzMTg1MVowHzEdMBsGA1UEAxMUZ2FpbnN0cmFjay5hdXRoMC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDZIu01Cwx5VOR9wszRA6hBwxjYG9YcBA/SlkhQ7g/kV0f+Y4yJIJp/9mLNNEfi4/vCXdE68p5wVocjwTDSIR4yuwVirRQ1i5NcqERG3z8hKF0RXE+/LFYeSHJG6Cc02O/8ZUUT7Y0ABAmHE2r/JS62RzIl0tnpk/czCfUFKzFHDn6VveximF1Z1qlnPaBGG2XxXYuqTuqGMV7CCV5Zbkuzb6FvY3OllQVbusFvTsZAXT19lhsormLrWmPu5oht9s29YhFPIJv5nizzG9dJiLM4K6xUfDkdLT95+fAiqwr5JOanEz1afZVDmHCZ9iRPYkPOQYHUxxKoM4HZV+fg0mdFAgMBAAGjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFKtLEXFyXEX/gvCW0pDRh1Why/XsMA4GA1UdDwEB/wQEAwIChDANBgkqhkiG9w0BAQsFAAOCAQEAzqB4kGrmUA96asBeDRmJLRIqrybir1U+THIAkQVZ8ga0gaWvC/ob33Gqt+KFo8pmeHE2DH3tYip3ciUML4hM8dCPxq9n4zOEj4kK999yw+O9TvtEZ6NAbQKrJASORbmx+Ikd40BASpz3DNn9yarpHt4yjf7xVzeW4RoR1HCZzLCnWhBG9lptHF4yKAQdoQh049y39fPCULuuKcAdM219eby3nRik5Fl7Hh1TGL+IIfVzb0YRwWp5vbvijblA9O4ERa0ca4HYAZH6GG7aGHFoqst8avNzV7HhfN5k2BfgPBrV7eeEQXCc9IrH+AEhWhaX79QizxGHcerxBU40UTrd3g==\"]}]}"

  protected val KEYS = Map(
    "https://dev-q-172al0.auth0.com/" -> DEVELOPMENT,
    "https://poc.gainstrack.com/" -> PRODUCTION
  )
  require(KEYS.contains(issuer), s"${issuer} not saved in SavedJwkProvider")

  override def getAll: java.util.List[Jwk] = {
    import java.util
    import java.util.{List, Map}
    import com.google.common.collect.Lists

    val inputStream = new StringReader(KEYS(issuer))
    val reader = new ObjectMapper().readerFor(classOf[Map[String, Object]]);
    val map:Map[String,Object] = reader.readValue(inputStream)
    val keys = map.get("keys").asInstanceOf[util.List[util.Map[String, AnyRef]]]
    val jwks:List[Jwk] = Lists.newArrayList()
    import scala.collection.JavaConversions._
    for (values <- keys) {
      jwks.add(Jwk.fromValues(values))
    }
    jwks

  }

}