package com.gainstrack.report

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.command._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

import scala.collection.SortedSet


case class GainstrackGenerator(originalCommands:Seq[AccountCommand])  {
  assert(originalCommands == AccountCommand.sorted(originalCommands), "BUG: Invariant that originalCommands must be sorted")

  val startTime = Instant.now
  // Global
  val globalCommand: GlobalCommand = originalCommands.head match {
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
  implicit val acctState: AccountState = firstAcctState.copy(accounts = expander.acctState.accounts)

  // Second pass for balances
  implicit val balanceState:BalanceState =
    finalCommands.foldLeft(BalanceState(acctState)) ( (state,ev) => state.handle(ev))

  // Third pass for projections
  val fxChainMap: Map[AssetId,List[AssetId]] = priceState.toFxChainMap(acctState.baseCurrency)
  implicit val assetChainMap: AssetChainMap = AssetChainMap(acctState.withInterpolatedAccounts, priceState)
  implicit val dailyBalances: DailyBalance = new DailyBalance(balanceState)

  implicit val txState:TransactionState =
    finalCommands.foldLeft(TransactionState(acctState, balanceState, Seq())) ((state, ev) => state.handle(ev))
  implicit lazy val priceState: PriceState =
    finalCommands.foldLeft(PriceState())((state, ev) => state.handle(ev))
  implicit val assetState: AssetState =
    finalCommands.foldLeft(AssetState())(_.handle(_))
  val priceFXConverter = priceState.priceFxConverter
  val tradeFXConversion: SingleFXConversion = SingleFXConversion.generate(acctState.baseCurrency)(priceFXConverter, fxChainMap)
  val fxMapper: Map[AssetId, AssetId] = new FXMapperGenerator(assetState).fxMapper
  val proxyMapper: Map[AssetId,AssetId] = new FXMapperGenerator(assetState).proxyMapper
  val latestDate:LocalDate = finalCommands.maxBy(_.date).date
  val txOrigins: Seq[Int] = txState.cmds.map(_.origin).map(originalCommands.indexOf(_))
  val badOrigin: Int = txOrigins.indexOf(-1)
  // Invariant condition of linking beancountCommand back to accountCommand
  if (badOrigin >= 0) {
    val unknownCommand = txState.cmds(badOrigin).origin
    throw new IllegalStateException("Unmatched tx.origin: " + unknownCommand.toGainstrack.mkString("\n"));
  }

  val txs: Seq[Transaction] = txState.cmds.collect({ case tx: Transaction => tx })
  val origins: Seq[Int] = txs.map(_.origin).map(originalCommands.indexOf(_))
  val txDTOs: Seq[TransactionDTO] = txs.zip(origins).map(tup => tup._1.toDTO(tup._2))

  def allState:Map[String, Any] = {
    Map(
      "commands" -> originalCommands.map(_.toDTO),
      "accounts" -> acctState.withInterpolatedAccounts.accounts.toSeq.map(_.toAccountDTO),
      "balances" -> balanceState.balances,
      "txs" -> txDTOs,
      "priceState" -> priceState,
      "assetState" -> assetState.toDTO,
      "tradeFx" -> tradeFXConversion,
      "fxMapper" -> fxMapper, // Should be redundant one day
      "proxyMapper" -> proxyMapper, // Also should become redundant
      "baseCcy" -> acctState.baseCurrency,
      // FIXME: It is possible to have commands that don't register in priceState, particularly in base currency only!
      "ccys" -> priceState.ccys.toSeq.sorted
    )
  }

  val endTime = Instant.now

  def networth(date: LocalDate): PositionSet = {
    this.balanceState.totalPosition("Assets", date) - this.balanceState.totalPosition("Liabilities", date)
  }

  def generationDuration: Duration = Duration.between(startTime, endTime)

    //     val machine = new PriceCollector
  //    orderedCmds.foreach(cmd => {
  //      machine.applyChange(cmd)
  //    })
  //    machine
  def addCommand(newCmd:AccountCommand) : GainstrackGenerator = {
    // Check for merge conflict and resolution
    val newCmds = Seq.newBuilder[AccountCommand]
    originalCommands.foreach(cmd => {
      cmd.mergedWith(newCmd) match {
        case MergeConcat => newCmds +=cmd
        case MergeReplace => ()
        case MergeConflict => throw new IllegalArgumentException(s"Conflicts with ${cmd.toGainstrack}")
      }
    })
    val resolved = newCmds.result

    // Cannot use .contains because that seems to use a ref equals
    // whereas we want a value object equals
    require(!resolved.exists(_ == newCmd), "command already exists. Duplicates not allowed") // Redundant due to earlier merge checks
    GainstrackGenerator( AccountCommand.sorted(resolved :+ newCmd))
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
    val part2 = AccountCommand.sorted(part1 :+ cmd)
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

    override def comments: Seq[String] = ???
    override def withComments(newComments: Seq[String]): AccountCommand = ???
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

    var stdout = scala.collection.mutable.ListBuffer[String]()
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
      res.toSeq
    }
    else {
      Seq()
    }

  }

  def liveFxConverter(marketFx: SingleFXConversion): SingleFXConverter = {
    new FXChain(
      new FXMapped(this.fxMapper, marketFx),
      new FXProxy(this.proxyMapper, this.tradeFXConversion, marketFx),
      this.tradeFXConversion
    )
  }

  def writeGainstrackFile(filename:String): Unit = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets
    val str: String = toGainstrack
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }

  def toGainstrack: String = {
    val top = globalCommand
    val bottom = originalCommands.filter(_.mainAccount.isEmpty).filter(_ != globalCommand)

    val grp = originalCommands.filter(_.mainAccount.isDefined).toSeq.groupBy(_.mainAccount.get)
    val accids = grp.keys.toSeq.sorted
    val accountStrs = accids.map(grp(_).flatMap(_.toGainstrackWithComments).mkString("\n")).mkString("\n\n")
    val topStrs = top.toGainstrackWithComments.mkString("\n")
    val bottomStrs = bottom.toSeq.flatMap(_.toGainstrackWithComments).mkString("\n")
    s"${topStrs}\n\n${accountStrs}\n\n${bottomStrs}"
  }
}

