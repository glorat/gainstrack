import * as firebase from 'firebase/app';

// Add the Firebase services that you want to use
import 'firebase/analytics';
import 'firebase/firestore';
import 'firebase/auth';

let inited = false;

const firebaseConfig = {
  apiKey: 'AIzaSyBFgCa2tMUSuAWxiyAPa5U90peuqAJNNBo',
  authDomain: 'gainstrack.firebaseapp.com',
  databaseURL: 'https://gainstrack.firebaseio.com',
  projectId: 'gainstrack',
  storageBucket: 'gainstrack.appspot.com',
  messagingSenderId: '248761590066',
  appId: '1:248761590066:web:dcd7d7a8e1028f7b1bf72b',
  measurementId: 'G-H8SQPQVX1S'
};


function initFirebase() {
  if (!inited) {
    inited = true;
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialised')
  }
}

export function myFirestore() {
  initFirebase()
  return firebase.firestore();
}

export function myAnalytics() {
  initFirebase()
  return firebase.analytics();
}

export function myAuth() {
  initFirebase()
  return firebase.auth();
}