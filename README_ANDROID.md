# Android Development & Build Guide

This project supports building a native Android app using **Capacitor**.

## Prerequisites
- **Node.js** (v18+)
- **Java JDK** (v17+)
- **Android Studio** (for final build/APK generation)

## Quick Start

1.  **Install Dependencies** (if you haven't already):
    ```bash
    npm install
    ```

2.  **Sync Web Assets**:
    Whenever you build the web frontend (in `public/`), run this to copy changes to the Android project:
    ```bash
    npm run android:sync
    ```

3.  **Open in Android Studio**:
    This command opens the native Android project where you can run the emulator or build the APK.
    ```bash
    npm run android:open
    ```

## Configuration (Crucial!)

Since TermLink is a client-server application, the Android app needs to know **where your server is running**.

### Option A: Point to Hosted Server (Recommended)
This makes the app load your existing deployed TermLink instance directly. Use this if you have deployed TermLink to a server (e.g., `http://192.168.1.100:3000` or `https://termlink.example.com`).

1.  Open `capacitor.config.json`.
2.  Add the `server` object pointing to your URL:
    ```json
    {
      "appId": "com.termlink.app",
      "appName": "TermLink",
      "webDir": "public",
      "server": {
        "url": "http://YOUR_SERVER_IP:3000",
        "cleartext": true
      }
    }
    ```
    *Note: `cleartext: true` is required if you are using HTTP instead of HTTPS.*

### Option B: Local Bundled (Advanced)
If you want the app to be standalone (bundled `public` folder), you must modify `public/client.js` to allow configuring the API URL, because strictly local files cannot make relative requests to an unknown server. (Currently, Option A is strongly recommended).

## Building APK
Inside Android Studio:
1.  Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2.  The APK will be generated in `android/app/build/outputs/apk/debug/`.
