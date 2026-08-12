#!/usr/bin/env python3
"""Per-(account, currency) posting totals for a beancount ledger, as JSON.

The oracle half of the import verification. The migrated ledger is exported back to beancount
and loaded by the SAME engine that loaded the original, so any difference in these numbers is a
difference the import introduced — there is no second implementation to disagree with.

Units, not market value: the question is whether the import moved money, and a price that
happens to differ would only add noise.

This is what `bean-query` would be used for. A dedicated script instead, because `bean-query`
lives in a separate `beanquery` package under beancount 3.x and its output is formatted for
humans; going through the loader API needs no extra dependency and no output parsing.

Usage:
    python3 bean2gain/python/balances.py ledger.beancount
"""

from __future__ import annotations

__copyright__ = "Copyright (C) 2025-2026  Kevin Tam"
# GPL-2.0-only, because this file imports beancount, which is GPLv2 with no "or later" grant.
# See LICENSE and README.md beside it.
__license__ = "GNU GPLv2"

import argparse
import collections
import json
import sys
from decimal import Decimal

from beancount import loader
from beancount.core import data


def balances(path: str) -> dict:
    entries, errors, _options = loader.load_file(path)
    sums: dict[str, dict[str, Decimal]] = collections.defaultdict(lambda: collections.defaultdict(Decimal))
    for entry in entries:
        if not isinstance(entry, data.Transaction):
            continue
        for posting in entry.postings:
            if posting.units is None or posting.units.number is None:
                continue
            sums[posting.account][posting.units.currency] += posting.units.number
    return {
        "errors": [str(getattr(e, "message", e)) for e in errors],
        # Decimal -> str: these are compared for exact equality, and a float round trip is
        # precisely the thing that would make an exact comparison lie.
        "balances": {
            account: {ccy: str(amount) for ccy, amount in sorted(by_ccy.items())}
            for account, by_ccy in sorted(sums.items())
        },
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("ledger")
    args = ap.parse_args(argv)
    json.dump(balances(args.ledger), sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
