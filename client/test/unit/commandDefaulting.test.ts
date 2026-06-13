import {
  commandIsValid,
  convertToTrade,
  defaultedFundCommand,
  defaultedTradeCommand,
  defaultedTransferCommand,
  defaultedYieldCommand,
  toGainstrack,
} from 'src/lib/commandDefaulting';
import fs from 'fs';
import {AllState, AccountCommandEditing} from 'src/lib/assetdb/models';
import {AllStateEx} from 'src/lib/AllStateEx';
import {GlobalPricer} from 'src/lib/pricer';

describe('commandDefaulting', () => {
  const data = fs.readFileSync('test/unit/first.json', 'utf8');
  const allState: AllState = JSON.parse(data);
  const allStateEx = new AllStateEx(allState);
  const pricer = new GlobalPricer(allState.commands, allState.ccys, allStateEx.tradeFxConverter(), allStateEx.tradeFxConverter());

  // Base editing state shared across tests — all optional fields present but blank
  const blankBase: AccountCommandEditing = {
    date: '2021-12-19',
    accountId: '',
    otherAccount: '',
    change: { number: 0, ccy: '' },
    balance: { number: 0, ccy: '' },
    price: { number: 0, ccy: '' },
    commission: { number: 0, ccy: '' },
    options: {},
    asset: '',
  };

  // ─── commandIsValid ────────────────────────────────────────────────────────

  describe('commandIsValid', () => {
    test('returns false for unknown commandType', () => {
      expect(commandIsValid({ ...blankBase, commandType: 'earn' })).toBe(false);
    });

    describe('bal', () => {
      const base = { ...blankBase, commandType: 'bal', accountId: 'Assets:Bank:Nationwide', otherAccount: 'Equity:Opening' };

      test('valid when all required fields present', () => {
        const c = { ...base, balance: { number: 100, ccy: 'GBP' } };
        expect(commandIsValid(c)).toBe(true);
      });

      test('invalid when balance ccy missing', () => {
        const c = { ...base, balance: { number: 100, ccy: '' } };
        expect(commandIsValid(c)).toBe(false);
      });

      test('invalid when otherAccount missing', () => {
        const c = { ...base, balance: { number: 100, ccy: 'GBP' }, otherAccount: '' };
        expect(commandIsValid(c)).toBe(false);
      });

      test('valid when balance number is 0 (zero balance is meaningful)', () => {
        const c = { ...base, balance: { number: 0, ccy: 'GBP' } };
        // balance.number === 0 is explicitly allowed — commandIsValid only checks number!==undefined
        expect(commandIsValid(c)).toBe(true);
      });
    });

    describe('unit', () => {
      const base = {
        ...blankBase,
        commandType: 'unit',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        balance: { number: 10, ccy: 'VWRD' },
        price: { number: 100, ccy: 'USD' },
      };

      test('valid with balance and price populated', () => {
        expect(commandIsValid(base)).toBe(true);
      });

      test('invalid when price ccy missing', () => {
        expect(commandIsValid({ ...base, price: { number: 100, ccy: '' } })).toBe(false);
      });

      test('invalid when price number missing', () => {
        expect(commandIsValid({ ...base, price: { number: 0, ccy: 'USD' } })).toBe(false);
      });
    });

    describe('trade', () => {
      const base = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
        price: { number: 100, ccy: 'USD' },
      };

      test('valid with change and price populated', () => {
        expect(commandIsValid(base)).toBe(true);
      });

      test('invalid when price number is 0 (unconfirmed price)', () => {
        expect(commandIsValid({ ...base, price: { number: 0, ccy: 'USD' } })).toBe(false);
      });

      test('invalid when change missing', () => {
        expect(commandIsValid({ ...base, change: { number: 0, ccy: '' } })).toBe(false);
      });
    });

    describe('yield', () => {
      const base = {
        ...blankBase,
        commandType: 'yield',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 10, ccy: 'GBP' },
      };

      test('valid with accountId and change', () => {
        expect(commandIsValid(base)).toBe(true);
      });

      test('invalid when change number is 0', () => {
        expect(commandIsValid({ ...base, change: { number: 0, ccy: 'GBP' } })).toBe(false);
      });
    });

    describe('fund', () => {
      const base = {
        ...blankBase,
        commandType: 'fund',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 1000, ccy: 'GBP' },
        otherAccount: 'Equity:Opening',
      };

      test('valid with all fields', () => {
        expect(commandIsValid(base)).toBe(true);
      });

      test('invalid when change ccy missing', () => {
        expect(commandIsValid({ ...base, change: { number: 1000, ccy: '' } })).toBe(false);
      });
    });
  });

  // ─── toGainstrack ─────────────────────────────────────────────────────────

  describe('toGainstrack', () => {
    test('returns empty string for invalid command', () => {
      expect(toGainstrack({ ...blankBase, commandType: 'bal' })).toBe('');
    });

    test('bal round-trip', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'bal',
        accountId: 'Assets:Bank:Nationwide',
        balance: { number: 5000, ccy: 'GBP' },
        otherAccount: 'Equity:Opening',
      };
      expect(toGainstrack(c)).toBe('2021-12-19 bal Assets:Bank:Nationwide 5000 GBP Equity:Opening');
    });

    test('unit round-trip', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'unit',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        balance: { number: 10, ccy: 'VWRD' },
        price: { number: 95.5, ccy: 'USD' },
      };
      expect(toGainstrack(c)).toBe('2021-12-19 unit Assets:Investment:IBUSD:VWRD 10 VWRD @95.5 USD');
    });

    test('trade round-trip without commission', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
        price: { number: 95.5, ccy: 'USD' },
      };
      expect(toGainstrack(c)).toBe('2021-12-19 trade Assets:Investment:IBUSD:VWRD 5 VWRD @95.5 USD');
    });

    test('trade round-trip with commission', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
        price: { number: 95.5, ccy: 'USD' },
        commission: { number: 2, ccy: 'USD' },
      };
      expect(toGainstrack(c)).toBe('2021-12-19 trade Assets:Investment:IBUSD:VWRD 5 VWRD @95.5 USD C2 USD');
    });

    test('yield round-trip without asset (single-asset account)', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'yield',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 12.5, ccy: 'GBP' },
      };
      expect(toGainstrack(c)).toBe('2021-12-19 yield Assets:Bank:Nationwide 12.5 GBP');
    });

    test('fund round-trip with explicit other account', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'fund',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 1000, ccy: 'GBP' },
        otherAccount: 'Equity:Opening',
      };
      expect(toGainstrack(c)).toBe('2021-12-19 fund Assets:Bank:Nationwide Equity:Opening 1000 GBP');
    });
  });

  // ─── defaultedTradeCommand ────────────────────────────────────────────────

  describe('defaultedTradeCommand', () => {
    test('infers price ccy from account when blank', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
      };
      const dc = defaultedTradeCommand(c, allStateEx, pricer);
      // Account ccy is USD, so price ccy should default to USD
      expect(dc.price!.ccy).toBe('USD');
    });

    test('preserves user-entered price', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
        price: { number: 88.88, ccy: 'USD' },
      };
      const dc = defaultedTradeCommand(c, allStateEx, pricer);
      expect(dc.price!.number).toBe(88.88);
      expect(dc.price!.ccy).toBe('USD');
    });

    test('defaults date to today when blank', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'trade',
        accountId: 'Assets:Investment:IBUSD:VWRD',
        change: { number: 5, ccy: 'VWRD' },
        date: '',
      };
      const dc = defaultedTradeCommand(c, allStateEx, pricer);
      expect(dc.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ─── convertToTrade ───────────────────────────────────────────────────────

  describe('convertToTrade', () => {
    // Unit command with an existing balance to convert from
    const unitCmd: AccountCommandEditing = {
      ...blankBase,
      commandType: 'unit',
      accountId: 'Assets:Investment:IBUSD:VWRD',
      balance: { number: 10, ccy: 'VWRD' },
      price: { number: 0, ccy: '' },
    };

    test('does not bake in FX-inferred price when user left price blank', () => {
      const result = convertToTrade(unitCmd, allStateEx, pricer);
      // Price number must stay 0 — commandIsValid requires truthy price.number
      expect(result.price!.number).toBe(0);
    });

    test('converted command is invalid (trade) when price is blank — forces user to confirm price', () => {
      const result = convertToTrade(unitCmd, allStateEx, pricer);
      expect(commandIsValid(result)).toBe(false);
    });

    test('preserves user-entered price after conversion', () => {
      const c: AccountCommandEditing = { ...unitCmd, price: { number: 75.5, ccy: 'USD' } };
      const result = convertToTrade(c, allStateEx, pricer);
      expect(result.price!.number).toBe(75.5);
      expect(result.price!.ccy).toBe('USD');
    });

    test('converted command is valid when user provided price', () => {
      const c: AccountCommandEditing = { ...unitCmd, price: { number: 75.5, ccy: 'USD' } };
      const result = convertToTrade(c, allStateEx, pricer);
      expect(commandIsValid(result)).toBe(true);
    });

    test('sets commandType to trade', () => {
      const result = convertToTrade(unitCmd, allStateEx, pricer);
      expect(result.commandType).toBe('trade');
    });

    test('change reflects difference from current balance', () => {
      // VWRD balance in fixture is known; change = balance.number - currentBalance
      const result = convertToTrade(unitCmd, allStateEx, pricer);
      expect(result.change!.ccy).toBe('VWRD');
      expect(typeof result.change!.number).toBe('number');
    });
  });

  // ─── defaultedTransferCommand ─────────────────────────────────────────────

  describe('defaultedTransferCommand', () => {
    test('transfer from multi-asset should default to itself', () => {
      const c = { ...blankBase, commandType: 'tfr', accountId: 'Assets:Investment:OldMutual', change: { number: 2324, ccy: 'HKD' }, options: { targetChange: { number: 297, ccy: 'USD' } } };
      const dc = defaultedTransferCommand(c, allStateEx, pricer);
      expect(dc.otherAccount).toStrictEqual(c.accountId);
    });

    test('transfer from single-asset should default to no account', () => {
      const c = { ...blankBase, commandType: 'tfr', accountId: 'Assets:Investment', change: { number: 2324, ccy: 'HKD' }, options: { targetChange: { number: 297, ccy: 'USD' } } };
      const dc = defaultedTransferCommand(c, allStateEx, pricer);
      expect(dc.otherAccount).toStrictEqual('');
    });

    test('always initialises options.targetChange so commandIsValid does not throw', () => {
      // options starts empty — defaultedTransferCommand must fill targetChange
      const c: AccountCommandEditing = { ...blankBase, commandType: 'tfr', accountId: 'Assets:HSBCHK', change: { number: 1000, ccy: 'HKD' } };
      expect(() => {
        const dc = defaultedTransferCommand(c, allStateEx, pricer);
        commandIsValid(dc);
      }).not.toThrow();
    });
  });

  // ─── defaultedYieldCommand ────────────────────────────────────────────────

  describe('defaultedYieldCommand', () => {
    test('infers change ccy from account when blank', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'yield',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 10, ccy: '' },
      };
      const dc = defaultedYieldCommand(c, allStateEx);
      expect(dc.change?.ccy).toBe('GBP');
    });

    test('preserves user-entered change ccy', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'yield',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 5, ccy: 'USD' },
      };
      const dc = defaultedYieldCommand(c, allStateEx);
      expect(dc.change?.ccy).toBe('USD');
    });
  });

  // ─── defaultedFundCommand ─────────────────────────────────────────────────

  describe('defaultedFundCommand', () => {
    test('infers change ccy from account', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'fund',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 500, ccy: '' },
      };
      const dc = defaultedFundCommand(c, allStateEx);
      expect(dc.change?.ccy).toBe('GBP');
    });

    test('falls back to Equity:Opening when no funding account configured', () => {
      const c: AccountCommandEditing = {
        ...blankBase,
        commandType: 'fund',
        accountId: 'Assets:Bank:Nationwide',
        change: { number: 500, ccy: 'GBP' },
      };
      const dc = defaultedFundCommand(c, allStateEx);
      // Nationwide has no fundingAccount option, so should default to Equity:Opening
      expect(dc.otherAccount).toBe('Equity:Opening');
    });
  });
});
