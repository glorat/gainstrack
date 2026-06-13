import {FirestoreEvent} from 'firebase-functions/firestore';
import {QueryDocumentSnapshot} from 'firebase-admin/firestore';

type HistoryParams = { historyId: string };

export const quoteSourceHistoryCreateHandler = (firestore: FirebaseFirestore.Firestore) =>
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, HistoryParams>) => {
    const historyId = event.params.historyId;
    const snap = event.data;
    if (!snap) return;

    const snapData = snap.data();
    const toSave = snapData.payload;

    try {
      const id = toSave?.id;
      const doc = await firestore.collection('quoteSources').doc(id).get();
      if (doc.exists && doc.data()!.lastUpdate?.revision) {
        if (doc.data()!.lastUpdate?.revision === toSave.lastUpdate?.revision) {
          toSave.lastUpdate = {
            timestamp: snap.createTime.toMillis(),
            uid: snapData.uid,
            revision: (toSave.lastUpdate?.revision ?? 0) + 1,
            history: historyId,
          };
          await firestore.collection('quoteSources').doc(id).set(toSave);
        } else {
          throw new Error('Revision mismatch');
        }
      } else {
        toSave.lastUpdate = {
          timestamp: snap.createTime.toMillis(),
          uid: snapData.uid,
          revision: 1,
          history: historyId,
        };
        await firestore.collection('quoteSources').doc(id).set(toSave);
      }
    } catch (e: any) {
      console.error(e);
      snapData.error = e.toString();
      await firestore.collection('quoteSourceErrors').add(snapData);
      await snap.ref.delete();
    }
  };
