package com.gainstrack.core

case class AccountId(n:String) extends Ordered[AccountId] {
  private def name = n
  def prefix:String = name.split(":").headOption.get

  def accountType:AccountType = {
    AccountType(prefix)
  }
  def isSubAccountOf(parentId:AccountId):Boolean = {
    (name == parentId.name) || (name.startsWith(parentId.name + ":"))
  }

  def parentAccountId:Option[AccountId] = {
    val idx = name.lastIndexOf(":")
    if (idx>0) {
      Some(AccountId(name.take(idx-1)))
    }
    else {
      None
    }
  }

  def convertType(aType:AccountType) : AccountId = {
    val newName = name.replace(s"$prefix:", s"$aType:")
    AccountId(newName)
  }

  def convertTypeWithSubAccount(aType:AccountType, subAccount:String) : AccountId = {
    val newName = name.replace(s"$prefix:", s"$aType:") + s":$subAccount"
    AccountId(newName)
  }

  def subAccount(subAccount:String) : AccountId = {
    AccountId(name + s":$subAccount")
  }

  def compare(that: AccountId): Int = that.name.compareTo(name)

  override def toString: String = name

  implicit def asString : String = name
}

object AccountId {
  implicit def stringToAccountId(str:String):AccountId = AccountId(str)

}