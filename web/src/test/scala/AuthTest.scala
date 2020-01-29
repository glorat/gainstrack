import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.Date

import com.auth0.jwk.{JwkProviderBuilder, UrlJwkProvider}
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.TokenExpiredException
import com.auth0.jwt.{JWT, JWTDecoder, JWTVerifier}
import com.auth0.jwt.impl.JWTParser
import com.auth0.jwt.interfaces.{Clock, DecodedJWT}
import com.gainstrack.web.Auth0JWTVerifier
import org.scalatest.FlatSpec

class AuthTest extends FlatSpec {
  val token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik9URkRNMFV3UmpWQk5rTXpOVEJHUXpkRk9URTNRalF3TkRRME5UTTFPRU0yTlVGRE5rRXpNQSJ9.eyJpc3MiOiJodHRwczovL2Rldi1xLTE3MmFsMC5hdXRoMC5jb20vIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMDY5ODAxMTQ5MzM3NDQ2ODI4OTAiLCJhdWQiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiaHR0cHM6Ly9kZXYtcS0xNzJhbDAuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTU3Njc0MjM2MSwiZXhwIjoxNTc2ODI4NzYxLCJhenAiOiJVdVQ3ZWxxRTI2VzNnc0FYbWN1RGplVmlzeW9HY0JvViIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwifQ.k3TEl25k2G6CsEtzKjTRm4fAREfIz5OslNKcMDrfAM65sz3HglTiXGLpRV4itpmCcpXy9rYrZziniccdLPoOXpTE2i2sWRMsMM_QVsm91aI02nCN150jvG1cP4HuVU2tueTz0stJEXV3qrCs6d5Y1bTcZjIsFIN_eBFr4azl91hhe5oY4gHnUkM-zfpowwzuevNP-2APZWRHs5x7JoAweQ9PCwho1uRVKSOSI5t8HRvinX-0hr6O_4dVDlXo1MNYerjSinnlqd5JeEvhfG_gF0gOEOBJ8Q0oRlwdIpWzcod06n5GHyRv4g_rKQ_IkqnpXASkmMQ_nSxvkpYARzqR_g"
  val badtoken = token.dropRight(1)
  val audience = "http://localhost:8080"
  val auth0id = "dev-q-172al0"
  val issuer = s"https://${auth0id}.auth0.com/"

  val provider = new UrlJwkProvider(issuer)


  "Sample token" should "validate" in {
    import com.auth0.jwt.JWT
    import com.auth0.jwt.algorithms.Algorithm

    val decoded = JWT.decode(token)
    val keyId = decoded.getKeyId
    assert(keyId == "OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA")
    val keyInfo = provider.get(keyId)
    val publicKey = keyInfo.getPublicKey.asInstanceOf[RSAPublicKey]
    // val privateKey = keyInfo.getPrivateKey
    val algorithm = Algorithm.RSA256(publicKey, null)
    val verifier = JWT.require(algorithm)
      .withIssuer(issuer)
      .withAudience(audience)
      // .build
      .asInstanceOf[JWTVerifier.BaseVerification]
      .build(new Clock {
        override def getToday: Date = Date.from(Instant.parse("2019-12-20T00:00:00Z"))
      })

    val jwt = verifier.verify(token)

    // This is me!
    assert(jwt.getSubject == "google-oauth2|106980114933744682890")

  }

  it should "detect expired in" in {
    val decoded = JWT.decode(token)
    val keyId = decoded.getKeyId
    assert(keyId == "OTFDM0UwRjVBNkMzNTBGQzdFOTE3QjQwNDQ0NTM1OEM2NUFDNkEzMA")
    val keyInfo = provider.get(keyId)
    val publicKey = keyInfo.getPublicKey.asInstanceOf[RSAPublicKey]
    // val privateKey = keyInfo.getPrivateKey
    val algorithm = Algorithm.RSA256(publicKey, null)
    val verifier = JWT.require(algorithm)
      .withIssuer(issuer)
      .withAudience(audience)
      .build

    assertThrows[TokenExpiredException] {
      val jwt = verifier.verify(token)
    }
  }

  "com.gainstrack.web.Auth0JWTVerifier" should "detect expired" in {
    val validator = new Auth0JWTVerifier(auth0id, audience)
    assertThrows[TokenExpiredException] {
      val jwt = validator.validate(token)
    }
  }

}


