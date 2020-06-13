package com.gainstrack.web

import java.math.MathContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import com.gainstrack.lifecycle.{InstantSerializer, UUIDSerializer}
import com.gainstrack.report.AssetPair
import org.json4s.{CustomKeySerializer, CustomSerializer, Extraction}
import org.json4s.JsonAST.{JDecimal, JString}

object GainstrackJsonSerializers {
  def all: Seq[CustomSerializer[_]] =
    Seq(LocalDateSerializer, AssetIdSerializer, AssetPairSerializer,
      AccountIdSerializer, FractionSerializer, UUIDSerializer, InstantSerializer,
      AccountCreationSerializer)

  def allKeys: Seq[CustomKeySerializer[_]] = Seq(AccountIdKeySerializer, LocalDateKeySerializer, AssetIdKeySerializer, AssetPairKeySerializer)
}

object AssetIdSerializer extends CustomSerializer[AssetId] (_ => ({
  case JString(str) => AssetId(str)
}, {
  case value: AssetId => {
    JString(value.symbol)
  }
}
))

object AssetIdKeySerializer extends CustomKeySerializer[AssetId] (_ => ({
  case str => AssetId(str)
}, {
  case value: AssetId => {
    value.symbol
  }
}
))

object AssetPairSerializer extends CustomSerializer[AssetPair] (_ => ({
  case JString(str) => AssetPair(str)
}, {
  case value: AssetPair => {
    JString(value.str)
  }
}))

object AssetPairKeySerializer extends CustomKeySerializer[AssetPair] (_ => ({
  case str => AssetPair(str)
}, {
  case value: AssetPair => {
    value.str
  }
}))


object AccountIdSerializer extends CustomSerializer[AccountId] (_ => ({
  case JString(str) => AccountId(str)
}, {
  case value: AccountId => {
    JString(value.n)
  }
}))

object AccountIdKeySerializer extends CustomKeySerializer[AccountId](_ => ( {
  case s: String => {
    AccountId(s)
  }
}, {
  case x: AccountId => {
    x.n
  }
}
))

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

object LocalDateKeySerializer extends CustomKeySerializer[LocalDate](_ => ( {
  case s: String => {
    LocalDate.parse(s)
  }
}, {
  case x: LocalDate => {
    x.format(DateTimeFormatter.ISO_DATE)
  }
}
))

object AccountCreationSerializer extends CustomSerializer[AccountCreation](format => ({
  PartialFunction.empty
}, {
  case value: AccountCreation  => {
    implicit val formats = format
    Extraction.decompose(value.toDTO)
  }
}
))