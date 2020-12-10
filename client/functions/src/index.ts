import * as functions from 'firebase-functions';

const admin = require('firebase-admin');
admin.initializeApp();

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const getAllQuoteSources = functions.region('asia-northeast1').https.onRequest(async (req, res) => {
  const x = await admin.firestore().collection('quoteSources').get();
  const ret = x.docs.map((doc:any) => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  res.json(ret);
});
