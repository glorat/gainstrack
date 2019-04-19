package com.gainstrack.core


trait CommandParser {
  def parse(str:String) : AccountCommand
  def prefix : String
}
