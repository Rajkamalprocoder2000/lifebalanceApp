# LifeBalance Mobile

Mobile-first Expo / React Native app for LifeBalance, a personal automation dashboard for rest mode, tasks, notes, office mode, driving safety, app muting, exercise, SOS, and expenses.

## Screenshots

App screenshots are included in [`docs/screenshots`](docs/screenshots).

<p>
  <img src="docs/screenshots/1000039252.jpeg" width="220" alt="LifeBalance home screen" />
  <img src="docs/screenshots/1000039253.jpeg" width="220" alt="LifeBalance modes screen" />
  <img src="docs/screenshots/1000039254.jpeg" width="220" alt="Rest Mode screen" />
</p>

<p>
  <img src="docs/screenshots/1000039255.jpeg" width="220" alt="Rest Mode contact screen" />
  <img src="docs/screenshots/1000039256.jpeg" width="220" alt="To Do List screen" />
  <img src="docs/screenshots/1000039257.jpeg" width="220" alt="Notes empty screen" />
</p>

<p>
  <img src="docs/screenshots/1000039258.jpeg" width="220" alt="Notes action menu" />
  <img src="docs/screenshots/1000039259.jpeg" width="220" alt="Office Mode screen" />
  <img src="docs/screenshots/1000039260.jpeg" width="220" alt="Driving Mode waiting GPS screen" />
</p>

<p>
  <img src="docs/screenshots/1000039261.jpeg" width="220" alt="Driving Mode GPS ready screen" />
  <img src="docs/screenshots/1000039262.jpeg" width="220" alt="Mute App Notifications screen" />
  <img src="docs/screenshots/1000039263.jpeg" width="220" alt="Exercise Mode screen" />
</p>

<p>
  <img src="docs/screenshots/1000039264.jpeg" width="220" alt="SOS Emergency screen" />
  <img src="docs/screenshots/1000039265.jpeg" width="220" alt="Expense Tracker screen" />
</p>

## Run

```bash
npm install
npm start
```

Or with Expo:

```bash
npx expo start
```

## Project Structure

```text
lifebalanceApp/
├── App.tsx
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
├── package-lock.json
├── tsconfig.json
├── docs/
│   └── screenshots/
│       ├── 1000039252.jpeg
│       ├── 1000039253.jpeg
│       ├── 1000039254.jpeg
│       └── ...
└── android/
    ├── app/
    │   ├── build.gradle
    │   ├── proguard-rules.pro
    │   └── src/
    │       └── main/
    │           ├── AndroidManifest.xml
    │           ├── java/com/anonymous/lifebalancemobile/
    │           │   ├── MainActivity.kt
    │           │   ├── MainApplication.kt
    │           │   ├── LifeBalanceNativeModule.kt
    │           │   ├── LifeBalanceCallScreeningService.kt
    │           │   ├── LifeBalanceNotificationListenerService.kt
    │           │   ├── LifeBalanceReminderReceiver.kt
    │           │   └── LifeBalanceVoiceRecordingService.kt
    │           └── res/
    ├── build.gradle
    ├── gradle.properties
    ├── gradlew
    ├── gradlew.bat
    └── settings.gradle
```

## Included

- Dark LifeBalance dashboard with mode cards and status pills
- Rest Mode with duration selection, important contacts, and call handling state
- To Do List and Keep-style notes with media/list options
- Office Mode with location-aware status and auto-message configuration
- Driving Mode with GPS speed state and auto-reply messaging
- Mute App Notifications screen with app search and toggles
- Exercise Mode with GPS session state and history
- SOS Emergency flow with emergency contacts and resend timing
- Expense Tracker with daily/monthly/yearly filters and entry form

## Android Native Features

The Android project includes native modules for device-specific behavior such as notification listener access, call screening, direct SMS, installed app lookup, reminder scheduling, file picking, and voice recording support.
