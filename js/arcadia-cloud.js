/**
 * Arcadia Cloud — shared Firebase layer
 * ------------------------------------------------------------------
 * Loaded by the homepage AND by every individual game (via a relative
 * path). Provides one small global, `window.Arcadia`, with:
 *
 *   Arcadia.onAuthChange(cb)          — cb(userOrNull) on login/logout
 *   Arcadia.getCurrentUser()          — current Firebase user or null
 *   Arcadia.signUp(email, pw, name)   — create account -> Promise
 *   Arcadia.signIn(email, pw)         — log in -> Promise
 *   Arcadia.signOutUser()             — log out -> Promise
 *   Arcadia.submitScore(slug, title, score) — record a game result
 *   Arcadia.getGlobalLeaderboard(n)   — top N players site-wide
 *   Arcadia.isConfigured              — false until firebase-config.js
 *                                        has real (non-placeholder) keys
 *
 * Requires (loaded before this file):
 *   - firebase-app-compat.js, firebase-auth-compat.js,
 *     firebase-firestore-compat.js  (Firebase SDK, compat build)
 *   - firebase-config.js  (defines ARCADIA_FIREBASE_CONFIG)
 *
 * Designed to fail soft: if Firebase isn't configured yet, or a
 * network/permission error happens, every method resolves harmlessly
 * instead of throwing, so the rest of the site/game keeps working.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  function isPlaceholderConfig(cfg) {
    return !cfg || !cfg.apiKey || /YOUR_/.test(cfg.apiKey);
  }

  var configured = false;
  var auth = null;
  var db = null;

  try {
    if (
      typeof firebase !== "undefined" &&
      typeof ARCADIA_FIREBASE_CONFIG !== "undefined" &&
      !isPlaceholderConfig(ARCADIA_FIREBASE_CONFIG)
    ) {
      var app = firebase.apps && firebase.apps.length
        ? firebase.apps[0]
        : firebase.initializeApp(ARCADIA_FIREBASE_CONFIG);
      auth = firebase.auth(app);
      db = firebase.firestore(app);
      configured = true;
    } else {
      console.warn(
        "[Arcadia] Firebase isn't configured yet — login and the cloud " +
        "leaderboard are disabled. Fill in js/firebase-config.js to enable them."
      );
    }
  } catch (err) {
    console.warn("[Arcadia] Firebase failed to initialize:", err);
  }

  function friendlyName(user) {
    if (!user) return "Player";
    return user.displayName || (user.email ? user.email.split("@")[0] : "Player");
  }

  function onAuthChange(cb) {
    if (!configured) {
      cb(null);
      return function unsubscribe() {};
    }
    return auth.onAuthStateChanged(cb);
  }

  function getCurrentUser() {
    return configured ? auth.currentUser : null;
  }

  function signUp(email, password, displayName) {
    if (!configured) return Promise.reject(new Error("Cloud features aren't set up yet."));
    return auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
      return cred.user.updateProfile({ displayName: displayName }).then(function () {
        return db.collection("users").doc(cred.user.uid).set({
          displayName: displayName,
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function () {
        return cred.user;
      });
    });
  }

  function signIn(email, password) {
    if (!configured) return Promise.reject(new Error("Cloud features aren't set up yet."));
    return auth.signInWithEmailAndPassword(email, password).then(function (cred) {
      return cred.user;
    });
  }

  function signOutUser() {
    if (!configured) return Promise.resolve();
    return auth.signOut();
  }

  function submitScore(slug, title, score) {
    if (!configured) return Promise.resolve({ skipped: true, reason: "not-configured" });
    var user = auth.currentUser;
    if (!user) return Promise.resolve({ skipped: true, reason: "not-signed-in" });
    if (typeof score !== "number" || !isFinite(score) || score <= 0) {
      return Promise.resolve({ skipped: true, reason: "invalid-score" });
    }

    var displayName = friendlyName(user);
    var perGameRef = db.collection("scores").doc(user.uid + "_" + slug);
    var topRef = db.collection("leaderboard").doc(user.uid);
    var stamp = firebase.firestore.FieldValue.serverTimestamp();

    return perGameRef.get().then(function (perGameSnap) {
      var prevGameScore = perGameSnap.exists ? (perGameSnap.data().score || 0) : 0;
      var writes = [];
      if (score > prevGameScore) {
        writes.push(perGameRef.set({
          uid: user.uid,
          displayName: displayName,
          gameSlug: slug,
          gameTitle: title,
          score: score,
          updatedAt: stamp
        }));
      }
      return Promise.all(writes);
    }).then(function () {
      return topRef.get();
    }).then(function (topSnap) {
      var prevTop = topSnap.exists ? (topSnap.data().score || 0) : 0;
      if (score > prevTop) {
        return topRef.set({
          uid: user.uid,
          displayName: displayName,
          gameSlug: slug,
          gameTitle: title,
          score: score,
          updatedAt: stamp
        }).then(function () {
          return { skipped: false, newRecord: true };
        });
      }
      return { skipped: false, newRecord: false };
    }).catch(function (err) {
      console.warn("[Arcadia] submitScore failed:", err);
      return { skipped: true, reason: "error", error: err };
    });
  }

  function getGlobalLeaderboard(n) {
    n = n || 10;
    if (!configured) return Promise.resolve([]);
    return db.collection("leaderboard").orderBy("score", "desc").limit(n).get()
      .then(function (snap) {
        return snap.docs.map(function (d) { return d.data(); });
      })
      .catch(function (err) {
        console.warn("[Arcadia] getGlobalLeaderboard failed:", err);
        return [];
      });
  }

  window.Arcadia = {
    isConfigured: configured,
    onAuthChange: onAuthChange,
    getCurrentUser: getCurrentUser,
    signUp: signUp,
    signIn: signIn,
    signOutUser: signOutUser,
    submitScore: submitScore,
    getGlobalLeaderboard: getGlobalLeaderboard
  };
})();
