package com.gainstrack.web

import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

object Pbkdf2 {

  def encode(password: String, salt: String) : Hash = {
    Hash(getEncryptedPassword(password, salt).toSeq)
  }

  private def getEncryptedPassword(password: String, salt: String, iterations: Int = 4096, derivedKeyLength: Int = 32): Array[Byte] = {
    val saltBytes = salt.getBytes
    val spec = new PBEKeySpec(password.toCharArray, saltBytes, iterations, derivedKeyLength * 8)
    val f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    f.generateSecret(spec).getEncoded
  }

}
