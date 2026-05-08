# LifeBalance Mobile

LifeBalance Mobile is a mobile-first Expo / React Native app for managing daily life automation from one dashboard. The app includes Rest Mode, To Do List, Notes, Office Mode, Driving Mode, Mute Apps, Exercise Mode, SOS Emergency, and Expense Tracker.

This project is built with React Native, Expo, TypeScript, AsyncStorage, Expo Notifications, Expo Location, Expo Contacts, Expo SMS, and custom Android native modules.

## Screenshots

All screenshots are stored in [`docs/screenshots`](docs/screenshots).

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

## What Is Inside

LifeBalance is designed like a smart life manager. The home screen shows all major tools as cards. Each card opens a dedicated feature screen. Some features are UI-driven and stored locally, while some use Android permissions and native modules for phone-level behavior.

The app currently includes:

- Rest Mode for quiet hours, sleep duration, and priority contacts
- To Do List for daily task planning and completion tracking
- Notes for text notes, checklist notes, image notes, drawing entry, and audio memo entry
- Office Mode for location-aware office/home state and auto message settings
- Driving Mode for GPS speed state, driving activation threshold, and auto-reply message
- Mute App Notifications for choosing apps to silence
- Exercise Mode for starting a GPS-style exercise session and viewing history
- SOS Emergency for sending emergency alerts to saved contacts
- Expense Tracker for income, spending, balance, categories, and entries

## How The App Works

The app starts from `App.tsx`. It keeps the main screen state in React state and switches between feature screens such as `home`, `rest`, `todo`, `office`, `driving`, `mute`, `exercise`, `expense`, and other module screens.

Local data is saved with `@react-native-async-storage/async-storage`, so app state can stay available after closing and reopening the app. Examples include selected contacts, rest mode state, office logs, notes, expenses, and mode settings.

Expo modules handle cross-platform features where possible:

- `expo-notifications` is used for notification scheduling and reminder behavior.
- `expo-location` is used for location, geofence-style office mode, driving state, and exercise tracking.
- `expo-task-manager` supports background location tasks.
- `expo-contacts` is used to select or read contacts.
- `expo-sms` is used for SMS-related emergency and auto-message flows.
- `expo-print` and `expo-sharing` are used for export/share style actions.
- `expo-intent-launcher` opens Android settings screens when needed.

Android-specific work is handled by custom Kotlin native modules inside `android/app/src/main/java/com/anonymous/lifebalancemobile/`.

## Feature Details

### Home Dashboard

The home screen is the main control center. It shows the LifeBalance title, a reminder button, and mode cards. Each card has an icon, title, subtitle, and status pill. Tapping a card opens its feature screen.

Main cards include:

- Rest Mode
- To Do List
- Notes
- Office Mode
- Driving Mode
- Mute Apps
- Exercise
- SOS
- Expenses

### Rest Mode

Rest Mode is used when the user wants quiet time or sleep time. The user can select durations like 1h, 2h, 4h, 6h, 8h, 10h, 12h, or custom time.

It also supports important contacts. The idea is that only selected important contacts can be saved for quick reference while the phone is in rest mode. The Android native side contains call-screening related support for deeper phone behavior.

Rest Mode includes:

- Duration selector
- Active/off state
- Important contact selection
- Missed call alert style state
- Call handling notes for Android priority contacts

### To Do List

The To Do List screen is used for planning daily work. It has category filters such as all, work, and personal. Tasks can be marked completed, and completed tasks appear in the completed section.

To Do List includes:

- Task categories
- Completed Today section
- Floating add button
- Local task state
- Reminder scheduling support through notification APIs

### Notes

Notes works like a simple Keep-style notebook. It supports different note entry types from the floating action menu.

Supported note types:

- Text note
- Checklist/list note
- Image note
- Drawing entry
- Audio memo entry

Notes can store title, body, checklist items, color, pinned state, image attachment, audio attachment, created time, and updated time. Export and sharing helpers are connected through native and Expo modules.

### Office Mode

Office Mode is for office/home location awareness and automatic message settings. The user can configure an auto message name and see office/home radius and distance values.

Office Mode includes:

- Auto message name
- Home radius
- Office radius
- Home distance
- Office distance
- Current phase
- Alerts sent count
- Last event log
- Office stopped/active state

The native and Expo location setup can be used to detect arrival and departure from office zones.

### Driving Mode

Driving Mode watches GPS state and speed. It shows whether GPS is waiting, ready, live, or pending. It uses speed thresholds to decide when driving mode should activate or deactivate.

Driving Mode includes:

- Current speed display
- GPS ready/waiting status
- Activation threshold, for example above 25 km/h
- Deactivation threshold, for example below 15 km/h
- Incoming call behavior
- Auto-reply SMS message
- Activity log area

### Mute App Notifications

Mute App Notifications lets the user search installed apps and toggle which apps should be muted. The Android native module can read installed apps and communicate with notification listener behavior.

Mute Apps includes:

- Muted apps count
- Mute All action
- Search apps input
- App list with icons/initials
- Per-app mute toggle

### Exercise Mode

Exercise Mode is used for tracking a workout session. It shows a map/route placeholder area, duration, distance, start button, and previous session history.

Exercise Mode includes:

- Ready status
- Duration counter
- Distance counter
- Start Exercise button
- Session history list
- Location tracking support

### SOS Emergency

SOS Emergency is used to send emergency alerts with live location. It has a large SOS start button and emergency contact area.

SOS includes:

- Standby/current state
- SOS start button
- Sending status
- Emergency contact count
- Resend interval
- Sent count
- Add contact button
- SMS sending support

### Expense Tracker

Expense Tracker manages income, spending, and balance. It supports time filters and transaction entries.

Expense Tracker includes:

- Daily, monthly, yearly filters
- Income summary
- Spent summary
- Balance summary
- Description input
- Amount input
- Deposit/withdrawal selector
- Category chips like Food, Transport, Shopping, Bills, Salary, Other
- Add entry button
- Transaction list

## Android Native Features

The Android folder contains Kotlin code for phone-specific features that Expo alone cannot fully control.

Important native files:

- `LifeBalanceNativeModule.kt` exposes native Android helpers to React Native.
- `LifeBalanceNativePackage.kt` registers the native module.
- `LifeBalanceCallScreeningService.kt` supports call screening behavior.
- `LifeBalanceNotificationListenerService.kt` supports notification listener behavior for app muting.
- `LifeBalanceReminderReceiver.kt` handles Android reminder alarms/receivers.
- `LifeBalanceVoiceRecordingService.kt` supports voice recording service behavior.
- `MainActivity.kt` and `MainApplication.kt` connect the Android app startup flow.

Native helpers include:

- Open Android notification policy settings
- Open notification listener settings
- Open default app settings
- Check call-screening role
- Read installed apps
- Read and update muted notification packages
- Schedule/cancel reminder notifications
- Send direct SMS where allowed
- Pick image/audio files
- Open external files
- Export notes
- Share files

## Permissions

The app requests Android permissions in `app.json` and `AndroidManifest.xml` for features that need device access.

Main permissions include:

- Location access for office, driving, and exercise modes
- Background location for long-running location tasks
- Notification permission for reminders and alerts
- Contacts permission for important contacts and emergency contacts
- SMS support for auto messages and SOS
- Exact alarm support for reminder scheduling

Some Android features also require the user to manually enable system settings, such as notification listener access, call screening role, exact alarm permission, or notification policy access.

## Project Structure

```text
lifebalanceApp/
|-- App.tsx
|-- app.json
|-- babel.config.js
|-- metro.config.js
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- docs/
|   `-- screenshots/
|       |-- 1000039252.jpeg
|       |-- 1000039253.jpeg
|       |-- 1000039254.jpeg
|       `-- ...
`-- android/
    |-- app/
    |   |-- build.gradle
    |   |-- proguard-rules.pro
    |   `-- src/
    |       `-- main/
    |           |-- AndroidManifest.xml
    |           |-- java/com/anonymous/lifebalancemobile/
    |           |   |-- MainActivity.kt
    |           |   |-- MainApplication.kt
    |           |   |-- LifeBalanceNativeModule.kt
    |           |   |-- LifeBalanceCallScreeningService.kt
    |           |   |-- LifeBalanceNotificationListenerService.kt
    |           |   |-- LifeBalanceReminderReceiver.kt
    |           |   `-- LifeBalanceVoiceRecordingService.kt
    |           `-- res/
    |-- build.gradle
    |-- gradle.properties
    |-- gradlew
    |-- gradlew.bat
    `-- settings.gradle
```

## Tech Stack

- React Native `0.81.5`
- Expo `54`
- React `19`
- TypeScript
- AsyncStorage
- Expo Notifications
- Expo Location
- Expo Task Manager
- Expo Contacts
- Expo SMS
- Expo Print
- Expo Sharing
- Expo Intent Launcher
- Kotlin Android native modules

## Installation

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run web preview:

```bash
npm run web
```

## How To Use

1. Open the app.
2. Use the home dashboard to choose a mode.
3. Tap any card, such as Rest Mode, To Do List, Notes, Office Mode, Driving Mode, Mute Apps, Exercise, SOS, or Expenses.
4. Configure the screen using buttons, toggles, inputs, and contact selectors.
5. The app saves supported local data with AsyncStorage.
6. For Android-only features, allow permissions and enable required settings when the app asks.

## Development Notes

This project is currently organized mostly around a single large `App.tsx` file plus Android native modules. For a larger production version, the next step should be splitting `App.tsx` into smaller screens, components, hooks, storage helpers, and native API service files.

Recommended future structure:

```text
src/
|-- components/
|-- screens/
|-- hooks/
|-- services/
|-- storage/
|-- theme/
|-- types/
`-- utils/
```

## Current Status

The UI, app flow, local state, screenshots, and Android native integration files are included. Some phone-level features depend on Android permissions, system settings, device support, and native runtime behavior.

Use a real Android device for testing features like location tracking, call screening, notification listener access, SMS, installed app lookup, and voice recording.
