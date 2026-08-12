#!/usr/bin/env python3
"""Dump a beancount ledger as JSON, for whatever wants to read one without linking beancount.

The whole point of this script is that it does almost nothing. `loader.load_file`
has already done every hard part before we see an entry:

  * includes resolved, arithmetic expressions evaluated, `pushtag`/`popmeta` applied;
  * elided posting amounts interpolated, so every posting here carries explicit units;
  * plugins run, `pad` directives expanded into flagged padding transactions;
  * **booking** performed — lot selection under STRICT/FIFO/AVERAGE, with each posting's
    cost resolved to a concrete lot.

Reimplementing any of that elsewhere would diverge silently on the numbers, which is the
one failure mode a migration tool cannot have. So the boundary is this JSON document, and
the far side of it never sees beancount syntax — or beancount's licence.

Numbers are emitted as STRINGS. beancount computes in `decimal.Decimal`; JSON numbers are
binary floats, and round-tripping a lot cost through one is how a portfolio ends up off by
a cent per trade.

Usage:
    python3 bean2gain/python/dump.py ledger.beancount           # JSON to stdout
    python3 bean2gain/python/dump.py ledger.beancount -o out.json
"""

from __future__ import annotations

__copyright__ = "Copyright (C) 2025-2026  Kevin Tam"
# GPL-2.0-only, because this file imports beancount, which is GPLv2 with no "or later" grant.
# See LICENSE and README.md beside it.
__license__ = "GNU GPLv2"

import argparse
import json
import sys
from decimal import Decimal
from typing import Any

from beancount import loader
from beancount.core import data

# Bumped whenever the shape below changes incompatibly. The TypeScript reader checks it and
# refuses a document it does not understand, rather than silently reading absent fields as
# "the user had none of those".
SCHEMA_VERSION = 1

# `options_map` holds display contexts, parsed dcontext objects and other things with no JSON
# form. Only the keys the importer actually consults are carried across; anything else would
# be dead weight that still has to be serialized.
OPTION_KEYS = (
    "title",
    "operating_currency",
    "name_assets",
    "name_liabilities",
    "name_equity",
    "name_income",
    "name_expenses",
    "booking_method",
    "inferred_tolerance_default",
)


def _scalar(value: Any) -> Any:
    """JSON-safe rendering of one metadata/option value, preserving decimal exactness."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_scalar(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _scalar(v) for k, v in value.items()}
    # Dates, Amounts, Accounts, enums, plugin objects: str() is lossless enough for the
    # comment-carrying use these have, and never raises.
    return str(value)


def _meta(meta: dict | None) -> dict:
    """User metadata only.

    `filename`/`lineno` are on every entry and are provenance, not user data; they are
    hoisted into dedicated fields so the importer can cite a source location in its report
    without having to know they are special.
    """
    if not meta:
        return {}
    return {k: _scalar(v) for k, v in meta.items() if not k.startswith("_") and k not in ("filename", "lineno")}


def _amount(amount: Any) -> dict | None:
    if amount is None:
        return None
    # An interpolated price can legitimately have a None number.
    number = amount.number
    return {
        "number": None if number is None else str(number),
        "currency": amount.currency,
    }


def _cost(cost: Any) -> dict | None:
    if cost is None:
        return None
    # `CostSpec` survives here only if booking failed to resolve it; carry what there is
    # rather than crashing, and let the importer report it.
    number = getattr(cost, "number", None)
    if number is None:
        number = getattr(cost, "number_per", None)
    return {
        "number": None if number is None else str(number),
        "currency": getattr(cost, "currency", None),
        "date": str(cost.date) if getattr(cost, "date", None) else None,
        "label": getattr(cost, "label", None),
    }


def _posting(posting: data.Posting) -> dict:
    return {
        "account": posting.account,
        "units": _amount(posting.units),
        "cost": _cost(posting.cost),
        "price": _amount(posting.price),
        "flag": posting.flag,
        "meta": _meta(posting.meta),
    }


def _base(entry: Any, kind: str) -> dict:
    meta = entry.meta or {}
    return {
        "type": kind,
        "date": str(entry.date),
        "meta": _meta(meta),
        "location": {"file": meta.get("filename"), "line": meta.get("lineno")},
    }


def _entry(entry: Any) -> dict:
    if isinstance(entry, data.Transaction):
        out = _base(entry, "transaction")
        out.update(
            # `flag` is load-bearing: the loader stamps synthesized padding transactions with
            # 'P' (data.FLAG_PADDING), which is the only reliable way to tell one from a
            # transaction the user wrote. The importer folds those back into `bal`.
            flag=entry.flag,
            payee=entry.payee,
            narration=entry.narration,
            tags=sorted(entry.tags or ()),
            links=sorted(entry.links or ()),
            postings=[_posting(p) for p in entry.postings],
        )
        return out

    if isinstance(entry, data.Open):
        out = _base(entry, "open")
        out.update(
            account=entry.account,
            currencies=list(entry.currencies or ()),
            booking=entry.booking.name if entry.booking is not None else None,
        )
        return out

    if isinstance(entry, data.Close):
        out = _base(entry, "close")
        out.update(account=entry.account)
        return out

    if isinstance(entry, data.Commodity):
        out = _base(entry, "commodity")
        out.update(currency=entry.currency)
        return out

    if isinstance(entry, data.Pad):
        out = _base(entry, "pad")
        out.update(account=entry.account, source_account=entry.source_account)
        return out

    if isinstance(entry, data.Balance):
        out = _base(entry, "balance")
        out.update(
            account=entry.account,
            amount=_amount(entry.amount),
            tolerance=None if entry.tolerance is None else str(entry.tolerance),
            # Non-None means the assertion FAILED by this much. A ledger that does not load
            # cleanly should be fixed in beancount before importing, so the importer reports
            # rather than guesses.
            diff=None if entry.diff_amount is None else _amount(entry.diff_amount),
        )
        return out

    if isinstance(entry, data.Price):
        out = _base(entry, "price")
        out.update(currency=entry.currency, amount=_amount(entry.amount))
        return out

    if isinstance(entry, data.Note):
        out = _base(entry, "note")
        out.update(account=entry.account, comment=entry.comment)
        return out

    if isinstance(entry, data.Document):
        out = _base(entry, "document")
        out.update(account=entry.account, filename=entry.filename)
        return out

    if isinstance(entry, data.Event):
        out = _base(entry, "event")
        out.update(event_type=entry.type, description=entry.description)
        return out

    if isinstance(entry, data.Query):
        out = _base(entry, "query")
        out.update(name=entry.name, query_string=entry.query_string)
        return out

    if isinstance(entry, data.Custom):
        out = _base(entry, "custom")
        out.update(custom_type=entry.type, values=[_scalar(v.value) for v in entry.values])
        return out

    # A directive type we have never seen — a plugin's, most likely. Emitting it as `unknown`
    # keeps the count honest in the migration report; dropping it would not.
    out = _base(entry, "unknown")
    out.update(python_type=type(entry).__name__)
    return out


def dump(path: str) -> dict:
    entries, errors, options_map = loader.load_file(path)
    return {
        "schema": SCHEMA_VERSION,
        "source": path,
        "options": {k: _scalar(options_map.get(k)) for k in OPTION_KEYS if k in options_map},
        # Errors are reported, never raised: a ledger with a failing balance assertion still
        # converts, and the user is told which assertion beancount itself rejects.
        "errors": [
            {
                "message": str(getattr(e, "message", e)),
                "file": (getattr(e, "source", None) or {}).get("filename"),
                "line": (getattr(e, "source", None) or {}).get("lineno"),
            }
            for e in errors
        ],
        "entries": [_entry(e) for e in entries],
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("ledger", help="path to the top-level .beancount file")
    ap.add_argument("-o", "--output", help="write here instead of stdout")
    ap.add_argument("--indent", type=int, default=None, help="pretty-print with this indent")
    args = ap.parse_args(argv)

    document = dump(args.ledger)
    text = json.dumps(document, indent=args.indent, sort_keys=False)
    if args.output:
        with open(args.output, "w", encoding="utf8") as fh:
            fh.write(text)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
