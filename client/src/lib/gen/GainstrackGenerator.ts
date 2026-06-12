// Orchestrator: gainstrack text -> the AllState fields this slice produces (accounts, txs).
// Mirrors the multi-pass `GainstrackGenerator.scala`. FX/prices/assetState are later slices.

import { AccountCommandDTO, AccountDTO, AllState, AssetDTO, AuthenticationDTO, BalanceStateSeries, PriceState, Transaction } from 'src/lib/assetdb/models';
import { GainstrackParser, ParserMessage } from 'src/lib/GainstrackParser';
import { buildAccountState } from 'src/lib/gen/accountState';
import { buildFxMappers, GAssetState } from 'src/lib/gen/assetState';
import { GBalanceState } from 'src/lib/gen/balanceState';
import { buildCommands, GCommand } from 'src/lib/gen/commands';
import { generateTradeFx, TradeFxDTO } from 'src/lib/gen/fxChain';
import { GPriceState } from 'src/lib/gen/priceState';
import { buildTransactions } from 'src/lib/gen/transactionState';

export interface GeneratedState {
  accounts: AccountDTO[];
  txs: Transaction[];
  balances: Record<string, BalanceStateSeries>;
  priceState: PriceState;
  assetState: AccountCommandDTO[];
  fxMapper: Record<string, string>;
  proxyMapper: Record<string, string>;
  ccys: string[];
  baseCcy: string;
  tradeFx: TradeFxDTO;
}

export function generateFromCommands(commands: GCommand[]): GeneratedState {
  const acctState = buildAccountState(commands);
  const accounts = acctState.withInterpolatedAccounts().toAccountDTOs();
  const balanceState = GBalanceState.build(commands, acctState);
  const txs = buildTransactions(commands, acctState, balanceState);
  const balances = balanceState.toBalancesDTO();

  const priceStateObj = GPriceState.build(commands, acctState);
  const assetStateObj = GAssetState.build(commands);
  const { fxMapper, proxyMapper } = buildFxMappers(assetStateObj);

  return {
    accounts, txs, balances,
    priceState: priceStateObj.toDTO(),
    assetState: assetStateObj.toDTO(),
    fxMapper, proxyMapper,
    ccys: [...priceStateObj.ccys].sort(),
    baseCcy: acctState.baseCurrency,
    tradeFx: generateTradeFx(priceStateObj, acctState.baseCurrency),
  };
}

export function generate(text: string): GeneratedState {
  const parser = new GainstrackParser();
  parser.parseString(text);
  const commands = buildCommands(parser.getTypedCommands());
  return generateFromCommands(commands);
}

function assembleAllState(parser: GainstrackParser, authentication: AuthenticationDTO): AllState {
  const commands = parser.getCommands();
  const gen = generateFromCommands(buildCommands(parser.getTypedCommands()));
  return {
    accounts: gen.accounts,
    commands,
    assetState: gen.assetState as unknown as AssetDTO[],
    balances: gen.balances,
    txs: gen.txs,
    priceState: gen.priceState,
    tradeFx: gen.tradeFx,
    fxMapper: gen.fxMapper,
    proxyMapper: gen.proxyMapper,
    baseCcy: gen.baseCcy,
    ccys: gen.ccys,
    authentication,
  };
}

export interface GenAllStateResult {
  state?: AllState;
  errors: ParserMessage[];
}

// Build a full AllState locally from gainstrack text, surfacing parse/generation errors instead
// of throwing — for the paste-and-run scratchpad.
export function generateAllStateSafe(text: string, authentication: AuthenticationDTO = { username: '' }): GenAllStateResult {
  const parser = new GainstrackParser();
  try {
    parser.parseString(text);
  } catch {
    const errors = parser.parserErrors.length ? parser.parserErrors : [{ message: 'Parse failed', line: 0, input: '' }];
    return { errors };
  }
  try {
    return { state: assembleAllState(parser, authentication), errors: [] };
  } catch (e) {
    return { errors: [{ message: e instanceof Error ? e.message : String(e), line: 0, input: '' }] };
  }
}
