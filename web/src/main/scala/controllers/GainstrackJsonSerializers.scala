package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.core._
import org.json4s.CustomSerializer
import org.json4s.JsonAST.JString

object GainstrackJsonSerializers {
  def all = Seq(LocalDateSerializer, AssetIdSerializer, AccountIdSerializer)
}

object AssetIdSerializer extends CustomSerializer[AssetId] (format => ({
  case JString(str) => AssetId(str)
}, {
  case value: AssetId => {
    JString(value.symbol)
  }
}
))

object AccountIdSerializer extends CustomSerializer[AccountId] (format => ({
  case JString(str) => AccountId(str)
}, {
  case value: AccountId => {
    JString(value.n)
  }
}))

object LocalDateSerializer extends CustomSerializer[LocalDate](format => ({
  case JString(str) => LocalDate.parse(str)
}, {
  case value: LocalDate  => {
    val formatter = DateTimeFormatter.ofPattern("YYYY-MM-dd")
    JString(formatter.format(value))
  }
}
))