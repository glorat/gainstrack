package com.gainstrack.command
import com.gainstrack.core.AccountId

trait CommandOptions {

  protected def boolStr(name: String, value: Boolean): Seq[String] = {
    if (value) Seq(s"  ${name}:true") else Seq()
  }

  protected def acctStr(name: String, value: Option[AccountId]): Seq[String] = {
    value.map(x => Seq(s"  ${name}: ${x.toGainstrack}")).getOrElse(Seq())
  }

  protected def stringStr(name: String, value: String): Seq[String] = {
    if (value == "") Seq() else Seq(s"  ${name}: ${value}")
  }

  protected def stringToBool(valueStr: String): Boolean = valueStr != "false"
}
