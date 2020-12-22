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

import jwt = require('express-jwt');

import jwks = require('jwks-rsa');

import express = require('express');


const config = {
  AUTH0_DOMAIN: 'gainstrack.auth0.com', // e.g., you.auth0.com
  AUTH0_API_AUDIENCE: 'https://poc.gainstrack.com', // e.g., http://localhost:1337/
  // FIREBASE_KEY: './firebase/<Firebase JSON>', // e.g., your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
  // FIREBASE_DB: '<Firebase Database URL>' // e.g., https://your-project.firebaseio.com
};


const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: config.AUTH0_API_AUDIENCE,
  issuer: `https://${config.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});



const app = express();

app.post('/firebase', jwtCheck, async (req, res) => {
  // Create UID from authenticated Auth0 user
  // @ts-ignore
  const uid = req.user.sub;
  // Mint token
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    res.json({firebaseToken: customToken})
  } catch (err) {
    res.status(500).send({
      message: 'Something went wrong acquiring a Firebase token.',
      error: err,
    })
  }
});


export const auth = functions.region('asia-northeast1').https.onRequest(app)
