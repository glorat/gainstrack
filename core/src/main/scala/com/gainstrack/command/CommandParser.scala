package com.gainstrack.command

import com.gainstrack.core.AccountCommand

trait CommandParser {
  def parse(str:String) : AccountCommand
  def prefix : String
}
