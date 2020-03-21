package com.gainstrack.web

import java.math.MathContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.core._
import com.gainstrack.lifecycle.{InstantSerializer, UUIDSerializer}
import org.json4s.CustomSerializer
import org.json4s.JsonAST.{JDecimal, JString}

object GainstrackJsonSerializers {
  def all: Seq[CustomSerializer[_]] =
    Seq(LocalDateSerializer, AssetIdSerializer,
      AccountIdSerializer, FractionSerializer, UUIDSerializer, InstantSerializer)
}

object AssetIdSerializer extends CustomSerializer[AssetId] (_ => ({
  case JString(str) => AssetId(str)
}, {
  case value: AssetId => {
    JString(value.symbol)
  }
}
))

object AccountIdSerializer extends CustomSerializer[AccountId] (_ => ({
  case JString(str) => AccountId(str)
}, {
  case value: AccountId => {
    JString(value.n)
  }
}))


object FractionSerializer extends CustomSerializer[Fraction] (format => ({
  case JString(str) => ???
}, {
  case value: Fraction => {
    // JString(value.toBigDecimal(MathContext.DECIMAL64).toString)
    JDecimal(value.toBigDecimal(MathContext.DECIMAL64))
  }
}))


object LocalDateSerializer extends CustomSerializer[LocalDate](format => ({
  case JString(str) => LocalDate.parse(str)
}, {
  case value: LocalDate  => {
    JString(value.format(DateTimeFormatter.ISO_DATE))
  }
}
))
