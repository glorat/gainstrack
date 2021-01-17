import {QueryDocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {EventContext} from "firebase-functions";

export let quoteSourceHistoryCreateHandler = (firestore: FirebaseFirestore.Firestore) =>async (snap: QueryDocumentSnapshot, context: EventContext) => {
  // Get an object representing the document
  const historyId = context.params.historyId;
  const snapData = snap.data();
  const toSave = snapData.payload;

  try {
    // Annotate the projection with history reference
    toSave.lastUpdate = {
      timestamp: snap.createTime.toMillis(),
      uid: snapData.uid,
      revision: (toSave.lastUpdate?.revision ?? 0) + 1,
      history: historyId,
    };

    const id = toSave?.id;
    const doc = await firestore.collection('quoteSources').doc(id).get();
    if (doc.exists && doc.data()!.lastUpdate?.revision) {
      if (doc.data()!.lastUpdate?.revision === toSave.lastUpdate?.revision) {
        await firestore.collection('quoteSources').doc(id).set(toSave);
      } else {
        // Revision mismatch - dump it
        throw new Error('Revision mismatch');
      }
    } else {
      await firestore.collection('quoteSources').doc(id).set(toSave);
    }
  } catch (e) {
    console.error(e);
    snapData.error = e.toString()
    await firestore.collection('quoteSourceErrors').add(snapData);
    await snap.ref.delete();
  }


};
