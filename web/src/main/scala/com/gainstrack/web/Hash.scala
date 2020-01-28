package com.gainstrack.web

// This class was copied from dlcrypto project
// Licensed directly to this project but otherwise
// licensed for distribution under LGPL 2.1

case class Hash(inner: Seq[Byte]) {
  def getBytes: Seq[Byte] = inner

  def toArray: Array[Byte] = {
    try {
      getBytes.toArray
    } catch {
      case e: Exception => throw e
    }

  }

  def toHex: String = bytesToHexString(inner.toArray)

  private def bytesToHexString(bytes: Array[Byte]): String = {
    val buf = new StringBuffer(bytes.length * 2)
    for (b <- bytes) {
      val s = Integer.toString(0xFF & b, 16)
      if (s.length() < 2)
        buf.append('0')
      buf.append(s)
    }
    buf.toString
  }
}

object Hash {
  def fromHex(s: String): Hash = {
    Hash(parseHexBinary(s))
  }

  def parseHexBinary(s: String): Array[Byte] = {
    val len = s.length
    // "111" is not a valid hex encoding.
    if (len % 2 != 0) throw new IllegalArgumentException("hexBinary needs to be even-length: " + s)
    val out = new Array[Byte](len / 2)
    var i = 0
    while ( {
      i < len
    }) {
      val h = hexToBin(s.charAt(i))
      val l = hexToBin(s.charAt(i + 1))
      if (h == -1 || l == -1) throw new IllegalArgumentException("contains illegal character for hexBinary: " + s)
      out(i / 2) = (h * 16 + l).toByte

      i += 2
    }
    out
  }

  private def hexToBin(ch: Char): Int = {
    if ('0' <= ch && ch <= '9') return ch - '0'
    if ('A' <= ch && ch <= 'F') return ch - 'A' + 10
    if ('a' <= ch && ch <= 'f') return ch - 'a' + 10
    -1
  }
}

