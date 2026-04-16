# Building the Discuss Android APK

This project uses [Capacitor](https://capacitorjs.com/) to wrap the Discuss web app into a native Android APK. The web app code is **not changed** — Capacitor simply packages the built web assets into an Android app.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio) (with Android SDK installed)
- Java 17+

## Steps to Build the APK

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Build the web app and sync to Android
```bash
npm run build:android
```
This runs `craco build` (builds the React app into `frontend/build/`) and then `npx cap sync android` (copies the build into the Android project).

### 3. Open in Android Studio
```bash
npm run cap:open
```
This opens the `android/` folder in Android Studio automatically.

### 4. Build the APK in Android Studio
- In Android Studio, go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- The APK will be generated at:
  `android/app/build/outputs/apk/debug/app-debug.apk`

## App Details

| Field | Value |
|---|---|
| App Name | Discuss |
| Package ID | com.discuss.app |
| Min Android SDK | 22 (Android 5.1) |
| Target SDK | Latest |

## After Making Web Changes

Whenever you update the web app, re-run:
```bash
npm run build:android
```
Then rebuild the APK from Android Studio.

## Release Build (Signed APK)

To publish to the Play Store, you need to sign the APK:
1. Generate a keystore: `keytool -genkey -v -keystore discuss.jks -keyalg RSA -keysize 2048 -validity 10000 -alias discuss`
2. In Android Studio: **Build → Generate Signed Bundle / APK**
3. Follow the wizard to sign with your keystore

## Permissions

The APK requests the following Android permissions:
- `INTERNET` — required to load the Discuss web app and connect to Firebase

## Notes

- The APK runs the exact same UI and features as the web app at [https://dsscus.netlify.app](https://dsscus.netlify.app)
- Firebase authentication, real-time updates, and all features work identically
- The web app itself (`frontend/src/`) is unchanged
