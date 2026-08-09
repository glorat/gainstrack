package com.gainstrack.core.test

/**
 * The checked-in synthetic ledgers every golden dump runs over.
 *
 * One list, because a fixture that is not in ALL of the dump suites produces a partial golden
 * set and a TS spec that silently skips it. The TS side mirrors this in
 * `client/src/lib/__tests__/fixtureNames.ts` — keep the two in step.
 */
object Fixtures {
  val names: Seq[String] =
    Seq("basic", "unit", "src", "div", "balbug", "james", "noequity", "multiadj", "kitchensink")
}
