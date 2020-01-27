package com.gainstrack.web

import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
object
Pbkdf2 {

  def encode(password: String, salt: String) : String = {
    toHex(getEncryptedPassword(password, salt))
  }

  private def getEncryptedPassword(password: String, salt: String, iterations: Int = 4096, derivedKeyLength: Int = 32): Array[Byte] = {
    val saltBytes = salt.getBytes
    val spec = new PBEKeySpec(password.toCharArray, saltBytes, iterations, derivedKeyLength * 8)
    val f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    f.generateSecret(spec).getEncoded
  }

  private def toHex(bytes: Array[Byte]) = {
    import java.math.BigInteger
    val bi = new BigInteger(1, bytes)
    String.format("%0" + (bytes.length << 1) + "x", bi)
  }
}
