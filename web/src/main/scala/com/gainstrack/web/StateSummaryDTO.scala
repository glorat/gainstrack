package com.gainstrack.web

import java.time.LocalDate

import com.gainstrack.command.AccountCreation
import com.gainstrack.core.{AccountId, AssetId}

case class StateSummaryDTO(
                            accountIds:Seq[AccountId],
                            accounts:Seq[AccountCreation],
                            ccys:Seq[AssetId],
                            conversion:String,
                            latestDate: LocalDate,
                            dateOverride:Option[LocalDate],
                            authentication: AuthnSummary
                          )

case class AuthnSummary(
                       username: Option[String] = None,
                       error:String = ""
                       )