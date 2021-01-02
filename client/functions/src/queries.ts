import {Response} from "express";
import {Request} from "firebase-functions/lib/providers/https";

function applyQueries(col: FirebaseFirestore.CollectionReference, queries: any[]): FirebaseFirestore.Query|FirebaseFirestore.CollectionReference {
  let ret:FirebaseFirestore.Query|FirebaseFirestore.CollectionReference = col;

  queries.forEach(qry => {
    if (qry.where) {
      const where = qry.where;
      if (where.length === 3) {
        ret = ret.where(where[0], where[1], where[2])
      }
    } else if (qry.orderBy) {
      const orderBy = qry.orderBy;
      ret = ret.orderBy(orderBy[0], orderBy[1])
    }
  })
  return ret;
}

/*
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"query":[{"where":["asset.type","==","etf"]}]}' \
  http://localhost:5001/gainstrack/us-central1/quoteSources
*/

export const quoteSourcesHandler:(db: FirebaseFirestore.Firestore) => (req: Request, resp: Response) => void | Promise<void> = (db) => async(req, res) => {
  const qry = req.body.query ?? [{"where":["asset.type","==","etf"]}];
  const col = db.collection('quoteSources');
  const filtered = applyQueries(col, qry);
  const x = await filtered.get();
  const rows = x.docs.map((doc: any) => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  res.json({rows});
};
