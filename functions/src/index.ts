import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';

import jwt = require('express-jwt');

import jwks = require('jwks-rsa');


import express = require('express');


// {
//     "domain": "dev-q-172al0.auth0.com",
//     "clientId": "UuT7elqE26W3gsAXmcuDjeVisyoGcBoV",
//     "audience": "YOUR_API_IDENTIFIER"
// }

const config = {
    AUTH0_DOMAIN: 'dev-q-172al0.auth0.com', // e.g., you.auth0.com
    AUTH0_API_AUDIENCE: 'http://localhost:3000', // e.g., http://localhost:1337/
    // FIREBASE_KEY: './firebase/<Firebase JSON>', // e.g., your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
    // FIREBASE_DB: '<Firebase Database URL>' // e.g., https://your-project.firebaseio.com
};

const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),
    audience: config.AUTH0_API_AUDIENCE,
    issuer: `https://${config.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
});


const app = express();

app.get('/auth/firebase', jwtCheck, (req, res) => {
    // Create UID from authenticated Auth0 user
    // @ts-ignore
    const uid = req.user.sub;
    // Mint token using Firebase Admin SDK
    admin.auth().createCustomToken(uid)
        .then(customToken =>
            // Response must be an object or Firebase errors
            res.json({firebaseToken: customToken})
        )
        .catch(err =>
            res.status(500).send({
                message: 'Something went wrong acquiring a Firebase token.',
                error: err
            })
        );
});


admin.initializeApp();


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.app = functions.https.onRequest(app);