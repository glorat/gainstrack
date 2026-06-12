// A generated transaction (a set of balanced postings) and its DTO projection.
// Mirrors `core/.../core/Transaction.scala` (toDTO) and `TransactionDTO`.

import { Transaction as DTOTransaction } from 'src/lib/assetdb/models';
import { GPosting } from 'src/lib/gen/posting';

export interface GTransaction {
  postDate: string;
  description: string;
  postings: GPosting[];
  originIndex: number; // index of the origin command in the sorted command list
  id: number;
}

// The wire TransactionDTO is {originIndex, postDate, postings} — no `id` (Scala Transaction.toDTO).
export function txToDTO(tx: GTransaction): DTOTransaction {
  return {
    originIndex: tx.originIndex,
    postDate: tx.postDate,
    postings: tx.postings.map(p => p.toDTO()),
  } as unknown as DTOTransaction;
}
