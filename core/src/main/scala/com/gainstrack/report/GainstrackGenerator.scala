package com.gainstrack.report

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.command._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

import scala.collection.SortedSet


case class GainstrackGenerator(originalCommands:Seq[AccountCommand])  {
  val startTime = Instant.now
  // Global
  val globalCommand = originalCommands.head match {
    case g:GlobalCommand => g
    case _ => GlobalCommand()
  }

  // First pass for accounts
  private val firstAcctState:AccountState =
    originalCommands.foldLeft(AccountState()) ((state, ev) => state.handle(ev))

  // Fill in defaulted accounts
  private val expander =
    originalCommands.foldLeft(CommandAccountExpander(firstAcctState)) ((state, ev) => state.handle(ev))
  val finalCommands = expander.cmds
  implicit val acctState = firstAcctState.copy(accounts = expander.acctState.accounts)

  // Second pass for balances
  implicit val balanceState:BalanceState =
    finalCommands.foldLeft(BalanceState(acctState)) ( (state,ev) => state.handle(ev))

  // Third pass for projections
  implicit val assetChainMap = AssetChainMap(acctState.withInterpolatedAccounts, priceState)
  implicit val dailyBalances = new DailyBalance(balanceState)

  implicit val txState:TransactionState =
    finalCommands.foldLeft(TransactionState(acctState, balanceState, Seq())) ((state, ev) => state.handle(ev))
  implicit lazy val priceState: PriceState =
    finalCommands.foldLeft(PriceState())((state, ev) => state.handle(ev))
  implicit val assetState: AssetState =
    finalCommands.foldLeft(AssetState())(_.handle(_))
  implicit val priceFXConverter = priceState.priceFxConverter
  val tradeFXConversion = SingleFXConversion.generate(acctState.baseCurrency)(priceFXConverter, assetChainMap)
  val fxMapper: Map[AssetId, AssetId] = new FXMapperGenerator(assetState).fxMapper
  val latestDate:LocalDate = finalCommands.maxBy(_.date).date

  val endTime = Instant.now

  def generationDuration: Duration = Duration.between(startTime, endTime)

    //     val machine = new PriceCollector
  //    orderedCmds.foreach(cmd => {
  //      machine.applyChange(cmd)
  //    })
  //    machine
  def addCommand(cmd:AccountCommand) : GainstrackGenerator = {
    // Cannot use .contains because that seems to use a ref equals
    // whereas we want a value object equals
    require(!originalCommands.exists(_ == cmd), "command already exists. Duplicates not allowed")
    GainstrackGenerator( originalCommands :+ cmd)
  }

  def removeCommand(cmd:AccountCommand): GainstrackGenerator = {
    require(originalCommands.contains(cmd), "command being removed doesn't exist")
    GainstrackGenerator(originalCommands.filterNot(_ == cmd))
  }

  /** Replaces any existing CommodityCommand referring to the asset with this */
  def addAssetCommand(cmd: CommodityCommand): GainstrackGenerator = {
    val assetId = cmd.asset
    // Remove existing matching commodities
    val part1 = originalCommands.filter(_ match {
      case c: CommodityCommand if c.asset == assetId => false
      case _ => true
    })
    // Add it
    val part2 = part1 :+ cmd
    // TODO: Should sorting be applied here just in case?
    // Normally parser would ensure sorted commands, although here, unsorted
    // CommodityCommand obviously doesn't matter
    GainstrackGenerator(part2)

  }

  case object GainstrackTemplate extends AccountCommand {
    def date: LocalDate = MinDate

    def commandString: String = ???

    def description: String = "System generated"

    def toGainstrack: Seq[String] = Seq("")

    def mainAccount: Option[AccountId] = None

    def involvedAccounts: Set[AccountId] = Set()

    def toPartialDTO: AccountCommandDTO = ???
  }

  def toBeancount: Seq[BeancountLine] = {
    val headers:Seq[BeancountLine] = BeancountLines(Seq (
      "option \"title\" \"Gainstrack\"",
      s"""option "operating_currency" "${globalCommand.operatingCurrency.symbol}"""",
      "plugin \"beancount.plugins.implicit_prices\""
    ), GainstrackTemplate)

    val accts:Seq[BeancountLine] = acctState.accounts.flatMap(_.toBeancount).toSeq
    val cmds:Seq[BeancountLine] = txState.cmds.map(_.toBeancount).flatten
    val lines:Seq[BeancountLine] = headers ++ accts ++ cmds

    lines
  }

  def writeBeancountFile(filename:String, cmdToLine:AccountCommand=>Int):Seq[ParserMessage] = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets
    import sys.process._

    val bcs = this.toBeancount
    val str = bcs.map(_.value).mkString("\n")
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))
    // Automatically check for correctness

    var stdout = scala.collection.mutable.MutableList[String]()
    val logger = ProcessLogger(line => stdout.+=(line), line=>stdout+=line )
    val exitCode = s"bean-check ${filename}" ! logger

    if (exitCode != 0) {
      val errLines = stdout.filter(_.startsWith(filename))
      val BcParse = (filename + raw":([0-9]+):\s+(.*)").r
      val orig = bcs
      val res = errLines.flatMap(line => {
        line match {
          case BcParse(lineNumber,message) => {
            val origin = orig(parseNumber(lineNumber).toInt-1).origin
            Some(ParserMessage(message, cmdToLine(origin), origin.toGainstrack.head, Some(origin)))
            // Some(origin.toGainstrack.mkString("\n") +"\n" + message)
          }
          case _ => None
        }

      })
      // throw new IllegalStateException("There are errors in the inputs\n" + res.mkString("\n"))
      res
    }
    else {
      Seq()
    }

  }

  def writeGainstrackFile(filename:String): Unit = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets
    val str: String = toGainstrack
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }

  def toGainstrack: String = {
    val top = globalCommand
    val bottom = originalCommands.filter(_.mainAccount.isEmpty)

    val grp = originalCommands.filter(_.mainAccount.isDefined).toSeq.groupBy(_.mainAccount.get)
    val accids = grp.keys.toSeq.sorted
    val accountStrs = accids.map(grp(_).flatMap(_.toGainstrack).mkString("\n")).mkString("\n\n")
    val topStrs = top.toGainstrack.mkString("\n")
    val bottomStrs = bottom.toSeq.flatMap(_.toGainstrack).mkString("\n")
    s"${topStrs}\n\n${accountStrs}\n\n${bottomStrs}"
  }
}

