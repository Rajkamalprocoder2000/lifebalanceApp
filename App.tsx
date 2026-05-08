import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  PermissionsAndroid,
  SafeAreaView,
  Share,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import * as SMS from "expo-sms";
import * as Contacts from "expo-contacts";

type RootScreen = "home" | "schedule" | "modes" | "profile";
type ModuleScreen =
  | "rest"
  | "reminder"
  | "todo"
  | "expense"
  | "voice"
  | "office"
  | "driving"
  | "news"
  | "mute"
  | "custom"
  | "exercise";
type Screen = RootScreen | ModuleScreen;

type ActiveMode =
  | {
      key: ModuleScreen;
      title: string;
      endLabel?: string;
    }
  | null;

type Contact = {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  emoji?: string;
};

type Reminder = {
  id: string;
  title: string;
  date: string;
  time: string;
  event: string;
  notificationId?: string;
};

type ReminderDebugState = {
  notificationPermission: boolean;
  exactAlarmReady: boolean;
  popupReady: boolean;
  popupStatusLabel: string;
  scheduledCount: number;
  lastNotificationId?: string;
  lastTriggerLabel?: string;
  lastStatus: string;
};

type ReminderNotificationStatus = {
  appNotificationsEnabled: boolean;
  channelExists: boolean;
  channelImportance: number;
  canShowPopUp: boolean;
};

type ReminderScheduleCandidate = {
  trigger: Notifications.SchedulableNotificationTriggerInput;
  label: string;
};

type RestSession = {
  startsAt: number;
  endsAt: number;
  durationMinutes: number;
};

type RestCallLog = {
  id: string;
  callerName: string;
  detail: string;
  outcome: "allowed" | "muted" | "alert" | "ended";
  timestamp: number;
};

type TodoTask = {
  id: string;
  title: string;
  details: string;
  date: string;
  time: string;
  done: boolean;
  createdAt: number;
  notificationId?: string;
};

type PickedAttachment = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number | null;
  durationMs?: number | null;
};

type KeepChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
  category?: string;
};

type KeepNote = {
  id: string;
  title: string;
  body: string;
  listCategories: string[];
  checklist: KeepChecklistItem[];
  color: string;
  pinned: boolean;
  image?: PickedAttachment;
  audio?: PickedAttachment;
  createdAt: number;
  updatedAt: number;
};

type KeepDraftPersistence = {
  editingNoteId: string | null;
  title: string;
  body: string;
  listCategories: string[];
  listCategoryInput: string;
  activeListCategory: string | null;
  categoryComposerVisible: boolean;
  checklist: KeepChecklistItem[];
  color: string;
  pinned: boolean;
  listMode: boolean;
  image?: PickedAttachment;
  audio?: PickedAttachment;
};

type PendingPickedFileResult = {
  requestType: "image" | "audio";
  file: PickedAttachment;
};

type MuteApp = {
  id: string;
  packageName: string;
  name: string;
  type: string;
  color: string;
  muted: boolean;
  letter: string;
  iconUri?: string;
};

type NativeInstalledApp = {
  packageName: string;
  name: string;
  type: string;
  iconUri?: string;
};

type ExerciseHistory = {
  id: string;
  date: string;
  duration: string;
  distance: string;
};

type SavedLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type OfficeLog = {
  id: string;
  type: "arrival" | "departure" | "check";
  text: string;
  timestamp: number;
};

type DrivingLog = {
  id: string;
  text: string;
  timestamp: number;
};

type CustomSession = {
  startsAt: number;
  endsAt: number;
  durationMinutes: number;
};

type CustomLog = {
  id: string;
  text: string;
  timestamp: number;
};

type ExercisePoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type ExpenseEntry = {
  id: string;
  amount: number;
  categoryId: string;
  categoryLabel: string;
  description: string;
  kind: "debit" | "credit";
  timestamp: number;
};

type VoiceRecorderLine = "personal" | "office" | "custom";
type VoiceRecorderScope = "selected" | "all";

type VoiceRecorderLog = {
  id: string;
  text: string;
  timestamp: number;
  type: "match" | "skip" | "info";
};

type VoiceRecordedCall = {
  id: string;
  callerNumber: string;
  lineLabel: string;
  lineNumber: string;
  timestamp: number;
  uri: string;
  mimeType?: string;
  durationMs?: number;
  size?: number | null;
  sourceLabel?: string;
  status: "recorded";
};

type SimCardInfo = {
  id: string;
  slotIndex: number;
  carrierName: string;
  displayName: string;
  number?: string;
};

type ExpenseCategoryDefinition = {
  id: string;
  label: string;
  icon: IconSpec;
  accentColor: string;
  softColor: string;
};

type LifeBalanceNativeModuleShape = {
  openNotificationPolicySettings?: () => void;
  openNotificationListenerSettings?: () => void;
  openDefaultAppsSettings?: () => void;
  openAppNotificationSettings?: () => void;
  openReminderChannelSettings?: () => void;
  openExactAlarmSettings?: () => void;
  requestCallScreeningRole?: () => Promise<boolean>;
  hasNotificationPolicyAccess?: () => Promise<boolean>;
  isNotificationListenerEnabled?: () => Promise<boolean>;
  isCallScreeningRoleHeld?: () => Promise<boolean>;
  getVoiceRecorderStatus?: () => Promise<{
    microphoneGranted: boolean;
    phoneGranted: boolean;
    callScreeningReady: boolean;
    configuredLine: string;
    configuredLineNumber: string;
    allowedCount: number;
    speakerAssistEnabled?: boolean;
    lastEventText?: string;
    lastEventType?: string;
  }>;
  getVoiceRecorderHistory?: () => Promise<VoiceRecordedCall[]>;
  getActiveSimCards?: () => Promise<SimCardInfo[]>;
  deleteVoiceRecording?: (recordingId: string, uri: string) => Promise<boolean>;
  canScheduleExactAlarms?: () => Promise<boolean>;
  getReminderNotificationStatus?: () => Promise<ReminderNotificationStatus>;
  updateRestModeConfig?: (
    active: boolean,
    priorityEnabled: boolean,
    repeatThreshold: number,
    allowedNumbers: string[],
  ) => Promise<boolean> | boolean;
  getInstalledApps?: () => Promise<NativeInstalledApp[]>;
  getMutedNotificationPackages?: () => Promise<string[]>;
  setMutedNotificationPackages?: (packageNames: string[]) => Promise<boolean>;
  refreshNotificationListenerBinding?: () => Promise<boolean>;
  scheduleReminderNotification?: (
    identifier: string,
    title: string,
    body: string,
    triggerAtMillis: number,
  ) => Promise<string>;
  cancelReminderNotification?: (identifier: string) => Promise<boolean>;
  sendSmsDirect?: (numbers: string[], message: string) => Promise<boolean>;
  updateVoiceRecorderConfig?: (
    active: boolean,
    autoStart: boolean,
    speakerAssistEnabled: boolean,
    scope: string,
    selectedLine: string,
    selectedSimId: string | null,
    selectedLineNumber: string,
    allowedNumbers: string[],
  ) => Promise<boolean>;
  pickImageFile?: () => Promise<PickedAttachment>;
  pickAudioFile?: () => Promise<PickedAttachment>;
  openExternalFile?: (uri: string, mimeType?: string) => Promise<boolean>;
  exportKeepNoteImage?: (
    title: string,
    body: string,
    checklist: string[],
    colorHex: string,
    imageUri?: string,
    audioLabel?: string,
  ) => Promise<PickedAttachment>;
  saveFileToDownloads?: (
    uri: string,
    fileName: string,
    mimeType?: string,
  ) => Promise<string>;
  shareFiles?: (
    title: string,
    text: string,
    uris: string[],
    mimeTypes: string[],
  ) => Promise<boolean>;
  consumePendingPickedFile?: () => Promise<PendingPickedFileResult | null>;
};

type PersistedAppState = {
  officeLocationCoords?: SavedLocation | null;
  officeAutoMessage?: boolean;
  officeArrivalEnabled?: boolean;
  officeDepartureEnabled?: boolean;
  officeArrivalMessage?: string;
  officeDepartureMessage?: string;
  officeMessageRecipients?: Contact[];
  officeActive?: boolean;
  officeInsideZone?: boolean;
  officeLogs?: OfficeLog[];
  voiceRecorderEnabled?: boolean;
  voiceAutoStart?: boolean;
  voiceRecordScope?: VoiceRecorderScope;
  voiceSelectedLine?: VoiceRecorderLine;
  voicePersonalNumber?: string;
  voiceOfficeNumber?: string;
  voiceCustomLabel?: string;
  voiceCustomNumber?: string;
  voiceSelectedSimId?: string | null;
  voiceContacts?: Contact[];
  voiceLogs?: VoiceRecorderLog[];
};

type IconSpec = {
  family: "ion" | "feather" | "material";
  name: string;
};

type ModuleCard = {
  key: ModuleScreen;
  title: string;
  subtitle: string;
  softColor: string;
  accentColor: string;
  icon: IconSpec;
};

const palette = {
  background: "#f7f3ef",
  surface: "#ffffff",
  surfaceSoft: "#e5d8cc",
  text: "#17223a",
  muted: "#6a7c97",
  line: "#e8edf5",
  coral: "#f45d6f",
  amber: "#f7b52c",
  mint: "#23d3b6",
  teal: "#14b8d4",
  blue: "#5e8df7",
  indigo: "#6c63ff",
  violet: "#7c3aed",
  orange: "#ff8d0a",
  green: "#20c997",
  navy: "#24324b",
  redSoft: "#fff1f3",
  cyanSoft: "#e9fbff",
  orangeSoft: "#fff4df",
  violetSoft: "#f1ebff",
  blueSoft: "#eaf3ff",
  graySoft: "#f1f5fb",
};

const contactsSeed: Contact[] = [
  { id: "mom", name: "Mom", relation: "Family", phone: "+91 98765 00001", emoji: "👩" },
  { id: "husband", name: "Husband", relation: "Husband", phone: "+91 98765 00003", emoji: "💑" },
  { id: "sis", name: "Riya", relation: "Sister", phone: "+91 98765 00005", emoji: "👧" },
  { id: "boss", name: "Priya", relation: "Office", phone: "+91 98765 00008", emoji: "💼" },
  { id: "hr", name: "HR Desk", relation: "Office", phone: "+91 98765 00011", emoji: "☎️" },
];

const reminderSeed: Reminder[] = [
  {
    id: "r1",
    title: "Doctor visit",
    date: "2026-03-20",
    time: "10:30",
    event: "Health",
  },
  {
    id: "r2",
    title: "Team review",
    date: "2026-03-20",
    time: "15:00",
    event: "Work",
  },
];

const todoSeed: TodoTask[] = [
  {
    id: "todo-seed-1",
    title: "Go to church",
    details: "Leave early and carry the prayer notebook.",
    date: formatLocalDateInput(new Date()),
    time: "08:00",
    done: true,
    createdAt: Date.now(),
  },
  {
    id: "todo-seed-2",
    title: "Cook for the family",
    details: "Prepare lunch and keep vegetables ready for dinner.",
    date: formatLocalDateInput(new Date()),
    time: "12:00",
    done: true,
    createdAt: Date.now() + 1,
  },
  {
    id: "todo-seed-3",
    title: "Wash my clothes",
    details: "Separate white clothes before starting the machine.",
    date: formatLocalDateInput(new Date()),
    time: "14:00",
    done: true,
    createdAt: Date.now() + 2,
  },
  {
    id: "todo-seed-4",
    title: "Visit Chastity",
    details: "Call once before leaving to confirm timing.",
    date: formatLocalDateInput(new Date()),
    time: "17:00",
    done: false,
    createdAt: Date.now() + 3,
  },
  {
    id: "todo-seed-5",
    title: "Make my hair",
    details: "Book a quick appointment if the salon is open.",
    date: formatLocalDateInput(new Date()),
    time: "18:00",
    done: true,
    createdAt: Date.now() + 4,
  },
  {
    id: "todo-seed-6",
    title: "Call my brother",
    details: "Ask about his travel plan for the weekend.",
    date: formatLocalDateInput(new Date()),
    time: "20:00",
    done: false,
    createdAt: Date.now() + 5,
  },
];

const keepNoteColors = [
  "#ffffff",
  "#fff2d9",
  "#ffe3ea",
  "#e7f7ff",
  "#e6f4ea",
  "#efe7ff",
];

const keepNoteSeed: KeepNote[] = [
  {
    id: "keep-seed-1",
    title: "Lifebalance App",
    body:
      "Modules 1. Rest mode\n\nFeatures:\n1. Select 1h, 2h, 3h or custom time.\n2. Choose priority contacts for urgent calls.",
    listCategories: [],
    checklist: [],
    color: "#ffffff",
    pinned: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "keep-seed-2",
    title: "House rent",
    body: "Previous reading 2030\nCurrent reading 2172\nHouse rent = 6000",
    listCategories: ["Home", "Bills"],
    checklist: [
      { id: "keep-seed-2-item-1", text: "Meter difference 142", checked: true },
      { id: "keep-seed-2-item-2", text: "Water bill pending", checked: false },
    ],
    color: "#ffdbe2",
    pinned: false,
    createdAt: Date.now() + 1,
    updatedAt: Date.now() + 1,
  },
];

const expenseCategories: ExpenseCategoryDefinition[] = [
  {
    id: "coffee",
    label: "Coffee",
    icon: { family: "ion", name: "cafe-outline" },
    accentColor: "#8a19ff",
    softColor: "#efe6ff",
  },
  {
    id: "gift",
    label: "Gift",
    icon: { family: "ion", name: "gift-outline" },
    accentColor: "#8a19ff",
    softColor: "#efe6ff",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: { family: "ion", name: "mail-outline" },
    accentColor: "#8a19ff",
    softColor: "#efe6ff",
  },
  {
    id: "tea-snacks",
    label: "Tea & Snacks",
    icon: { family: "ion", name: "restaurant-outline" },
    accentColor: "#8a19ff",
    softColor: "#efe6ff",
  },
  {
    id: "salary",
    label: "Salary",
    icon: { family: "ion", name: "cash-outline" },
    accentColor: "#18a957",
    softColor: "#e7f8ed",
  },
];

const expenseSeed: ExpenseEntry[] = [];

const muteAppSeed: MuteApp[] = [
  {
    id: "com.instagram.android",
    packageName: "com.instagram.android",
    name: "Instagram",
    type: "SOCIAL",
    color: "#ef2c92",
    muted: true,
    letter: "I",
  },
  {
    id: "com.whatsapp",
    packageName: "com.whatsapp",
    name: "WhatsApp",
    type: "COMMUNICATION",
    color: "#09c651",
    muted: false,
    letter: "W",
  },
  {
    id: "com.slack",
    packageName: "com.slack",
    name: "Slack",
    type: "WORK",
    color: "#7a16ff",
    muted: false,
    letter: "S",
  },
  {
    id: "com.google.android.gm",
    packageName: "com.google.android.gm",
    name: "Email",
    type: "PRODUCTIVITY",
    color: "#3b82f6",
    muted: true,
    letter: "E",
  },
  {
    id: "com.google.android.youtube",
    packageName: "com.google.android.youtube",
    name: "YouTube",
    type: "MEDIA",
    color: "#ff3333",
    muted: false,
    letter: "Y",
  },
];

const muteAppColorScale = [
  "#ef2c92",
  "#09c651",
  "#7a16ff",
  "#3b82f6",
  "#ff7a00",
  "#14b8d4",
  "#24324b",
  "#f45d6f",
];

function getMuteAppColor(seed: string) {
  const hash = seed
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return muteAppColorScale[hash % muteAppColorScale.length];
}

const officeArrivalPresets = [
  "I've arrived at the office. Good morning!",
  "Reached office safely. Starting work now.",
];

const officeDeparturePresets = [
  "I'm leaving office. Have a great evening!",
  "Leaving the office now. Heading back soon.",
];

function getMuteAppLetter(name: string) {
  const match = name.trim().match(/[A-Za-z0-9]/);
  return (match?.[0] ?? "?").toUpperCase();
}

function normalizeMuteAppRecord(app: NativeInstalledApp, muted: boolean): MuteApp {
  return {
    id: app.packageName,
    packageName: app.packageName,
    name: app.name,
    type: app.type,
    color: getMuteAppColor(app.packageName),
    muted,
    letter: getMuteAppLetter(app.name),
    iconUri: app.iconUri,
  };
}

function buildMutePackageState(items: MuteApp[]) {
  const mutedPackages = new Set<string>();

  items.forEach((item) => {
    const packageName =
      typeof item.packageName === "string" && item.packageName.length > 0
        ? item.packageName
        : item.id.includes(".")
          ? item.id
          : "";

    if (item.muted && packageName) {
      mutedPackages.add(packageName);
    }
  });

  return mutedPackages;
}

function getRestPriorityAvatarBackground(contactId: string) {
  switch (contactId) {
    case "mom":
      return "#c8f3f8";
    case "husband":
      return "#ffd9df";
    case "sis":
      return "#f0dcff";
    default:
      return "#dfe5ff";
  }
}

function getOfficeAvatarBackground(contactId: string) {
  switch (contactId) {
    case "boss":
      return "#ffdbe2";
    case "hr":
      return "#d9e9ff";
    case "mom":
      return "#dff7f1";
    default:
      return "#e4ebff";
  }
}

const moduleCards: ModuleCard[] = [
  {
    key: "rest",
    title: "Rest Mode",
    subtitle: "Quiet hours",
    softColor: "#eef0ff",
    accentColor: palette.indigo,
    icon: { family: "ion", name: "moon-outline" },
  },
  {
    key: "reminder",
    title: "Keep Notes",
    subtitle: "Text, media, lists",
    softColor: "#efedff",
    accentColor: "#5b64c9",
    icon: { family: "ion", name: "document-text-outline" },
  },
  {
    key: "todo",
    title: "Smart To-Do",
    subtitle: "AI lists",
    softColor: "#ddfff0",
    accentColor: "#0b9d73",
    icon: { family: "feather", name: "check-square" },
  },
  {
    key: "expense",
    title: "Expense Tracker",
    subtitle: "Money dashboard",
    softColor: "#f3ecff",
    accentColor: "#8a19ff",
    icon: { family: "ion", name: "wallet-outline" },
  },
  {
    key: "voice",
    title: "Voice Recorder",
    subtitle: "Auto call capture",
    softColor: "#efe8ff",
    accentColor: "#7c3aed",
    icon: { family: "ion", name: "mic-outline" },
  },
  {
    key: "office",
    title: "Office Mode",
    subtitle: "Location focus",
    softColor: "#eaf3ff",
    accentColor: "#2563eb",
    icon: { family: "material", name: "briefcase-outline" },
  },
  {
    key: "driving",
    title: "Driving Mode",
    subtitle: "Auto safety",
    softColor: "#f0e8ff",
    accentColor: palette.violet,
    icon: { family: "material", name: "car-outline" },
  },
  {
    key: "mute",
    title: "Mute Apps",
    subtitle: "Notification filter",
    softColor: "#f1f5fb",
    accentColor: "#5d6b84",
    icon: { family: "material", name: "bell-off-outline" },
  },
  {
    key: "exercise",
    title: "Exercise",
    subtitle: "GPS tracking",
    softColor: "#e9fbff",
    accentColor: "#0891b2",
    icon: { family: "material", name: "pulse" },
  },
];

const navItems: Array<{
  key: RootScreen;
  label: string;
  icon: IconSpec;
}> = [
  { key: "home", label: "Home", icon: { family: "ion", name: "home-outline" } },
  {
    key: "schedule",
    label: "Keep",
    icon: { family: "ion", name: "document-text-outline" },
  },
  { key: "modes", label: "Modes", icon: { family: "ion", name: "grid-outline" } },
  { key: "profile", label: "Profile", icon: { family: "ion", name: "person-outline" } },
];

const REST_STORAGE_KEY = "lifebalance/rest-mode";
const APP_STORAGE_KEY = "lifebalance/app-state";
const KEEP_DRAFT_STORAGE_KEY = "lifebalance/keep-draft";
const EXPENSE_STORAGE_VERSION = 2;
const REMINDER_CHANNEL_ID = "lifebalance-reminders";
const OFFICE_GEOFENCE_TASK = "lifebalance-office-geofence";
const OFFICE_GEOFENCE_IDENTIFIER = "office-zone";
const OFFICE_GEOFENCE_RADIUS_METERS = 250;
const LifeBalanceNative = NativeModules.LifeBalanceNative as
  | LifeBalanceNativeModuleShape
  | undefined;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function normalizePhoneNumber(value?: string) {
  return (value ?? "").replace(/[^\d+]/g, "");
}

async function readPersistedAppState() {
  const raw = await AsyncStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedAppState;
  } catch {
    return null;
  }
}

async function readPersistedKeepDraft() {
  const raw = await AsyncStorage.getItem(KEEP_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizeKeepDraftState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function persistKeepDraftState(nextState: KeepDraftPersistence) {
  await AsyncStorage.setItem(KEEP_DRAFT_STORAGE_KEY, JSON.stringify(nextState));
}

async function clearPersistedKeepDraft() {
  await AsyncStorage.removeItem(KEEP_DRAFT_STORAGE_KEY);
}

function buildKeepDraftPersistenceState(input: {
  editingNoteId: string | null;
  title: string;
  body: string;
  listCategories: string[];
  listCategoryInput: string;
  activeListCategory: string | null;
  categoryComposerVisible: boolean;
  checklist: KeepChecklistItem[];
  color: string;
  pinned: boolean;
  listMode: boolean;
  image?: PickedAttachment;
  audio?: PickedAttachment;
}): KeepDraftPersistence {
  return {
    editingNoteId: input.editingNoteId,
    title: input.title,
    body: input.body,
    listCategories: [...input.listCategories],
    listCategoryInput: input.listCategoryInput,
    activeListCategory: input.activeListCategory,
    categoryComposerVisible: input.categoryComposerVisible,
    checklist: input.checklist.map((item) => ({ ...item })),
    color: input.color,
    pinned: input.pinned,
    listMode: input.listMode,
    image: input.image ? { ...input.image } : undefined,
    audio: input.audio ? { ...input.audio } : undefined,
  };
}

function buildOfficeTaskLog(type: OfficeLog["type"], text: string): OfficeLog {
  return {
    id: `office-task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text,
    timestamp: Date.now(),
  };
}

async function persistOfficeTaskState(nextState: PersistedAppState) {
  const current = (await readPersistedAppState()) ?? {};
  await AsyncStorage.setItem(
    APP_STORAGE_KEY,
    JSON.stringify({
      ...current,
      ...nextState,
    }),
  );
}

async function sendOfficeBackgroundSms(message: string, recipients: Contact[] = []) {
  if (Platform.OS !== "android" || !LifeBalanceNative?.sendSmsDirect) {
    return false;
  }

  const numbers = recipients.map((contact) => normalizePhoneNumber(contact.phone)).filter(Boolean);
  if (!numbers.length) return false;

  await LifeBalanceNative.sendSmsDirect(numbers, message);
  return true;
}

try {
  TaskManager.defineTask(OFFICE_GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
      console.warn("Office geofence task failed", error.message);
      return;
    }

    const eventType = (data as { eventType?: Location.GeofencingEventType } | undefined)?.eventType;
    if (
      eventType !== Location.GeofencingEventType.Enter &&
      eventType !== Location.GeofencingEventType.Exit
    ) {
      return;
    }

    const stored = await readPersistedAppState();
    if (!stored?.officeActive || !stored.officeLocationCoords) {
      return;
    }

    const entering = eventType === Location.GeofencingEventType.Enter;
    const wasInside = Boolean(stored.officeInsideZone);
    if (entering === wasInside) {
      return;
    }

    const logs = Array.isArray(stored.officeLogs) ? stored.officeLogs : [];
    const nextLogs = [...logs];

    if (entering) {
      const detail =
        stored.officeAutoMessage && stored.officeArrivalEnabled
          ? `Reached office. ${stored.officeArrivalMessage ?? officeArrivalPresets[0]}`
          : "Reached office.";
      nextLogs.unshift(buildOfficeTaskLog("arrival", detail));

      if (stored.officeAutoMessage && stored.officeArrivalEnabled) {
        const sent = await sendOfficeBackgroundSms(
          stored.officeArrivalMessage ?? officeArrivalPresets[0],
          stored.officeMessageRecipients,
        ).catch(() => false);

        if (!sent) {
          nextLogs.unshift(
            buildOfficeTaskLog(
              "check",
              "Background arrival auto-message could not be sent. Check SMS permission and recipients.",
            ),
          );
        }
      }
    } else {
      const detail =
        stored.officeAutoMessage && stored.officeDepartureEnabled
          ? `Left office. ${stored.officeDepartureMessage ?? officeDeparturePresets[0]}`
          : "Left office.";
      nextLogs.unshift(buildOfficeTaskLog("departure", detail));

      if (stored.officeAutoMessage && stored.officeDepartureEnabled) {
        const sent = await sendOfficeBackgroundSms(
          stored.officeDepartureMessage ?? officeDeparturePresets[0],
          stored.officeMessageRecipients,
        ).catch(() => false);

        if (!sent) {
          nextLogs.unshift(
            buildOfficeTaskLog(
              "check",
              "Background departure auto-message could not be sent. Check SMS permission and recipients.",
            ),
          );
        }
      }
    }

    await persistOfficeTaskState({
      officeInsideZone: entering,
      officeLogs: nextLogs.slice(0, 8),
    });
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("has already been defined")) {
    console.warn("Unable to define office geofence task", message);
  }
}

function renderIcon(spec: IconSpec, color: string, size: number) {
  if (spec.family === "ion") {
    return <Ionicons name={spec.name as never} size={size} color={color} />;
  }

  if (spec.family === "feather") {
    return <Feather name={spec.name as never} size={size} color={color} />;
  }

  return (
    <MaterialCommunityIcons
      name={spec.name as never}
      size={size}
      color={color}
    />
  );
}

function formatTimeLabel(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatEndLabel(totalMinutes: number) {
  const end = new Date(Date.now() + totalMinutes * 60 * 1000);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(end);
}

function formatClockLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function parseDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReminderDateLabel(date: string) {
  const parsed = parseDateTime(date, "09:00");
  if (!parsed) return date;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function formatReminderTimeLabel(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hours = Number(hourRaw);
  const minutes = Number(minuteRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function buildReminderTime(hour12: number, minute: number, period: "AM" | "PM") {
  let hours24 = hour12 % 12;
  if (period === "PM") hours24 += 12;
  return `${String(hours24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseReminderTimeParts(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hours = Number(hourRaw);
  const minutes = Number(minuteRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { hour12: 9, minute: 0, period: "AM" as const };
  }

  return {
    hour12: hours % 12 || 12,
    minute: minutes,
    period: (hours >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

function buildTodoDateOptions(count = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const next = new Date(today);
    next.setDate(today.getDate() + index);

    return {
      value: formatLocalDateInput(next),
      dayNumber: String(next.getDate()),
      weekday: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(next),
    };
  });
}

function sortTodoTasks(items: TodoTask[]) {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    return a.createdAt - b.createdAt;
  });
}

function normalizeTodoTasks(value: unknown) {
  if (!Array.isArray(value)) {
    return sortTodoTasks(todoSeed);
  }

  const defaultTimes = ["08:00", "12:00", "14:00", "17:00", "18:00", "20:00"];
  const today = formatLocalDateInput(new Date());

  const normalized = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    if (
      typeof record.title === "string" &&
      typeof record.date === "string" &&
      typeof record.time === "string"
    ) {
      return [
        {
          id:
            typeof record.id === "string" && record.id.length
              ? record.id
              : `todo-${Date.now()}-${index}`,
          title: record.title.trim() || `Task ${index + 1}`,
          details: typeof record.details === "string" ? record.details.trim() : "",
          date: record.date,
          time: record.time,
          done: Boolean(record.done),
          createdAt:
            typeof record.createdAt === "number" ? record.createdAt : Date.now() + index,
          notificationId:
            typeof record.notificationId === "string" ? record.notificationId : undefined,
        } satisfies TodoTask,
      ];
    }

    if (typeof record.title === "string") {
      return [
        {
          id:
            typeof record.id === "string" && record.id.length
              ? `legacy-${record.id}`
              : `legacy-todo-${index}`,
          title: record.title.trim() || `Task ${index + 1}`,
          details: "",
          date: today,
          time: defaultTimes[index % defaultTimes.length],
          done: Boolean(record.done),
          createdAt: Date.now() + index,
        } satisfies TodoTask,
      ];
    }

    return [];
  });

  return normalized.length ? sortTodoTasks(normalized) : sortTodoTasks(todoSeed);
}

function sortKeepNotes(items: KeepNote[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

function normalizePickedAttachment(input: unknown) {
  if (!input || typeof input !== "object") return undefined;
  const attachment = input as Record<string, unknown>;
  if (typeof attachment.uri !== "string" || !attachment.uri.trim()) return undefined;

  return {
    uri: attachment.uri,
    name:
      typeof attachment.name === "string" && attachment.name.trim()
        ? attachment.name.trim()
        : "Attachment",
    mimeType: typeof attachment.mimeType === "string" ? attachment.mimeType : undefined,
    size: typeof attachment.size === "number" ? attachment.size : undefined,
    durationMs: typeof attachment.durationMs === "number" ? attachment.durationMs : undefined,
  } satisfies PickedAttachment;
}

function normalizeKeepDraftState(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const checklist =
    Array.isArray(record.checklist)
      ? record.checklist.flatMap((entry, entryIndex) => {
          if (!entry || typeof entry !== "object") return [];
          const itemRecord = entry as Record<string, unknown>;
          if (typeof itemRecord.text !== "string") return [];

          return [
            {
              id:
                typeof itemRecord.id === "string" && itemRecord.id.length
                  ? itemRecord.id
                  : `keep-draft-item-${entryIndex}`,
              text: itemRecord.text,
              checked: Boolean(itemRecord.checked),
              category:
                typeof itemRecord.category === "string" && itemRecord.category.trim()
                  ? itemRecord.category.trim()
                  : undefined,
            } satisfies KeepChecklistItem,
          ];
        })
      : [];
  const checklistCategories = checklist.flatMap((item) => (item.category ? [item.category] : []));
  const listCategories = [
    ...(Array.isArray(record.listCategories)
      ? record.listCategories.flatMap((entry) =>
          typeof entry === "string" && entry.trim() ? [entry.trim()] : [],
        )
      : typeof record.listCategory === "string" && record.listCategory.trim()
        ? [record.listCategory.trim()]
        : []),
    ...checklistCategories,
  ].filter((category, index, categories) => categories.indexOf(category) === index);

  return {
    editingNoteId: typeof record.editingNoteId === "string" ? record.editingNoteId : null,
    title: typeof record.title === "string" ? record.title : "",
    body: typeof record.body === "string" ? record.body : "",
    listCategories,
    listCategoryInput:
      typeof record.listCategoryInput === "string" ? record.listCategoryInput : "",
    activeListCategory:
      typeof record.activeListCategory === "string" && record.activeListCategory.trim()
        ? record.activeListCategory.trim()
        : listCategories[0] ?? null,
    categoryComposerVisible: Boolean(record.categoryComposerVisible),
    checklist,
    color:
      typeof record.color === "string" && keepNoteColors.includes(record.color)
        ? record.color
        : keepNoteColors[0],
    pinned: Boolean(record.pinned),
    listMode: Boolean(record.listMode) || listCategories.length > 0 || checklist.length > 0,
    image: normalizePickedAttachment(record.image),
    audio: normalizePickedAttachment(record.audio),
  } satisfies KeepDraftPersistence;
}

function normalizeKeepNotes(value: unknown) {
  if (!Array.isArray(value)) {
    return sortKeepNotes(keepNoteSeed);
  }

  if (value.length === 0) {
    return [];
  }

  const normalized = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" && typeof record.body !== "string") {
      return [];
    }

    const checklist =
      Array.isArray(record.checklist)
        ? record.checklist.flatMap((entry, entryIndex) => {
            if (!entry || typeof entry !== "object") return [];
            const itemRecord = entry as Record<string, unknown>;
            if (typeof itemRecord.text !== "string") return [];

            return [
              {
                id:
                  typeof itemRecord.id === "string" && itemRecord.id.length
                    ? itemRecord.id
                    : `keep-item-${index}-${entryIndex}`,
                text: itemRecord.text,
                checked: Boolean(itemRecord.checked),
                category:
                  typeof itemRecord.category === "string" && itemRecord.category.trim()
                    ? itemRecord.category.trim()
                    : undefined,
              } satisfies KeepChecklistItem,
            ];
          })
        : [];
    const checklistCategories = checklist.flatMap((item) => (item.category ? [item.category] : []));
    const listCategories = [
      ...(Array.isArray(record.listCategories)
        ? record.listCategories.flatMap((entry) =>
            typeof entry === "string" && entry.trim() ? [entry.trim()] : [],
          )
        : typeof record.listCategory === "string" && record.listCategory.trim()
          ? [record.listCategory.trim()]
          : []),
      ...checklistCategories,
    ].filter((category, categoryIndex, categories) => categories.indexOf(category) === categoryIndex);

    return [
      {
        id:
          typeof record.id === "string" && record.id.length
            ? record.id
            : `keep-${Date.now()}-${index}`,
        title: typeof record.title === "string" ? record.title.trim() : "",
        body: typeof record.body === "string" ? record.body.trim() : "",
        listCategories,
        checklist,
        color:
          typeof record.color === "string" && record.color.trim()
            ? record.color
            : keepNoteColors[index % keepNoteColors.length],
        pinned: Boolean(record.pinned),
        image: normalizePickedAttachment(record.image),
        audio: normalizePickedAttachment(record.audio),
        createdAt:
          typeof record.createdAt === "number" ? record.createdAt : Date.now() + index,
        updatedAt:
          typeof record.updatedAt === "number" ? record.updatedAt : Date.now() + index,
      } satisfies KeepNote,
    ];
  });

  return normalized.length ? sortKeepNotes(normalized) : [];
}

function buildKeepChecklistSections(categories: string[], checklist: KeepChecklistItem[]) {
  const normalizedCategories = categories.filter(
    (category, index, allCategories) => category.trim() && allCategories.indexOf(category) === index,
  );

  const sections = normalizedCategories.map((category) => ({
    key: `keep-section-${category}`,
    title: category,
    items: checklist.filter((item) => item.category === category),
  }));

  const uncategorizedItems = checklist.filter(
    (item) => !item.category || !normalizedCategories.includes(item.category),
  );

  if (uncategorizedItems.length) {
    sections.unshift({
      key: "keep-section-uncategorized",
      title: normalizedCategories.length ? "Other items" : "",
      items: uncategorizedItems,
    });
  }

  return sections.filter((section) => section.title || section.items.length);
}

function normalizeExpenseEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [...expenseSeed].sort((a, b) => b.timestamp - a.timestamp);
  }

  const normalized = value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.amount !== "number") return [];

    return [
      {
        id:
          typeof record.id === "string" && record.id.length
            ? record.id
            : `expense-${Date.now()}-${index}`,
        amount: Math.max(0, Math.round(record.amount)),
        categoryId:
          typeof record.categoryId === "string" &&
          expenseCategories.some((category) => category.id === record.categoryId)
            ? record.categoryId
            : expenseCategories[0].id,
        categoryLabel:
          typeof record.categoryLabel === "string" && record.categoryLabel.trim()
            ? record.categoryLabel.trim()
            : getExpenseCategory(
                typeof record.categoryId === "string" ? record.categoryId : expenseCategories[0].id,
              ).label,
        description: typeof record.description === "string" ? record.description.trim() : "",
        kind: record.kind === "credit" ? "credit" : "debit",
        timestamp: typeof record.timestamp === "number" ? record.timestamp : Date.now() + index,
      } satisfies ExpenseEntry,
    ];
  });

  return normalized.length
    ? normalized.sort((left, right) => right.timestamp - left.timestamp)
    : [];
}

function normalizeVoiceRecorderLogs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.text !== "string") return [];

    return [
      {
        id:
          typeof record.id === "string" && record.id.length
            ? record.id
            : `voice-log-${Date.now()}-${index}`,
        text: record.text.trim(),
        timestamp: typeof record.timestamp === "number" ? record.timestamp : Date.now() + index,
        type:
          record.type === "match" || record.type === "skip" || record.type === "info"
            ? record.type
            : "info",
      } satisfies VoiceRecorderLog,
    ];
  });
}

function normalizeVoiceRecordedCalls(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as VoiceRecordedCall[];
  }

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.callerNumber !== "string") return [];
    const recordingUri = typeof record.uri === "string" ? record.uri.trim() : "";
    if (!recordingUri) return [];

    return [
      {
        id:
          typeof record.id === "string" && record.id.length
            ? record.id
            : `voice-call-${Date.now()}-${index}`,
        callerNumber: record.callerNumber.trim() || "Unknown number",
        lineLabel:
          typeof record.lineLabel === "string" && record.lineLabel.trim()
            ? record.lineLabel.trim()
            : "Detected SIM",
        lineNumber:
          typeof record.lineNumber === "string" && record.lineNumber.trim()
            ? record.lineNumber.trim()
            : "",
        uri: recordingUri,
        mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
        durationMs: typeof record.durationMs === "number" ? record.durationMs : undefined,
        size: typeof record.size === "number" ? record.size : undefined,
        sourceLabel:
          typeof record.sourceLabel === "string" && record.sourceLabel.trim()
            ? record.sourceLabel.trim()
            : undefined,
        timestamp: typeof record.timestamp === "number" ? record.timestamp : Date.now() + index,
        status: "recorded",
      } satisfies VoiceRecordedCall,
    ];
  });
}

function formatVoiceRecordingDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return "Duration unavailable";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getVoiceSelectedSim(simCards: SimCardInfo[], selectedSimId: string | null) {
  if (!selectedSimId) return null;
  return simCards.find((sim) => sim.id === selectedSimId) ?? null;
}

function getVoiceEffectiveLineLabel(
  simCards: SimCardInfo[],
  selectedSimId: string | null,
) {
  const selectedSim = getVoiceSelectedSim(simCards, selectedSimId);
  if (selectedSim) {
    return selectedSim.displayName || selectedSim.carrierName || `SIM ${selectedSim.slotIndex + 1}`;
  }
  return "Detected SIM";
}

function getVoiceEffectiveLineNumber(
  simCards: SimCardInfo[],
  selectedSimId: string | null,
) {
  const selectedSim = getVoiceSelectedSim(simCards, selectedSimId);
  if (selectedSim?.number?.trim()) {
    return selectedSim.number.trim();
  }
  return "";
}

function getExpenseCategory(categoryId: string) {
  return (
    expenseCategories.find((category) => category.id === categoryId) ?? expenseCategories[0]
  );
}

function formatExpenseAmount(amount: number) {
  const normalized = Math.round(amount);
  const prefix = normalized < 0 ? "-₹ " : "₹ ";
  return `${prefix}${Math.abs(normalized).toLocaleString("en-IN")}`;
}

function formatExpenseHistoryAmount(amount: number, kind: "debit" | "credit" = "debit") {
  const prefix = kind === "credit" ? "+" : "-";
  return `${prefix}₹${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;
}

function getExpenseDayLabel(timestamp: number) {
  const entryDate = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const entryStart = new Date(
    entryDate.getFullYear(),
    entryDate.getMonth(),
    entryDate.getDate(),
  ).getTime();
  const diffDays = Math.round((todayStart - entryStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDateStamp(timestamp);
}

function getExpenseYearKey(timestamp: number) {
  return String(new Date(timestamp).getFullYear());
}

function formatExpenseMonthLabel(monthValue: string) {
  const monthRaw = monthValue.includes("-") ? monthValue.split("-")[1] : monthValue;
  const month = Number(monthRaw);
  if (Number.isNaN(month)) return monthValue;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(new Date(2026, month - 1, 1));
}

function getExpenseReportSummary(entries: ExpenseEntry[]) {
  return entries.reduce(
    (summary, entry) => {
      if (entry.kind === "credit") {
        summary.received += entry.amount;
      } else {
        summary.withdrawn += entry.amount;
      }
      return summary;
    },
    { received: 0, withdrawn: 0 },
  );
}

function buildExpenseSections(entries: ExpenseEntry[]) {
  const sectionOrder: string[] = [];
  const grouped = new Map<string, ExpenseEntry[]>();

  entries.forEach((entry) => {
    const label = getExpenseDayLabel(entry.timestamp);
    if (!grouped.has(label)) {
      grouped.set(label, []);
      sectionOrder.push(label);
    }
    grouped.get(label)?.push(entry);
  });

  return sectionOrder.map((label) => ({
    label,
    entries: (grouped.get(label) ?? []).sort((left, right) => right.timestamp - left.timestamp),
  }));
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function formatAttachmentSize(size?: number | null) {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "keep-note";
}

function formatDateStamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isRootScreen(screen: Screen): screen is RootScreen {
  return (
    screen === "home" ||
    screen === "schedule" ||
    screen === "modes" ||
    screen === "profile"
  );
}

function withTimeout<T>(promise: Promise<T>, label: string, ms = 8000) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]);
}

function AppCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function GradientButton({
  label,
  colors,
  onPress,
  small,
}: {
  label: string;
  colors: [string, string];
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={small ? undefined : styles.fullButtonWrap}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradientButton, small && styles.gradientButtonSmall]}
      >
        <Text style={styles.gradientButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
  activeColor = palette.coral,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: activeColor, shadowColor: activeColor }
          : styles.chipInactive,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TogglePill({
  value,
  onToggle,
  activeColor = palette.coral,
}: {
  value: boolean;
  onToggle: () => void;
  activeColor?: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? activeColor : "#d9e1ee" },
      ]}
    >
      <View
        style={[
          styles.toggleKnob,
          value ? styles.toggleKnobOn : styles.toggleKnobOff,
        ]}
      />
    </Pressable>
  );
}

function IconCircle({
  icon,
  softColor,
  accentColor,
}: {
  icon: IconSpec;
  softColor: string;
  accentColor: string;
}) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: softColor }]}>
      {renderIcon(icon, accentColor, 28)}
    </View>
  );
}

function ModuleTile({
  module,
  active,
  onPress,
}: {
  module: ModuleCard;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.moduleTileWrap}>
      <View
        style={[
          styles.moduleTile,
          active && { borderColor: module.accentColor, borderWidth: 2 },
        ]}
      >
        <IconCircle
          icon={module.icon}
          softColor={module.softColor}
          accentColor={module.accentColor}
        />
        {active ? <View style={styles.activeDot} /> : null}
      </View>
      <Text style={styles.moduleTitle}>{module.title}</Text>
    </Pressable>
  );
}

function Header({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={palette.text} />
        </Pressable>
      ) : (
        <View style={styles.backButtonGhost} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function SearchBar({
  value,
  onChangeText,
  placeholder,
  containerStyle,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.searchWrap, containerStyle]}>
      <Feather name="search" size={24} color={palette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.searchInput}
      />
    </View>
  );
}

function SoftInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.muted}
      keyboardType={keyboardType}
      style={styles.softInput}
    />
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  softColor,
  accentColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: IconSpec;
  softColor: string;
  accentColor: string;
}) {
  return (
    <AppCard style={styles.metricCard}>
      <IconCircle icon={icon} softColor={softColor} accentColor={accentColor} />
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
    </AppCard>
  );
}

function SettingRow({
  title,
  subtitle,
  icon,
  softColor,
  accentColor,
  right,
}: {
  title: string;
  subtitle: string;
  icon: IconSpec;
  softColor: string;
  accentColor: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <IconCircle icon={icon} softColor={softColor} accentColor={accentColor} />
        <View style={styles.settingTextWrap}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

function SliderPanel({
  label,
  minLabel,
  maxLabel,
  value,
  min,
  max,
  step,
  accentColor,
  formatValue,
  onChange,
}: {
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  formatValue?: (value: number) => string;
  onChange: (next: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const ratio = (value - min) / (max - min);

  return (
    <AppCard>
      <View style={styles.sliderHead}>
        <Text style={styles.sliderTitle}>{label}</Text>
        <Text style={[styles.sliderValue, { color: accentColor }]}>
          {formatValue ? formatValue(value) : formatTimeLabel(value)}
        </Text>
      </View>
      <Pressable
        style={styles.sliderTrackWrap}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => {
          const width = trackWidth || 1;
          const raw = min + (event.nativeEvent.locationX / width) * (max - min);
          const snapped = Math.round(raw / step) * step;
          const safe = Math.max(min, Math.min(max, snapped));
          onChange(safe);
        }}
      >
        <View style={styles.sliderTrack} />
        <View
          style={[
            styles.sliderFill,
            {
              width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
        <View
          style={[
            styles.sliderKnob,
            {
              left: `${Math.max(0, Math.min(100, ratio * 100))}%`,
              borderColor: accentColor,
              backgroundColor: accentColor,
            },
          ]}
        />
      </Pressable>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEdge}>{minLabel}</Text>
        <Text style={styles.sliderEdge}>{maxLabel}</Text>
      </View>
    </AppCard>
  );
}

function BottomNav({
  active,
  onSelect,
}: {
  active: RootScreen;
  onSelect: (screen: RootScreen) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={styles.bottomNavItem}
          >
            <View
              style={[
                styles.bottomNavIconWrap,
                isActive && {
                  backgroundColor: palette.coral,
                  shadowColor: palette.coral,
                },
              ]}
            >
              {renderIcon(item.icon, isActive ? "#ffffff" : palette.muted, 24)}
            </View>
            {!isActive ? (
              <Text style={styles.bottomNavLabel}>{item.label}</Text>
            ) : (
              <View style={styles.bottomNavDot} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [screenStack, setScreenStack] = useState<Screen[]>(["home"]);
  const currentScreen = screenStack[screenStack.length - 1];
  const currentRoot =
    screenStack.find((screen): screen is RootScreen => isRootScreen(screen)) ?? "home";
  const showBottomNav = isRootScreen(currentScreen);

  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [restPreset, setRestPreset] = useState<60 | 120 | 180 | "custom">(60);
  const [restCustomMinutes, setRestCustomMinutes] = useState(30);
  const [restPriorityEnabled, setRestPriorityEnabled] = useState(true);
  const [restMissedCalls, setRestMissedCalls] = useState(3);
  const [restPriorityContacts, setRestPriorityContacts] = useState<Contact[]>([
    contactsSeed[0],
    contactsSeed[1],
  ]);
  const [restSession, setRestSession] = useState<RestSession | null>(null);
  const [restCallScreeningReady, setRestCallScreeningReady] = useState(
    Platform.OS !== "android",
  );
  const [restTick, setRestTick] = useState(Date.now());
  const [restBlockedCalls, setRestBlockedCalls] = useState(0);
  const [restAllowedCalls, setRestAllowedCalls] = useState(0);
  const [restMissedStreak, setRestMissedStreak] = useState(0);
  const [restCallLogs, setRestCallLogs] = useState<RestCallLog[]>([]);
  const [restTestCaller, setRestTestCaller] = useState<string>("unknown");
  const [restContactPickerVisible, setRestContactPickerVisible] = useState(false);
  const [restAvailableContacts, setRestAvailableContacts] = useState<Contact[]>([]);
  const [restContactsLoading, setRestContactsLoading] = useState(false);
  const [restHydrated, setRestHydrated] = useState(false);
  const [appHydrated, setAppHydrated] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>(reminderSeed);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [reminderDebug, setReminderDebug] = useState<ReminderDebugState>({
    notificationPermission: false,
    exactAlarmReady: Platform.OS !== "android",
    popupReady: true,
    popupStatusLabel: Platform.OS === "android" ? "Checking reminder pop-up access..." : "Ready",
    scheduledCount: 0,
    lastStatus: "No reminder scheduled yet.",
  });

  const [keepNotes, setKeepNotes] = useState<KeepNote[]>(() => sortKeepNotes(keepNoteSeed));
  const [keepSearch, setKeepSearch] = useState("");
  const [keepGrid, setKeepGrid] = useState(false);
  const [keepQuickMenuOpen, setKeepQuickMenuOpen] = useState(false);
  const [keepComposerVisible, setKeepComposerVisible] = useState(false);
  const [keepEditingNoteId, setKeepEditingNoteId] = useState<string | null>(null);
  const [keepDraftTitle, setKeepDraftTitle] = useState("");
  const [keepDraftBody, setKeepDraftBody] = useState("");
  const [keepDraftListCategories, setKeepDraftListCategories] = useState<string[]>([]);
  const [keepDraftListCategoryInput, setKeepDraftListCategoryInput] = useState("");
  const [keepDraftActiveListCategory, setKeepDraftActiveListCategory] = useState<string | null>(
    null,
  );
  const [keepDraftChecklist, setKeepDraftChecklist] = useState<KeepChecklistItem[]>([]);
  const [keepDraftImage, setKeepDraftImage] = useState<PickedAttachment | undefined>();
  const [keepDraftAudio, setKeepDraftAudio] = useState<PickedAttachment | undefined>();
  const [keepDraftColor, setKeepDraftColor] = useState(keepNoteColors[0]);
  const [keepDraftPinned, setKeepDraftPinned] = useState(false);
  const [keepDraftListMode, setKeepDraftListMode] = useState(false);
  const [keepCategoryComposerVisible, setKeepCategoryComposerVisible] = useState(false);
  const [keepDraftRestoreReady, setKeepDraftRestoreReady] = useState(false);
  const keepQuickMenuAnim = useRef(new Animated.Value(0)).current;
  const keepDraftRestoreDoneRef = useRef(false);

  const [todos, setTodos] = useState<TodoTask[]>(() => sortTodoTasks(todoSeed));
  const [todoSearch, setTodoSearch] = useState("");
  const [todoSelectedDate, setTodoSelectedDate] = useState(() => formatLocalDateInput(new Date()));
  const [todoComposerVisible, setTodoComposerVisible] = useState(false);
  const [todoEditingTaskId, setTodoEditingTaskId] = useState<string | null>(null);
  const [todoDraftTitle, setTodoDraftTitle] = useState("");
  const [todoDraftDetails, setTodoDraftDetails] = useState("");
  const [todoDraftDate, setTodoDraftDate] = useState(() => formatLocalDateInput(new Date()));
  const [todoDraftTime, setTodoDraftTime] = useState("08:00");
  const [todoTimePickerVisible, setTodoTimePickerVisible] = useState(false);
  const [todoPickerHour, setTodoPickerHour] = useState(8);
  const [todoPickerMinute, setTodoPickerMinute] = useState(0);
  const [todoPickerPeriod, setTodoPickerPeriod] = useState<"AM" | "PM">("AM");

  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(() =>
    normalizeExpenseEntries(expenseSeed),
  );
  const [expenseComposerVisible, setExpenseComposerVisible] = useState(false);
  const [expenseReportsVisible, setExpenseReportsVisible] = useState(false);
  const [expenseReportDate, setExpenseReportDate] = useState(() =>
    String(new Date().getDate()),
  );
  const [expenseReportMonth, setExpenseReportMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [expenseReportYear, setExpenseReportYear] = useState(() =>
    getExpenseYearKey(Date.now()),
  );
  const [expenseReportDateMenuVisible, setExpenseReportDateMenuVisible] = useState(false);
  const [expenseReportMonthMenuVisible, setExpenseReportMonthMenuVisible] = useState(false);
  const [expenseReportYearMenuVisible, setExpenseReportYearMenuVisible] = useState(false);
  const [expenseCategoryMenuVisible, setExpenseCategoryMenuVisible] = useState(false);
  const [expenseDraftAmount, setExpenseDraftAmount] = useState("0");
  const [expenseDraftKind, setExpenseDraftKind] = useState<"debit" | "credit">("debit");
  const [expenseDraftCategoryId, setExpenseDraftCategoryId] = useState(expenseCategories[3].id);
  const [expenseDraftCategoryLabel, setExpenseDraftCategoryLabel] = useState(
    expenseCategories[3].label,
  );
  const [expenseDraftDescription, setExpenseDraftDescription] = useState(
    "Meeting and Snacks with Victor",
  );

  const [voiceRecorderEnabled, setVoiceRecorderEnabled] = useState(false);
  const [voiceAutoStart, setVoiceAutoStart] = useState(true);
  const [voiceSpeakerAssist, setVoiceSpeakerAssist] = useState(true);
  const [voiceRecordScope, setVoiceRecordScope] = useState<VoiceRecorderScope>("selected");
  const [voiceSelectedLine, setVoiceSelectedLine] = useState<VoiceRecorderLine>("office");
  const [voicePersonalNumber, setVoicePersonalNumber] = useState("+91 98765 00001");
  const [voiceOfficeNumber, setVoiceOfficeNumber] = useState("+91 79058 50993");
  const [voiceCustomLabel, setVoiceCustomLabel] = useState("Second SIM");
  const [voiceCustomNumber, setVoiceCustomNumber] = useState("");
  const [voiceSimCards, setVoiceSimCards] = useState<SimCardInfo[]>([]);
  const [voiceSelectedSimId, setVoiceSelectedSimId] = useState<string | null>(null);
  const [voiceSimLoading, setVoiceSimLoading] = useState(false);
  const [voiceContacts, setVoiceContacts] = useState<Contact[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceRecorderLog[]>([]);
  const [voiceRecordedCalls, setVoiceRecordedCalls] = useState<VoiceRecordedCall[]>([]);
  const [voiceStatus, setVoiceStatus] = useState(
    "Choose the active line and callers you want to auto-record.",
  );
  const [voiceContactPickerVisible, setVoiceContactPickerVisible] = useState(false);
  const [voiceAvailableContacts, setVoiceAvailableContacts] = useState<Contact[]>([]);
  const [voiceContactsLoading, setVoiceContactsLoading] = useState(false);
  const [voiceMicPermissionReady, setVoiceMicPermissionReady] = useState(
    Platform.OS !== "android",
  );
  const [voiceCallAccessReady, setVoiceCallAccessReady] = useState(
    Platform.OS !== "android",
  );

  const [officeLocationLabel, setOfficeLocationLabel] = useState("123 Tech Park, Innovation Blvd.");
  const [officeLocationCoords, setOfficeLocationCoords] = useState<SavedLocation | null>(null);
  const [officeLocationDraft, setOfficeLocationDraft] = useState("123 Tech Park, Innovation Blvd.");
  const [officeStart] = useState("09:00");
  const [officeEnd] = useState("18:00");
  const [officePriority, setOfficePriority] = useState<string[]>([
    "boss",
    "hr",
  ]);
  const [officePriorityExtraContacts, setOfficePriorityExtraContacts] = useState<Contact[]>([]);
  const [officeAutoMessage, setOfficeAutoMessage] = useState(true);
  const [officeArrivalEnabled, setOfficeArrivalEnabled] = useState(true);
  const [officeDepartureEnabled, setOfficeDepartureEnabled] = useState(true);
  const [officeArrivalMessage, setOfficeArrivalMessage] = useState(officeArrivalPresets[0]);
  const [officeDepartureMessage, setOfficeDepartureMessage] = useState(officeDeparturePresets[0]);
  const [officeMessageRecipients, setOfficeMessageRecipients] = useState<Contact[]>([]);
  const [officePriorityCallsEnabled, setOfficePriorityCallsEnabled] = useState(true);
  const [officeMuteUnknown, setOfficeMuteUnknown] = useState(true);
  const [officeQuickAddExpanded, setOfficeQuickAddExpanded] = useState(false);
  const [officeContactPickerVisible, setOfficeContactPickerVisible] = useState(false);
  const [officeContactPickerMode, setOfficeContactPickerMode] = useState<"priority" | "sms">(
    "priority",
  );
  const [officeAvailableContacts, setOfficeAvailableContacts] = useState<Contact[]>([]);
  const [officeContactsLoading, setOfficeContactsLoading] = useState(false);
  const [officeActive, setOfficeActive] = useState(false);
  const [officeInsideZone, setOfficeInsideZone] = useState(false);
  const [officeLogs, setOfficeLogs] = useState<OfficeLog[]>([]);

  const [drivingAutoDetect, setDrivingAutoDetect] = useState(true);
  const [drivingAutoReply, setDrivingAutoReply] = useState(true);
  const [drivingReplyText, setDrivingReplyText] = useState(
    "I'm driving, can you call later?",
  );
  const [drivingActive, setDrivingActive] = useState(false);
  const [drivingSpeed, setDrivingSpeed] = useState(0);
  const [drivingLogs, setDrivingLogs] = useState<DrivingLog[]>([]);
  const [drivingTestCaller, setDrivingTestCaller] = useState<string>("unknown");

  const [newsCategory, setNewsCategory] = useState("Tech");
  const [savedNewsIds, setSavedNewsIds] = useState<string[]>([]);

  const [muteSearch, setMuteSearch] = useState("");
  const [muteApps, setMuteApps] = useState<MuteApp[]>(muteAppSeed);
  const [muteAppsLoading, setMuteAppsLoading] = useState(Platform.OS === "android");
  const [muteListenerEnabled, setMuteListenerEnabled] = useState(false);
  const [muteSyncStatus, setMuteSyncStatus] = useState("Loading installed apps...");

  const [customDuration, setCustomDuration] = useState(45);
  const [customAbsoluteSilence, setCustomAbsoluteSilence] = useState(false);
  const [customMuteNotifications, setCustomMuteNotifications] = useState(true);
  const [customContactMode, setCustomContactMode] = useState<"mute-all" | "specific">(
    "specific",
  );
  const [customAllowedContacts, setCustomAllowedContacts] = useState<string[]>([
    "mom",
    "husband",
    "sis",
  ]);
  const [customSession, setCustomSession] = useState<CustomSession | null>(null);
  const [, setCustomTick] = useState(Date.now());
  const [customLogs, setCustomLogs] = useState<CustomLog[]>([]);

  const [exerciseGoal] = useState(30);
  const [exerciseActive, setExerciseActive] = useState(false);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [exerciseCalories, setExerciseCalories] = useState(0);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistory[]>([
    { id: "e1", date: "18 Mar", duration: "24 min", distance: "2.8 km" },
    { id: "e2", date: "17 Mar", duration: "31 min", distance: "3.6 km" },
  ]);
  const [exerciseStartedAt, setExerciseStartedAt] = useState<number | null>(null);
  const [exerciseDistanceKm, setExerciseDistanceKm] = useState(0);
  const [exerciseRoutePoints, setExerciseRoutePoints] = useState<ExercisePoint[]>([]);
  const [, setLocationReady] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    "Office Mode will request location permission automatically.",
  );
  const officeInsideZoneRef = useRef(false);
  const exerciseWatchRef = useRef<Location.LocationSubscription | null>(null);

  const expenseTotal = expenseEntries.reduce(
    (sum, entry) => sum + (entry.kind === "credit" ? entry.amount : -entry.amount),
    0,
  );
  const expenseSections = buildExpenseSections(expenseEntries);
  const expenseAvailableYears = Array.from(
    new Set(expenseEntries.map((entry) => getExpenseYearKey(entry.timestamp))),
  ).sort((left, right) => right.localeCompare(left));
  const expenseDateOptions = Array.from({ length: 31 }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );
  const expenseMonthOptions = Array.from({ length: 12 }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );
  const expenseYearOptions = expenseAvailableYears.length
    ? expenseAvailableYears
    : [getExpenseYearKey(Date.now())];
  const expenseReportEntries = expenseEntries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return (
      String(entryDate.getDate()).padStart(2, "0") === expenseReportDate &&
      String(entryDate.getMonth() + 1).padStart(2, "0") === expenseReportMonth &&
      String(entryDate.getFullYear()) === expenseReportYear
    );
  });
  const expenseReportSummary = getExpenseReportSummary(expenseReportEntries);
  const selectedExpenseCategory = getExpenseCategory(expenseDraftCategoryId);
  const filteredMuteApps = muteApps.filter((app) =>
    app.name.toLowerCase().includes(muteSearch.toLowerCase()),
  );
  const mutedCount = muteApps.filter((app) => app.muted).length;
  const restDurationMinutes = restPreset === "custom" ? restCustomMinutes : restPreset;
  const restRemainingSeconds = restSession
    ? Math.max(0, Math.ceil((restSession.endsAt - restTick) / 1000))
    : 0;
  const restIsActive = restSession !== null;
  const officePriorityContacts = [
    ...officePriority
      .map((contactId) => contactsSeed.find((contact) => contact.id === contactId) ?? null)
      .filter((contact): contact is Contact => contact !== null),
    ...officePriorityExtraContacts,
  ];
  const officeQuickAddContacts = contactsSeed.filter(
    (contact) => !officePriority.includes(contact.id),
  );
  useEffect(() => {
    Animated.timing(keepQuickMenuAnim, {
      toValue: keepQuickMenuOpen ? 1 : 0,
      duration: keepQuickMenuOpen ? 280 : 180,
      easing: keepQuickMenuOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [keepQuickMenuAnim, keepQuickMenuOpen]);

  function pushScreen(screen: Screen) {
    setScreenStack((stack) => [...stack, screen]);
  }

  function goBack() {
    setScreenStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }

  function switchRoot(screen: RootScreen) {
    setScreenStack([screen]);
  }

  function toggleSelected(list: string[], id: string, limit = 10) {
    if (list.includes(id)) return list.filter((item) => item !== id);
    if (list.length >= limit) return list;
    return [...list, id];
  }

  function pushRestLog(entry: Omit<RestCallLog, "id" | "timestamp">) {
    setRestCallLogs((current) => [
      {
        id: `rest-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        ...entry,
      },
      ...current,
    ].slice(0, 8));
  }

  function pushOfficeLog(type: OfficeLog["type"], text: string) {
    setOfficeLogs((current) => [
      { id: `office-${Date.now()}`, type, text, timestamp: Date.now() },
      ...current,
    ].slice(0, 8));
  }

  function pushDrivingLog(text: string) {
    setDrivingLogs((current) => [
      { id: `driving-${Date.now()}`, text, timestamp: Date.now() },
      ...current,
    ].slice(0, 8));
  }

  function pushCustomLog(text: string) {
    setCustomLogs((current) => [
      { id: `custom-${Date.now()}`, text, timestamp: Date.now() },
      ...current,
    ].slice(0, 8));
  }

  function pushVoiceLog(type: VoiceRecorderLog["type"], text: string) {
    setVoiceLogs((current) => [
      { id: `voice-${Date.now()}`, type, text, timestamp: Date.now() },
      ...current,
    ].slice(0, 8));
  }

  async function ensureNotificationPermission() {
    try {
      if (Platform.OS === "android") {
        await withTimeout(
          Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
            name: "LifeBalance Reminders",
            description: "Scheduled reminder alerts from LifeBalance",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF6F61",
            sound: "default",
          }),
          "Notification channel setup",
        );
      }

      const settings = await withTimeout(
        Notifications.getPermissionsAsync(),
        "Notification permission check",
      );
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        setNotificationsReady(true);
        return true;
      }

      await refreshReminderDiagnostics({
        lastStatus: "Requesting notification permission...",
      });

      const next = await withTimeout(
        Notifications.requestPermissionsAsync(),
        "Notification permission request",
      );
      const granted =
        next.granted || next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setNotificationsReady(granted);

      if (!granted) {
        await refreshReminderDiagnostics({
          lastStatus: "Notification permission denied. Allow notifications and try again.",
        });
      }

      return granted;
    } catch (error) {
      const message = getErrorMessage(error);
      setNotificationsReady(false);
      await refreshReminderDiagnostics({
        lastStatus: `Notification permission check failed: ${message}`,
      });
      return false;
    }
  }

  async function ensureLocationPermission() {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) {
      setLocationReady(true);
      return true;
    }

    const next = await Location.requestForegroundPermissionsAsync();
    setLocationReady(next.granted);
    if (!next.granted) {
      setLocationStatus("Location permission denied");
    }
    return next.granted;
  }

  async function ensureSmsPermission() {
    if (Platform.OS !== "android") return true;

    const permission = PermissionsAndroid.PERMISSIONS.SEND_SMS;
    const granted = await PermissionsAndroid.check(permission);
    if (granted) return true;

    const next = await PermissionsAndroid.request(permission, {
      title: "SMS permission needed",
      message: "Allow SMS permission so Office Mode can send arrival and departure texts automatically.",
      buttonPositive: "Allow",
      buttonNegative: "Not now",
    });

    if (next !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        "SMS permission denied",
        "Automatic office messages need SMS permission on Android.",
      );
      return false;
    }

    return true;
  }

  async function ensureOfficeTrackingPermissions() {
    const foregroundReady = await ensureLocationPermission();
    if (!foregroundReady) {
      setLocationStatus("Office Mode needs location permission for auto-tracking.");
      return false;
    }

    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        setLocationStatus("Turn on high-accuracy GPS for reliable office auto-detection.");
      }

      const background = await Location.getBackgroundPermissionsAsync();
      if (!background.granted) {
        setLocationStatus("Allow background location so Office Mode keeps tracking after app goes to background.");
        const next = await Location.requestBackgroundPermissionsAsync();
        if (!next.granted) {
          setLocationStatus("Background location denied. Auto office tracking will stop when the app is closed.");
          return false;
        }
      }
    }

    setLocationStatus("Office background tracking permissions are ready.");
    return true;
  }

  async function stopOfficeBackgroundTracking() {
    const started = await Location.hasStartedGeofencingAsync(OFFICE_GEOFENCE_TASK);
    if (started) {
      await Location.stopGeofencingAsync(OFFICE_GEOFENCE_TASK);
    }
  }

  async function startOfficeBackgroundTracking() {
    if (!officeLocationCoords) {
      setLocationStatus("Save office location first to start background tracking.");
      return false;
    }

    if (!(await ensureOfficeTrackingPermissions())) {
      return false;
    }

    const available = await Location.isBackgroundLocationAvailableAsync();
    if (!available) {
      setLocationStatus("Background location tracking is unavailable on this device.");
      return false;
    }

    await Location.startGeofencingAsync(OFFICE_GEOFENCE_TASK, [
      {
        identifier: OFFICE_GEOFENCE_IDENTIFIER,
        latitude: officeLocationCoords.latitude,
        longitude: officeLocationCoords.longitude,
        radius: OFFICE_GEOFENCE_RADIUS_METERS,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);

    setLocationStatus("Office background tracking is active.");
    return true;
  }

  async function refreshOfficeStateFromStorage() {
    const saved = await readPersistedAppState();
    if (!saved) return;

    if (typeof saved.officeInsideZone === "boolean") {
      officeInsideZoneRef.current = saved.officeInsideZone;
      setOfficeInsideZone(saved.officeInsideZone);
    }

    if (Array.isArray(saved.officeLogs)) {
      setOfficeLogs(saved.officeLogs);
    }
  }

  function normalizePhone(value?: string) {
    return normalizePhoneNumber(value);
  }

  function buildRestAvatar(name: string) {
    const first = name.trim().charAt(0).toUpperCase();
    return first ? first : "+";
  }

  function mapDeviceContact(contact: any) {
    const phone = contact.phoneNumbers?.[0]?.number;
    if (!phone) return null;
    return {
      id: `device-${contact.id}`,
      name: contact.name || "Unknown Contact",
      relation: "Phone Contact",
      phone,
      emoji: buildRestAvatar(contact.name || ""),
    } as Contact;
  }

  async function openRestContactPicker() {
    setRestContactsLoading(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Contacts permission needed", "Allow contacts access to pick priority callers.");
        return;
      }

      const response = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const nextContacts = response.data
        .map(mapDeviceContact)
        .filter((item): item is Contact => item !== null);

      setRestAvailableContacts(nextContacts);
      setRestContactPickerVisible(true);
    } finally {
      setRestContactsLoading(false);
    }
  }

  function addRestPriorityContact(contact: Contact) {
    setRestPriorityEnabled(true);
    setRestPriorityContacts((current) => {
      if (current.some((item) => normalizePhone(item.phone) === normalizePhone(contact.phone))) {
        return current;
      }
      return [...current, contact];
    });
    setRestContactPickerVisible(false);
  }

  function removeRestPriorityContact(contactId: string) {
    setRestPriorityContacts((current) => current.filter((item) => item.id !== contactId));
  }

  async function openOfficeContactPicker(mode: "priority" | "sms") {
    setOfficeContactsLoading(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Contacts permission needed", "Allow contacts access to pick office contacts.");
        return;
      }

      const response = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const nextContacts = response.data
        .map(mapDeviceContact)
        .filter((item): item is Contact => item !== null);

      setOfficeContactPickerMode(mode);
      setOfficeAvailableContacts(nextContacts);
      setOfficeContactPickerVisible(true);
    } finally {
      setOfficeContactsLoading(false);
    }
  }

  async function openVoiceContactPicker() {
    setVoiceContactsLoading(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Contacts permission needed",
          "Allow contacts access to choose callers for automatic recording.",
        );
        return;
      }

      const response = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const nextContacts = response.data
        .map(mapDeviceContact)
        .filter((item): item is Contact => item !== null);

      setVoiceAvailableContacts(nextContacts);
      setVoiceContactPickerVisible(true);
    } finally {
      setVoiceContactsLoading(false);
    }
  }

  function addOfficeMessageRecipient(contact: Contact) {
    setOfficeMessageRecipients((current) => {
      if (current.some((item) => normalizePhone(item.phone) === normalizePhone(contact.phone))) {
        return current;
      }
      return [...current, contact];
    });
    setOfficeContactPickerVisible(false);
  }

  function addVoiceContact(contact: Contact) {
    setVoiceContacts((current) => {
      if (current.some((item) => normalizePhone(item.phone) === normalizePhone(contact.phone))) {
        return current;
      }
      return [...current, contact];
    });
    setVoiceContactPickerVisible(false);
    setVoiceStatus(`${contact.name} was added to the auto-record caller list.`);
    pushVoiceLog("info", `Added ${contact.name} to the auto-record list.`);
  }

  function removeVoiceContact(contactId: string) {
    const existing = voiceContacts.find((contact) => contact.id === contactId);
    setVoiceContacts((current) => current.filter((contact) => contact.id !== contactId));
    if (existing) {
      setVoiceStatus(`${existing.name} was removed from the auto-record caller list.`);
    }
  }

  function removeOfficeMessageRecipient(contactId: string) {
    setOfficeMessageRecipients((current) => current.filter((item) => item.id !== contactId));
  }

  function cycleOfficeMessagePreset(type: "arrival" | "departure") {
    if (type === "arrival") {
      setOfficeArrivalMessage((current) => {
        const currentIndex = officeArrivalPresets.indexOf(current);
        return officeArrivalPresets[(currentIndex + 1) % officeArrivalPresets.length];
      });
      return;
    }

    setOfficeDepartureMessage((current) => {
      const currentIndex = officeDeparturePresets.indexOf(current);
      return officeDeparturePresets[(currentIndex + 1) % officeDeparturePresets.length];
    });
  }

  function addOfficePriorityContact(contactId: string) {
    setOfficePriority((current) => toggleSelected(current, contactId, 5));
    setOfficeQuickAddExpanded(false);
  }

  function addOfficePriorityDeviceContact(contact: Contact) {
    setOfficePriorityCallsEnabled(true);
    setOfficePriorityExtraContacts((current) => {
      if (current.some((item) => normalizePhone(item.phone) === normalizePhone(contact.phone))) {
        return current;
      }
      return [...current, contact];
    });
    setOfficeContactPickerVisible(false);
  }

  function removeOfficePriorityContact(contactId: string) {
    if (contactId.startsWith("device-")) {
      setOfficePriorityExtraContacts((current) => current.filter((item) => item.id !== contactId));
      return;
    }
    setOfficePriority((current) => current.filter((item) => item !== contactId));
  }

  function getOfficePriorityLabel(contact: Contact) {
    switch (contact.id) {
      case "boss":
        return "Manager";
      case "hr":
        return "Team Lead";
      default:
        return contact.name;
    }
  }

  function getOfficePrioritySubtitle(contact: Contact) {
    if (contact.id === "boss" || contact.id === "hr") {
      return "No phone — add for SMS";
    }
    return contact.phone ?? "No phone — add for SMS";
  }

  function saveOfficeLocationLabel() {
    const nextLabel = officeLocationDraft.trim();
    if (!nextLabel) {
      Alert.alert("Location required", "Type the office location before saving.");
      return;
    }

    setOfficeLocationLabel(nextLabel);
    setOfficeLocationCoords(null);
    setLocationStatus("Manual office location saved. Use current location for GPS arrival checks.");
    pushOfficeLog("check", `Manual office location saved as ${nextLabel}.`);
    Alert.alert("Office Location Saved", "Typed location saved. Use current location for GPS-based detection.");
  }

  async function sendOfficeMessageToRecipients(message: string) {
    const numbers = officeMessageRecipients
      .map((contact) => normalizePhone(contact.phone))
      .filter(Boolean);

    if (!numbers.length) return false;

    return sendSmsDirect(numbers, message);
  }

  async function testOfficeAutoMessage(kind: "arrival" | "departure") {
    const message = kind === "arrival" ? officeArrivalMessage : officeDepartureMessage;
    const numbers = officeMessageRecipients
      .map((contact) => normalizePhone(contact.phone))
      .filter(Boolean);

    if (!numbers.length) {
      Alert.alert("No recipient", "Add at least one phone number before testing auto-messages.");
      return;
    }

    await sendSmsDirect(numbers, message);
  }

  async function sendSmsDirect(numbers: string[], message: string) {
    const sanitizedNumbers = numbers.map((value) => normalizePhone(value)).filter(Boolean);
    if (!sanitizedNumbers.length) return false;

    if (Platform.OS === "android" && LifeBalanceNative?.sendSmsDirect) {
      if (!(await ensureSmsPermission())) return false;
      await LifeBalanceNative.sendSmsDirect(sanitizedNumbers, message);
      return true;
    }

    await composeSms(sanitizedNumbers, message);
    return true;
  }

  function openAndroidAction(action: string) {
    if (Platform.OS !== "android") return;
    void IntentLauncher.startActivityAsync(action);
  }

  function openDndSettings() {
    if (Platform.OS !== "android") return;
    if (LifeBalanceNative?.openNotificationPolicySettings) {
      LifeBalanceNative.openNotificationPolicySettings();
      return;
    }
    openAndroidAction("android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS");
  }

  function openNotificationListenerSettings() {
    if (Platform.OS !== "android") return;
    if (LifeBalanceNative?.openNotificationListenerSettings) {
      LifeBalanceNative.openNotificationListenerSettings();
      return;
    }
    openAndroidAction("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
  }

  async function refreshMuteAppsState(seedApps?: MuteApp[]) {
    if (Platform.OS !== "android") {
      setMuteAppsLoading(false);
      setMuteSyncStatus("Device app mute is available on Android only.");
      return;
    }

    if (!LifeBalanceNative?.getInstalledApps) {
      setMuteAppsLoading(false);
      setMuteSyncStatus("Installed app sync requires the native Android build.");
      return;
    }

    setMuteAppsLoading(true);

    try {
      const [installedApps, storedMutedPackages, listenerEnabled] = await Promise.all([
        withTimeout(
          LifeBalanceNative.getInstalledApps(),
          "Installed apps",
        ),
        LifeBalanceNative.getMutedNotificationPackages?.() ?? Promise.resolve([]),
        LifeBalanceNative.isNotificationListenerEnabled?.() ?? Promise.resolve(false),
      ]);

      const mutedPackages = new Set<string>([
        ...Array.from(buildMutePackageState(seedApps ?? muteApps)),
        ...storedMutedPackages,
      ]);

      const nextApps = installedApps.map((app) =>
        normalizeMuteAppRecord(app, mutedPackages.has(app.packageName)),
      );

      setMuteApps(nextApps);
      setMuteListenerEnabled(listenerEnabled);
      setMuteSyncStatus(
        nextApps.length > 0
          ? `${nextApps.length} installed apps loaded`
          : "No launchable apps found on this device.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load installed apps.";
      setMuteSyncStatus(message);
    } finally {
      setMuteAppsLoading(false);
    }
  }

  async function refreshMuteListenerStatus() {
    if (Platform.OS !== "android") {
      setMuteListenerEnabled(false);
      return;
    }

    const enabled = (await LifeBalanceNative?.isNotificationListenerEnabled?.()) ?? false;
    setMuteListenerEnabled(enabled);
  }

  async function ensureNotificationListenerBinding() {
    if (Platform.OS !== "android") return;

    const enabled = (await LifeBalanceNative?.isNotificationListenerEnabled?.()) ?? false;
    if (!enabled) return;

    try {
      await LifeBalanceNative?.refreshNotificationListenerBinding?.();
    } catch {
      // Ignore rebind failures and let the current listener state continue.
    }
  }

  function handleToggleMuteApp(packageName: string) {
    setMuteApps((current) =>
      current.map((item) =>
        item.packageName === packageName ? { ...item, muted: !item.muted } : item,
      ),
    );
  }

  async function requestCallScreeningRole() {
    if (Platform.OS !== "android") return false;
    if (LifeBalanceNative?.requestCallScreeningRole) {
      return LifeBalanceNative.requestCallScreeningRole();
    }
    Alert.alert("Native role required", "Call screening role request is available in the native Android build.");
    return false;
  }

  function openCallScreeningSettings() {
    if (Platform.OS !== "android") return;
    if (LifeBalanceNative?.openDefaultAppsSettings) {
      LifeBalanceNative.openDefaultAppsSettings();
      return;
    }
    openAndroidAction("android.settings.MANAGE_DEFAULT_APPS_SETTINGS");
  }

  function openReminderNotificationSettings() {
    if (Platform.OS !== "android") return;
    if (LifeBalanceNative?.openReminderChannelSettings) {
      LifeBalanceNative.openReminderChannelSettings();
      return;
    }
    if (LifeBalanceNative?.openAppNotificationSettings) {
      LifeBalanceNative.openAppNotificationSettings();
      return;
    }
    openAndroidAction("android.settings.APP_NOTIFICATION_SETTINGS");
  }

  async function getExactAlarmReady() {
    if (Platform.OS !== "android") return true;
    const supported = LifeBalanceNative?.canScheduleExactAlarms;
    if (!supported) return true;
    return await withTimeout(
      supported(),
      "Exact alarm readiness check",
    );
  }

  async function refreshVoiceRecorderAccess() {
    if (Platform.OS !== "android") {
      setVoiceMicPermissionReady(true);
      setVoiceCallAccessReady(true);
      return;
    }

    const microphoneGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    const phoneGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    );
    const callScreeningReady = (await LifeBalanceNative?.isCallScreeningRoleHeld?.()) ?? false;

    setVoiceMicPermissionReady(microphoneGranted);
    setVoiceCallAccessReady(phoneGranted && callScreeningReady);

    try {
      const status = await LifeBalanceNative?.getVoiceRecorderStatus?.();
      if (status?.lastEventText) {
        setVoiceStatus(status.lastEventText);
      }
      if (typeof status?.speakerAssistEnabled === "boolean") {
        setVoiceSpeakerAssist(status.speakerAssistEnabled);
      }
    } catch {
      // Native voice status is optional.
    }

    await refreshVoiceRecorderHistory();
  }

  async function refreshVoiceSimCards() {
    if (Platform.OS !== "android" || !LifeBalanceNative?.getActiveSimCards) {
      setVoiceSimCards([]);
      return;
    }

    setVoiceSimLoading(true);
    try {
      const cards = await LifeBalanceNative.getActiveSimCards();
      setVoiceSimCards(cards);
      setVoiceSelectedSimId((current) => {
        if (current && cards.some((sim) => sim.id === current)) return current;
        return cards[0]?.id ?? null;
      });
      if (!cards.length) {
        setVoiceStatus("No active SIM details were returned by Android. You can still type a number manually.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to fetch SIM details.";
      setVoiceStatus(message);
    } finally {
      setVoiceSimLoading(false);
    }
  }

  async function refreshVoiceRecorderHistory() {
    if (Platform.OS !== "android" || !LifeBalanceNative?.getVoiceRecorderHistory) {
      return;
    }

    try {
      const history = await LifeBalanceNative.getVoiceRecorderHistory();
      setVoiceRecordedCalls(normalizeVoiceRecordedCalls(history));
    } catch {
      // Native voice history is optional.
    }
  }

  async function ensureVoiceRecorderSetup() {
    if (Platform.OS !== "android") {
      setVoiceMicPermissionReady(true);
      setVoiceCallAccessReady(true);
      return true;
    }

    const requestPermission = async (
      permission: string,
      title: string,
      message: string,
    ) => {
      const granted = await PermissionsAndroid.check(permission as never);
      if (granted) return true;
      const next = await PermissionsAndroid.request(permission as never, {
        title,
        message,
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      });
      return next === PermissionsAndroid.RESULTS.GRANTED;
    };

    const microphoneGranted = await requestPermission(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      "Microphone permission needed",
      "Allow microphone access so Voice Recorder can prepare call recording.",
    );

    const phoneGranted = await requestPermission(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      "Phone access needed",
      "Allow phone state access so LifeBalance can react when calls hit the selected number.",
    );

    const phoneNumbersPermission =
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS ?? PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;
    await requestPermission(
      phoneNumbersPermission,
      "SIM details needed",
      "Allow SIM details access so LifeBalance can detect and list your active SIM numbers.",
    );

    const callScreeningReady = (await LifeBalanceNative?.isCallScreeningRoleHeld?.()) ?? false;
    if (!callScreeningReady) {
      Alert.alert(
        "Call access needed",
        "Set LifeBalance as the call screening app so auto-start rules can react when calls arrive.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Request", onPress: () => void requestCallScreeningRole() },
          { text: "Settings", onPress: openCallScreeningSettings },
        ],
      );
    }

    setVoiceMicPermissionReady(microphoneGranted);
    setVoiceCallAccessReady(phoneGranted && callScreeningReady);
    await refreshVoiceSimCards();
    return microphoneGranted && phoneGranted && callScreeningReady;
  }

  function describeReminderChannelImportance(importance: number) {
    switch (importance) {
      case 5:
        return "Max";
      case 4:
        return "High";
      case 3:
        return "Default";
      case 2:
        return "Low";
      case 1:
        return "Min";
      case 0:
        return "Blocked";
      default:
        return "Unknown";
    }
  }

  async function getReminderNotificationStatus(): Promise<ReminderNotificationStatus> {
    if (Platform.OS !== "android") {
      return {
        appNotificationsEnabled: true,
        channelExists: true,
        channelImportance: 4,
        canShowPopUp: true,
      };
    }

    try {
      if (LifeBalanceNative?.getReminderNotificationStatus) {
        return await withTimeout(
          LifeBalanceNative.getReminderNotificationStatus(),
          "Reminder notification status check",
        );
      }
    } catch {
      // Fall through to a best-effort default.
    }

    return {
      appNotificationsEnabled: notificationsReady,
      channelExists: true,
      channelImportance: notificationsReady ? 4 : 0,
      canShowPopUp: notificationsReady,
    };
  }

  function getReminderPopupStatusLabel(status: ReminderNotificationStatus) {
    if (!status.appNotificationsEnabled) {
      return "App notifications are turned off.";
    }

    if (!status.channelExists) {
      return "Reminder channel will be created when the first alert is scheduled.";
    }

    if (status.canShowPopUp) {
      return `Reminder pop-up is ready (${describeReminderChannelImportance(status.channelImportance)}).`;
    }

    return `Reminder channel is ${describeReminderChannelImportance(status.channelImportance)}. Set it to High or Max for heads-up pop-ups.`;
  }

  async function promptReminderPopupFix() {
    if (Platform.OS !== "android") return;

    const status = await getReminderNotificationStatus();
    if (status.canShowPopUp) return;

    Alert.alert(
      "Enable Reminder Pop-up",
      !status.appNotificationsEnabled
        ? "LifeBalance notifications are off. Turn them on so task reminders can appear."
        : `The LifeBalance Reminders channel is set to ${describeReminderChannelImportance(status.channelImportance)}. Raise it to High or Max so reminder pop-ups show over the screen.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: openReminderNotificationSettings },
      ],
    );
  }

  function renderReminderPopupWarningCard() {
    if (Platform.OS !== "android" || reminderDebug.popupReady) {
      return null;
    }

    return (
      <View style={styles.reminderPopupWarningCard}>
        <View style={styles.reminderPopupWarningHeader}>
          <Ionicons name="notifications-off-outline" size={18} color="#8d5c00" />
          <Text style={styles.reminderPopupWarningTitle}>Reminder pop-up is limited</Text>
        </View>
        <Text style={styles.reminderPopupWarningText}>{reminderDebug.popupStatusLabel}</Text>
        <Pressable
          style={styles.reminderPopupWarningButton}
          onPress={openReminderNotificationSettings}
        >
          <Text style={styles.reminderPopupWarningButtonText}>Fix Reminder Settings</Text>
        </Pressable>
      </View>
    );
  }

  function getReminderScheduledCount() {
    return reminders.filter((item) => Boolean(item.notificationId)).length;
  }

  async function refreshReminderDiagnostics(
    overrides: Partial<ReminderDebugState> = {},
  ) {
    setReminderDebug((current) => ({
      ...current,
      ...overrides,
    }));

    try {
      const permission = await withTimeout(
        Notifications.getPermissionsAsync(),
        "Reminder diagnostics permission check",
      );
      const exactAlarmReady =
        Platform.OS !== "android" ? true : await getExactAlarmReady();
      const notificationStatus = await getReminderNotificationStatus();

      setReminderDebug((current) => ({
        ...current,
        notificationPermission:
          permission.granted ||
          permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
        exactAlarmReady,
        popupReady: notificationStatus.canShowPopUp,
        popupStatusLabel: getReminderPopupStatusLabel(notificationStatus),
        scheduledCount: overrides.scheduledCount ?? getReminderScheduledCount(),
        ...overrides,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown diagnostics error";
      setReminderDebug((current) => ({
        ...current,
        ...overrides,
        lastStatus: `${overrides.lastStatus ?? current.lastStatus} Diagnostics error: ${message}`,
      }));
    }
  }

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown scheduling error";
  }

  function buildReminderScheduleCandidates(triggerDate: Date): ReminderScheduleCandidate[] {
    const secondsUntilTrigger = Math.max(
      1,
      Math.round((triggerDate.getTime() - Date.now()) / 1000),
    );

    return [
      {
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilTrigger,
          repeats: false,
          channelId: REMINDER_CHANNEL_ID,
        },
        label: `Time interval in ${secondsUntilTrigger} seconds`,
      },
      {
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate.getTime(),
          channelId: REMINDER_CHANNEL_ID,
        },
        label: `Date trigger for ${triggerDate.toLocaleString()}`,
      },
    ];
  }

  async function scheduleReminderNotification(
    identifier: string,
    content: Notifications.NotificationContentInput,
    triggerDate: Date,
  ) {
    const exactAlarmReady = await getExactAlarmReady();
    if (Platform.OS === "android" && LifeBalanceNative?.scheduleReminderNotification) {
      const notificationId = await withTimeout(
        LifeBalanceNative.scheduleReminderNotification(
          identifier,
          content.title ?? "LifeBalance Reminder",
          content.body ?? "",
          triggerDate.getTime(),
        ),
        "Native Android reminder scheduling",
        12000,
      );

      return {
        notificationId,
        triggerLabel: `Native Android alarm for ${triggerDate.toLocaleString()}`,
        exactAlarmReady,
      };
    }

    const candidates = buildReminderScheduleCandidates(triggerDate);
    const failures: string[] = [];

    for (const candidate of candidates) {
      try {
        const nextTriggerDate = await withTimeout(
          Notifications.getNextTriggerDateAsync(candidate.trigger),
          `Next trigger calculation for ${candidate.label}`,
        );
        if (nextTriggerDate === null) {
          failures.push(`${candidate.label}: trigger was rejected by Expo`);
          continue;
        }

        const notificationId = await withTimeout(
          Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              ...content,
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: candidate.trigger,
          }),
          `Reminder scheduling for ${candidate.label}`,
          12000,
        );

        return {
          notificationId,
          triggerLabel: candidate.label,
          exactAlarmReady,
        };
      } catch (error) {
        failures.push(`${candidate.label}: ${getErrorMessage(error)}`);
      }
    }

    throw new Error(failures.join(" | "));
  }

  async function composeSms(numbers: string[], message: string) {
    const available = await SMS.isAvailableAsync();
    if (!available) {
      Alert.alert("SMS unavailable", "SMS composer is not available on this device.");
      return;
    }

    await SMS.sendSMSAsync(numbers, message);
  }

  function resetExpenseDraft() {
    setExpenseDraftAmount("0");
    setExpenseDraftKind("debit");
    setExpenseDraftCategoryId(expenseCategories[3].id);
    setExpenseDraftCategoryLabel(expenseCategories[3].label);
    setExpenseDraftDescription("Meeting and Snacks with Victor");
    setExpenseCategoryMenuVisible(false);
  }

  function openExpenseComposer() {
    resetExpenseDraft();
    setExpenseComposerVisible(true);
  }

  function closeExpenseComposer() {
    setExpenseComposerVisible(false);
    setExpenseCategoryMenuVisible(false);
  }

  async function handleVoiceRecorderToggle(nextValue: boolean) {
    if (!nextValue) {
      setVoiceRecorderEnabled(false);
      setVoiceStatus("Voice Recorder is paused. Auto-start rules are stored safely.");
      pushVoiceLog("info", "Voice Recorder was paused.");
      return;
    }

    const setupReady = await ensureVoiceRecorderSetup();
    setVoiceRecorderEnabled(true);

    const selectedNumber = getVoiceEffectiveLineNumber(voiceSimCards, voiceSelectedSimId);

    if (!selectedNumber) {
      setVoiceStatus("Select a detected SIM that exposes its number before using auto call recording.");
      pushVoiceLog("skip", "Voice Recorder is enabled, but no detected SIM number is available.");
      return;
    }

    if (setupReady) {
      const scopeLabel =
        voiceRecordScope === "all" ? "all calls on this line" : "selected callers only";
      setVoiceStatus(
        `Voice Recorder is ready for ${getVoiceEffectiveLineLabel(
          voiceSimCards,
          voiceSelectedSimId,
        )} with ${scopeLabel}.`,
      );
      pushVoiceLog(
        "match",
        `Voice Recorder armed for ${getVoiceEffectiveLineLabel(
          voiceSimCards,
          voiceSelectedSimId,
        )}.`,
      );
      return;
    }

    setVoiceStatus(
      "Voice Recorder settings are saved, but Android access is still incomplete. Finish the access steps and try again.",
    );
  }

  function handleVoiceRecorderTest() {
    const selectedNumber = getVoiceEffectiveLineNumber(voiceSimCards, voiceSelectedSimId);

    if (!voiceRecorderEnabled) {
      Alert.alert("Voice Recorder is off", "Turn on Voice Recorder first.");
      return;
    }

    if (!selectedNumber) {
      Alert.alert("SIM number missing", "Select a detected SIM that exposes its number first.");
      return;
    }

    const sampleContact =
      voiceContacts[0] ?? contactsSeed.find((contact) => contact.id === "boss") ?? contactsSeed[0];
    const matchedCaller =
      voiceRecordScope === "all" ||
      voiceContacts.some(
        (contact) => normalizePhone(contact.phone) === normalizePhone(sampleContact.phone),
      );
    const accessReady = voiceMicPermissionReady && voiceCallAccessReady;

    if (matchedCaller && accessReady && voiceAutoStart) {
      const text = `Auto start would trigger for ${sampleContact.name} on ${getVoiceEffectiveLineLabel(
        voiceSimCards,
        voiceSelectedSimId,
      )}.`;
      setVoiceStatus(text);
      pushVoiceLog("match", text);
      Alert.alert("Auto start ready", text);
      return;
    }

    const text = accessReady
      ? "The selected caller does not match the current rule set yet."
      : "Voice Recorder still needs microphone or call access before it can auto-start.";
    setVoiceStatus(text);
    pushVoiceLog("skip", text);
    Alert.alert("Auto start not ready", text);
  }

  function updateExpenseDraftKind(kind: "debit" | "credit") {
    setExpenseDraftKind(kind);
    setExpenseDraftCategoryId((current) => {
      if (kind === "credit") {
        return current === "salary" ? current : "salary";
      }
      return current === "salary" ? expenseCategories[3].id : current;
    });
    setExpenseDraftCategoryLabel((current) => {
      if (kind === "credit") return "Salary";
      return current === "Salary" ? expenseCategories[3].label : current;
    });
  }

  function handleExpenseDigitPress(value: string) {
    if (value === "backspace") {
      setExpenseDraftAmount((current) => {
        if (current.length <= 1) return "0";
        return current.slice(0, -1);
      });
      return;
    }

    setExpenseDraftAmount((current) => {
      if (current === "0") return value;
      if (current.length >= 6) return current;
      return `${current}${value}`;
    });
  }

  function handleSaveExpenseEntry() {
    const amount = Number.parseInt(expenseDraftAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Add amount", "Enter an amount before saving this expense.");
      return;
    }

    const nextEntry: ExpenseEntry = {
      id: `expense-${Date.now()}`,
      amount,
      categoryId: expenseDraftCategoryId,
      categoryLabel: expenseDraftCategoryLabel.trim() || selectedExpenseCategory.label,
      description: expenseDraftDescription.trim(),
      kind: expenseDraftKind,
      timestamp: Date.now(),
    };

    setExpenseEntries((current) => [nextEntry, ...current].sort((a, b) => b.timestamp - a.timestamp));
    closeExpenseComposer();
  }

  async function syncRestModeNative(active: boolean) {
    if (Platform.OS !== "android" || !LifeBalanceNative?.updateRestModeConfig) return;

    const numbers = restPriorityContacts
      .map((contact) => normalizePhone(contact.phone))
      .filter(Boolean);

    await LifeBalanceNative.updateRestModeConfig(
      active,
      restPriorityEnabled,
      restMissedCalls,
      numbers,
    );
  }

  async function ensureCallScreeningReady() {
    if (Platform.OS !== "android") return true;

    const roleHeld = (await LifeBalanceNative?.isCallScreeningRoleHeld?.()) ?? false;
    setRestCallScreeningReady(roleHeld);
    if (roleHeld) return true;

    Alert.alert(
      "Call Screening Needed",
      "Set LifeBalance as the call screening app. If the popup does not appear, use Default Apps and choose LifeBalance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Access",
          onPress: () => {
            void requestCallScreeningRole();
          },
        },
        {
          text: "Default Apps",
          onPress: openCallScreeningSettings,
        },
      ],
    );
    return false;
  }

  async function refreshRestCallScreeningStatus() {
    if (Platform.OS !== "android") {
      setRestCallScreeningReady(true);
      return;
    }

    const roleHeld = (await LifeBalanceNative?.isCallScreeningRoleHeld?.()) ?? false;
    setRestCallScreeningReady(roleHeld);
  }

  function activateMode(key: ModuleScreen, title: string, durationMinutes?: number) {
    setActiveMode({
      key,
      title,
      endLabel: durationMinutes ? `Ends at ${formatEndLabel(durationMinutes)}` : undefined,
    });
  }

  function stopMode(key: ModuleScreen) {
    setActiveMode((current) => (current?.key === key ? null : current));
  }

  async function handleStartRest() {
    const screeningReady = await ensureCallScreeningReady();
    if (!screeningReady) {
      Alert.alert(
        "Rest Mode Not Armed",
        "Grant call screening access first, then start Rest Mode again.",
      );
      return;
    }

    const now = Date.now();
    const nextSession: RestSession = {
      startsAt: now,
      endsAt: now + restDurationMinutes * 60 * 1000,
      durationMinutes: restDurationMinutes,
    };

    setRestSession(nextSession);
    setRestTick(now);
    setRestBlockedCalls(0);
    setRestAllowedCalls(0);
    setRestMissedStreak(0);
    setRestCallLogs([]);
    activateMode("rest", "Rest Mode", restDurationMinutes);
    await syncRestModeNative(true);
    Alert.alert(
      "Rest Mode Started",
      `Rest Mode is active for ${formatTimeLabel(restDurationMinutes)}. Priority contacts can ring through and alerts will show after ${restMissedCalls} muted calls.`,
    );
  }

  async function handleStopRest(manual = true) {
    setRestSession(null);
    setRestTick(Date.now());
    setRestMissedStreak(0);
    stopMode("rest");
    await syncRestModeNative(false);
    pushRestLog({
      callerName: "Rest Mode",
      detail: manual
        ? "Session stopped manually. Phone rules are cleared."
        : "Session ended automatically. Phone is back to normal.",
      outcome: "ended",
    });

    if (manual) {
      Alert.alert("Rest Mode Stopped", "Phone mute rules are now cleared.");
    }
  }

  function openKeepComposer(mode: "text" | "list" | "image" | "audio" = "text") {
    const defaultColor = keepNoteColors[Date.now() % keepNoteColors.length];
    setKeepEditingNoteId(null);
    setKeepDraftTitle("");
    setKeepDraftBody("");
    setKeepDraftListCategories([]);
    setKeepDraftListCategoryInput("");
    setKeepDraftActiveListCategory(null);
    setKeepDraftChecklist([]);
    setKeepDraftImage(undefined);
    setKeepDraftAudio(undefined);
    setKeepDraftColor(defaultColor);
    setKeepDraftPinned(false);
    setKeepDraftListMode(mode === "list");
    setKeepCategoryComposerVisible(false);
    setKeepQuickMenuOpen(false);
    setKeepComposerVisible(true);
  }

  function openKeepEditor(note: KeepNote) {
    setKeepEditingNoteId(note.id);
    setKeepDraftTitle(note.title);
    setKeepDraftBody(note.body);
    setKeepDraftListCategories(note.listCategories);
    setKeepDraftListCategoryInput("");
    setKeepDraftActiveListCategory(note.listCategories[0] ?? null);
    setKeepDraftChecklist(note.checklist);
    setKeepDraftImage(note.image);
    setKeepDraftAudio(note.audio);
    setKeepDraftColor(note.color);
    setKeepDraftPinned(note.pinned);
    setKeepDraftListMode(note.listCategories.length > 0 || note.checklist.length > 0);
    setKeepCategoryComposerVisible(note.listCategories.length > 0);
    setKeepQuickMenuOpen(false);
    setKeepComposerVisible(true);
  }

  function closeKeepComposer() {
    setKeepComposerVisible(false);
    void clearPersistedKeepDraft();
  }

  function cycleKeepDraftColor() {
    const currentIndex = keepNoteColors.indexOf(keepDraftColor);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % keepNoteColors.length : 0;
    setKeepDraftColor(keepNoteColors[nextIndex]);
  }

  function addKeepChecklistItem() {
    setKeepDraftListMode(true);
    setKeepDraftChecklist((current) => [
      ...current,
      {
        id: `keep-item-${Date.now()}-${current.length}`,
        text: "",
        checked: false,
        category: keepDraftActiveListCategory ?? undefined,
      },
    ]);
  }

  function addKeepListCategory() {
    const normalizedCategory = keepDraftListCategoryInput.trim();
    if (!normalizedCategory) return;

    setKeepDraftListMode(true);
    setKeepDraftListCategories((current) =>
      current.some((category) => category.toLowerCase() === normalizedCategory.toLowerCase())
        ? current
        : [...current, normalizedCategory],
    );
    setKeepDraftActiveListCategory(normalizedCategory);
    setKeepDraftListCategoryInput("");
    setKeepCategoryComposerVisible(false);
  }

  function removeKeepListCategory(categoryToRemove: string) {
    setKeepDraftListCategories((current) =>
      current.filter((category) => category !== categoryToRemove),
    );
    setKeepDraftChecklist((current) =>
      current.map((item) =>
        item.category === categoryToRemove ? { ...item, category: undefined } : item,
      ),
    );
    setKeepDraftActiveListCategory((current) =>
      current === categoryToRemove ? null : current,
    );
  }

  function selectKeepListCategory(category: string | null) {
    setKeepDraftListMode(true);
    setKeepDraftActiveListCategory(category);
  }

  function updateKeepChecklistItem(id: string, text: string) {
    setKeepDraftChecklist((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  }

  function toggleKeepChecklistItem(id: string) {
    setKeepDraftChecklist((current) =>
      current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  function removeKeepChecklistItem(id: string) {
    setKeepDraftChecklist((current) => current.filter((item) => item.id !== id));
  }

  async function handlePickKeepImage() {
    if (Platform.OS !== "android" || !LifeBalanceNative?.pickImageFile) {
      Alert.alert("Not available", "Image picker is available in the Android build.");
      return;
    }

    try {
      await persistKeepDraftState(
        buildKeepDraftPersistenceState({
          editingNoteId: keepEditingNoteId,
          title: keepDraftTitle,
          body: keepDraftBody,
          listCategories: keepDraftListCategories,
          listCategoryInput: keepDraftListCategoryInput,
          activeListCategory: keepDraftActiveListCategory,
          categoryComposerVisible: keepCategoryComposerVisible,
          checklist: keepDraftChecklist,
          color: keepDraftColor,
          pinned: keepDraftPinned,
          listMode: keepDraftListMode,
          image: keepDraftImage,
          audio: keepDraftAudio,
        }),
      );
      const file = await LifeBalanceNative.pickImageFile();
      if (file?.uri) {
        await persistKeepDraftState(
          buildKeepDraftPersistenceState({
            editingNoteId: keepEditingNoteId,
            title: keepDraftTitle,
            body: keepDraftBody,
            listCategories: keepDraftListCategories,
            listCategoryInput: keepDraftListCategoryInput,
            activeListCategory: keepDraftActiveListCategory,
            categoryComposerVisible: keepCategoryComposerVisible,
            checklist: keepDraftChecklist,
            color: keepDraftColor,
            pinned: keepDraftPinned,
            listMode: keepDraftListMode,
            image: file,
            audio: keepDraftAudio,
          }),
        );
        void LifeBalanceNative.consumePendingPickedFile?.().catch(() => null);
        setKeepDraftImage(file);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("cancel")) return;
      Alert.alert("Image not added", message);
    }
  }

  async function handlePickKeepAudio() {
    if (Platform.OS !== "android" || !LifeBalanceNative?.pickAudioFile) {
      Alert.alert("Not available", "Audio picker is available in the Android build.");
      return;
    }

    try {
      await persistKeepDraftState(
        buildKeepDraftPersistenceState({
          editingNoteId: keepEditingNoteId,
          title: keepDraftTitle,
          body: keepDraftBody,
          listCategories: keepDraftListCategories,
          listCategoryInput: keepDraftListCategoryInput,
          activeListCategory: keepDraftActiveListCategory,
          categoryComposerVisible: keepCategoryComposerVisible,
          checklist: keepDraftChecklist,
          color: keepDraftColor,
          pinned: keepDraftPinned,
          listMode: keepDraftListMode,
          image: keepDraftImage,
          audio: keepDraftAudio,
        }),
      );
      const file = await LifeBalanceNative.pickAudioFile();
      if (file?.uri) {
        await persistKeepDraftState(
          buildKeepDraftPersistenceState({
            editingNoteId: keepEditingNoteId,
            title: keepDraftTitle,
            body: keepDraftBody,
            listCategories: keepDraftListCategories,
            listCategoryInput: keepDraftListCategoryInput,
            activeListCategory: keepDraftActiveListCategory,
            categoryComposerVisible: keepCategoryComposerVisible,
            checklist: keepDraftChecklist,
            color: keepDraftColor,
            pinned: keepDraftPinned,
            listMode: keepDraftListMode,
            image: keepDraftImage,
            audio: file,
          }),
        );
        void LifeBalanceNative.consumePendingPickedFile?.().catch(() => null);
        setKeepDraftAudio(file);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("cancel")) return;
      Alert.alert("Audio not added", message);
    }
  }

  async function handleOpenKeepAttachment(attachment?: PickedAttachment) {
    if (!attachment?.uri) return;

    if (Platform.OS === "android" && LifeBalanceNative?.openExternalFile) {
      try {
        await LifeBalanceNative.openExternalFile(attachment.uri, attachment.mimeType);
      } catch (error) {
        Alert.alert("Unable to open file", getErrorMessage(error));
      }
      return;
    }

    Alert.alert("Preview not available", "Open this attachment from the Android device build.");
  }

  async function handleOpenVoiceRecording(entry: VoiceRecordedCall) {
    if (!entry.uri) {
      Alert.alert("Recording unavailable", "This call record does not have a saved audio file.");
      return;
    }

    if (Platform.OS === "android" && LifeBalanceNative?.openExternalFile) {
      try {
        await LifeBalanceNative.openExternalFile(entry.uri, entry.mimeType ?? "audio/mp4");
      } catch (error) {
        Alert.alert("Unable to open recording", getErrorMessage(error));
      }
      return;
    }

    Alert.alert("Playback not available", "Open this recording from the Android device build.");
  }

  async function handleShareVoiceRecording(entry: VoiceRecordedCall) {
    if (!entry.uri) {
      Alert.alert("Recording unavailable", "This call record does not have a saved audio file.");
      return;
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(entry.uri, {
          mimeType: entry.mimeType ?? "audio/mp4",
          dialogTitle: "Share recording",
        });
        return;
      }

      await Share.share({
        message: entry.uri,
      });
    } catch (error) {
      Alert.alert("Unable to share recording", getErrorMessage(error));
    }
  }

  function handleDeleteVoiceRecording(entry: VoiceRecordedCall) {
    Alert.alert(
      "Delete recording?",
      "This will remove the audio file and its history entry from Voice Recorder.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (Platform.OS !== "android" || !LifeBalanceNative?.deleteVoiceRecording) {
                Alert.alert("Delete not available", "Delete this recording from the Android build.");
                return;
              }

              try {
                await LifeBalanceNative.deleteVoiceRecording(entry.id, entry.uri);
                setVoiceRecordedCalls((current) => current.filter((item) => item.id !== entry.id));
              } catch (error) {
                Alert.alert("Unable to delete recording", getErrorMessage(error));
              }
            })();
          },
        },
      ],
    );
  }

  function buildKeepNoteFromDraft() {
    const normalizedChecklist = keepDraftChecklist
      .map((item) => ({
        ...item,
        text: item.text.trim(),
        category: item.category?.trim() || undefined,
      }))
      .filter((item) => item.text.length > 0);
    const normalizedListCategories = [
      ...keepDraftListCategories.map((category) => category.trim()),
      ...normalizedChecklist.flatMap((item) => (item.category ? [item.category] : [])),
    ].filter((category, index, array) => category.length > 0 && array.indexOf(category) === index);
    const hasContent =
      keepDraftTitle.trim().length > 0 ||
      keepDraftBody.trim().length > 0 ||
      normalizedListCategories.length > 0 ||
      normalizedChecklist.length > 0 ||
      Boolean(keepDraftImage) ||
      Boolean(keepDraftAudio);

    if (!hasContent) {
      return null;
    }

    const existingNote = keepEditingNoteId
      ? keepNotes.find((note) => note.id === keepEditingNoteId) ?? null
      : null;
    const now = Date.now();
    const note: KeepNote = {
      id: existingNote?.id ?? `keep-${now}`,
      title: keepDraftTitle.trim(),
      body: keepDraftBody.trim(),
      listCategories: normalizedListCategories,
      checklist: normalizedChecklist,
      color: keepDraftColor,
      pinned: keepDraftPinned,
      image: keepDraftImage ? { ...keepDraftImage } : undefined,
      audio: keepDraftAudio ? { ...keepDraftAudio } : undefined,
      createdAt: existingNote?.createdAt ?? now,
      updatedAt: now,
    };

    return note;
  }

  function buildKeepNotePlainText(note: KeepNote) {
    const checklistSections = buildKeepChecklistSections(note.listCategories, note.checklist);
    return [
      note.title.trim(),
      note.listCategories.length ? `Categories: ${note.listCategories.join(", ")}` : "",
      note.body.trim(),
      ...checklistSections.flatMap((section) => [
        section.title ? section.title : "",
        ...section.items.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`),
      ]),
      note.image ? `Image: ${note.image.name}` : "",
      note.audio ? `Audio: ${note.audio.name}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function buildKeepNoteExportName(note: KeepNote) {
    return `${slugifyFileName(note.title || `note-${note.updatedAt}`)}-${note.updatedAt}`;
  }

  function buildKeepNoteHtml(note: KeepNote) {
    const checklistSections = buildKeepChecklistSections(note.listCategories, note.checklist);
    const checklistHtml = checklistSections.length
      ? `<div style="margin-top:18px;">${checklistSections
          .map(
            (section) =>
              `<div style="margin-bottom:14px;">${section.title ? `<div style="margin-bottom:8px;color:#4640a4;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(section.title)}</div>` : ""}${section.items
                .map(
                  (item) =>
                    `<div style="display:flex;align-items:flex-start;margin-bottom:8px;"><span style="display:inline-block;width:26px;color:#5b64c9;font-weight:700;">${item.checked ? "&#10003;" : "&#9633;"}</span><span style="color:#3a3645;font-size:15px;line-height:22px;${item.checked ? "text-decoration:line-through;color:#8f8a9d;" : ""}">${escapeHtml(item.text)}</span></div>`,
                )
                .join("")}</div>`,
          )
          .join("")}</div>`
      : "";
    const imageHtml = note.image?.uri
      ? `<img src="${note.image.uri}" style="width:100%;max-height:360px;object-fit:cover;border-radius:18px;margin-top:18px;" />`
      : "";
    const audioHtml = note.audio
      ? `<div style="margin-top:18px;padding:14px 16px;border-radius:16px;background:#ede9f6;color:#38344a;font-size:14px;font-weight:600;">Audio: ${escapeHtml(note.audio.name)}</div>`
      : "";

    return `<html><body style="font-family:Arial;padding:26px;background:#f6f4fb;"><div style="background:${escapeHtml(note.color)};border:1px solid #ddd7eb;border-radius:28px;padding:24px;"><div style="font-size:28px;font-weight:700;color:#272331;">${escapeHtml(note.title || "Untitled note")}</div>${note.body ? `<div style="margin-top:16px;color:#4a4657;font-size:16px;line-height:25px;white-space:pre-wrap;">${escapeHtml(note.body)}</div>` : ""}${checklistHtml}${imageHtml}${audioHtml}<div style="margin-top:18px;color:#8c8798;font-size:12px;">Updated ${escapeHtml(formatDateStamp(note.updatedAt))}</div></div></body></html>`;
  }

  async function createKeepNotePdf(note: KeepNote) {
    const { uri } = await Print.printToFileAsync({
      html: buildKeepNoteHtml(note),
    });

    return {
      uri,
      fileName: `${buildKeepNoteExportName(note)}.pdf`,
      mimeType: "application/pdf",
    };
  }

  async function createKeepNoteImage(note: KeepNote) {
    if (Platform.OS === "android" && LifeBalanceNative?.exportKeepNoteImage) {
      return LifeBalanceNative.exportKeepNoteImage(
        note.title,
        note.body,
        note.checklist.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`),
        note.color,
        note.image?.uri,
        note.audio?.name,
      );
    }

    if (note.image) {
      return note.image;
    }

    throw new Error("Image export is available in the Android build.");
  }

  async function saveKeepFileToDownloads(
    sourceUri: string,
    fileName: string,
    mimeType?: string,
  ) {
    if (Platform.OS === "android" && LifeBalanceNative?.saveFileToDownloads) {
      await LifeBalanceNative.saveFileToDownloads(sourceUri, fileName, mimeType);
      Alert.alert("Downloaded", `${fileName} saved to Downloads.`);
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(sourceUri);
      return;
    }

    Alert.alert("File ready", sourceUri);
  }

  async function handleDownloadKeepNoteAsPdf(note: KeepNote) {
    try {
      const file = await createKeepNotePdf(note);
      await saveKeepFileToDownloads(file.uri, file.fileName, file.mimeType);
    } catch (error) {
      Alert.alert("Download failed", getErrorMessage(error));
    }
  }

  async function handleDownloadKeepNoteAsImage(note: KeepNote) {
    try {
      const file = await createKeepNoteImage(note);
      const extension = file.mimeType?.includes("jpeg")
        ? "jpg"
        : file.mimeType?.includes("webp")
          ? "webp"
          : "png";
      await saveKeepFileToDownloads(
        file.uri,
        `${buildKeepNoteExportName(note)}.${extension}`,
        file.mimeType ?? "image/png",
      );
    } catch (error) {
      Alert.alert("Image download failed", getErrorMessage(error));
    }
  }

  function handleDownloadKeepNote(note: KeepNote) {
    Alert.alert("Download note", "Choose a format for this note.", [
      { text: "As Image", onPress: () => void handleDownloadKeepNoteAsImage(note) },
      { text: "As PDF", onPress: () => void handleDownloadKeepNoteAsPdf(note) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleShareKeepNote(note: KeepNote) {
    try {
      const plainText = buildKeepNotePlainText(note);
      const uris = [note.image?.uri, note.audio?.uri].filter(
        (value): value is string => Boolean(value),
      );
      const mimeTypes = [note.image?.mimeType, note.audio?.mimeType].filter(
        (value): value is string => Boolean(value),
      );

      if (uris.length && Platform.OS === "android" && LifeBalanceNative?.shareFiles) {
        await LifeBalanceNative.shareFiles(
          note.title || "Keep Note",
          plainText,
          uris,
          mimeTypes,
        );
        return;
      }

      if (uris.length && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uris[0]);
        return;
      }

      await Share.share({
        title: note.title || "Keep Note",
        message: plainText,
      });
    } catch (error) {
      Alert.alert("Share failed", getErrorMessage(error));
    }
  }

  function handleKeepExportAction(kind: "download" | "share") {
    const note = buildKeepNoteFromDraft();
    if (!note) {
      Alert.alert("Empty note", "Add title, text, list, image, or audio before exporting.");
      return;
    }

    if (kind === "download") {
      handleDownloadKeepNote(note);
      return;
    }

    void handleShareKeepNote(note);
  }

  function handleSaveKeepNote() {
    const note = buildKeepNoteFromDraft();

    if (!note) {
      Alert.alert("Empty note", "Add title, text, list, image, or audio before saving.");
      return;
    }

    setKeepNotes((current) =>
      sortKeepNotes([note, ...current.filter((item) => item.id !== note.id)]),
    );
    closeKeepComposer();
  }

  function handleDeleteKeepNote(noteId: string) {
    Alert.alert("Delete note", "This note will be removed from Keep Notes.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setKeepNotes((current) => current.filter((item) => item.id !== noteId));
          if (keepEditingNoteId === noteId) {
            closeKeepComposer();
          }
        },
      },
    ]);
  }

  function openTodoComposer(date = todoSelectedDate) {
    setTodoEditingTaskId(null);
    setTodoDraftTitle("");
    setTodoDraftDetails("");
    setTodoDraftDate(date);
    setTodoDraftTime("08:00");
    setTodoComposerVisible(true);
  }

  function openTodoEditor(task: TodoTask) {
    setTodoEditingTaskId(task.id);
    setTodoDraftTitle(task.title);
    setTodoDraftDetails(task.details);
    setTodoDraftDate(task.date);
    setTodoDraftTime(task.time);
    setTodoComposerVisible(true);
  }

  function closeTodoComposer() {
    setTodoComposerVisible(false);
    setTodoEditingTaskId(null);
  }

  function openTodoTimePicker() {
    const parts = parseReminderTimeParts(todoDraftTime);
    setTodoPickerHour(parts.hour12);
    setTodoPickerMinute(parts.minute - (parts.minute % 5));
    setTodoPickerPeriod(parts.period);
    setTodoTimePickerVisible(true);
  }

  function applyTodoTimePicker() {
    setTodoDraftTime(buildReminderTime(todoPickerHour, todoPickerMinute, todoPickerPeriod));
    setTodoTimePickerVisible(false);
  }

  async function cancelTodoNotification(notificationId?: string) {
    if (!notificationId) return;

    try {
      if (Platform.OS === "android" && LifeBalanceNative?.cancelReminderNotification) {
        await LifeBalanceNative.cancelReminderNotification(notificationId);
      } else {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
    } catch {
      // Ignore cancellation errors for already-fired or missing notifications.
    }
  }

  async function scheduleTodoNotification(task: TodoTask) {
    const triggerDate = parseDateTime(task.date, task.time);
    if (!triggerDate || triggerDate.getTime() <= Date.now()) {
      return undefined;
    }

    if (!(await ensureNotificationPermission())) {
      return undefined;
    }

    const result = await scheduleReminderNotification(
      `todo-${task.id}`,
      {
        title: "Task Reminder",
        body: task.details.trim()
          ? `${task.title} at ${formatReminderTimeLabel(task.time)}. ${task.details.trim()}`
          : `${task.title} at ${formatReminderTimeLabel(task.time)}`,
        sound: "default",
      },
      triggerDate,
    );

    return result.notificationId;
  }

  async function handleSaveTodoTask() {
    if (!todoDraftTitle.trim()) {
      Alert.alert("Missing task", "Enter a task title before saving.");
      return;
    }

    const parsedDate = parseDateTime(todoDraftDate, todoDraftTime);
    if (!parsedDate) {
      Alert.alert("Invalid date or time", "Use a valid date and time like 2026-03-20 and 08:00.");
      return;
    }

    const existingTask = todoEditingTaskId
      ? todos.find((task) => task.id === todoEditingTaskId) ?? null
      : null;

    const nextTask: TodoTask = {
      id: existingTask?.id ?? `todo-${Date.now()}`,
      title: todoDraftTitle.trim(),
      details: todoDraftDetails.trim(),
      date: todoDraftDate,
      time: todoDraftTime,
      done: existingTask?.done ?? false,
      createdAt: existingTask?.createdAt ?? Date.now(),
    };

    let notificationId: string | undefined;
    let scheduled = false;

    try {
      await cancelTodoNotification(existingTask?.notificationId);
      notificationId = nextTask.done ? undefined : await scheduleTodoNotification(nextTask);
      scheduled = Boolean(notificationId);
    } catch {
      notificationId = existingTask?.notificationId;
    }

    setTodos((current) =>
      sortTodoTasks([
        {
          ...nextTask,
          notificationId,
        },
        ...current.filter((task) => task.id !== nextTask.id),
      ]),
    );
    setTodoSelectedDate(todoDraftDate);
    closeTodoComposer();

    Alert.alert(
      existingTask ? "Task updated" : "Task saved",
      parsedDate.getTime() > Date.now()
        ? scheduled
          ? "Task reminder will pop up at the selected date and time."
          : "Task saved. Notification permission or scheduling is not ready yet."
        : "Task saved. The selected time has already passed, so no reminder was scheduled.",
    );

    if (scheduled) {
      void promptReminderPopupFix();
    }
  }

  async function toggleTodoTask(id: string) {
    const currentTask = todos.find((task) => task.id === id);
    if (!currentTask) return;

    const nextDone = !currentTask.done;
    let nextNotificationId = currentTask.notificationId;

    if (nextDone) {
      await cancelTodoNotification(currentTask.notificationId);
      nextNotificationId = undefined;
    } else {
      try {
        nextNotificationId = await scheduleTodoNotification(currentTask);
      } catch {
        nextNotificationId = currentTask.notificationId;
      }
    }

    setTodos((current) =>
      sortTodoTasks(
        current.map((task) =>
          task.id === id
            ? {
                ...task,
                done: nextDone,
                notificationId: nextNotificationId,
              }
            : task,
        ),
      ),
    );
  }

  async function handleDeleteTodo(task: TodoTask) {
    await cancelTodoNotification(task.notificationId);
    setTodos((current) => current.filter((item) => item.id !== task.id));
  }

  function handleOfficeToggle() {
    const next = !officeActive;
    setOfficeActive(next);
    if (next) {
      activateMode("office", "Office Mode");
      pushOfficeLog("check", "Office Mode activated. Location permissions and background tracking are starting.");
      if (!officeLocationCoords) {
        setLocationStatus("Save office location to start automatic arrival and departure tracking.");
      }
    } else {
      stopMode("office");
      pushOfficeLog("check", "Office Mode stopped.");
      setLocationStatus("Office background tracking stopped.");
      void stopOfficeBackgroundTracking();
    }
  }

  function handleDrivingToggle() {
    const next = !drivingActive;
    setDrivingActive(next);
    if (next) {
      activateMode("driving", "Driving Mode");
      pushDrivingLog(`Driving Mode enabled at ${Math.round(drivingSpeed)} km/h.`);
    } else {
      stopMode("driving");
      pushDrivingLog("Driving Mode disabled.");
    }
  }

  function handleExerciseToggle() {
    const next = !exerciseActive;
    setExerciseActive(next);

    if (next) {
      activateMode("exercise", "Exercise Mode");
      setExerciseStartedAt(Date.now());
      setExerciseMinutes(0);
      setExerciseCalories(0);
      setExerciseDistanceKm(0);
      setExerciseRoutePoints([]);
      setLocationStatus("Workout started. Tracking route...");
    } else {
      stopMode("exercise");
      const duration = Math.max(1, exerciseMinutes || exerciseGoal);
      setExerciseCalories(duration * 6);
      setExerciseHistory((current) => [
        {
          id: `e-${Date.now()}`,
          date: formatDateStamp(Date.now()),
          duration: `${duration} min`,
          distance: `${exerciseDistanceKm.toFixed(1)} km`,
        },
        ...current,
      ]);
      setExerciseStartedAt(null);
      setLocationStatus("Workout saved to history.");
    }
  }

  async function handleSetOfficeLocation() {
    if (!(await ensureOfficeTrackingPermissions())) return;
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const nextLocation = {
      label: `Lat ${current.coords.latitude.toFixed(4)}, Lng ${current.coords.longitude.toFixed(4)}`,
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
    setOfficeLocationCoords(nextLocation);
    setOfficeLocationLabel(nextLocation.label);
    setOfficeLocationDraft(nextLocation.label);
    pushOfficeLog("check", "Office location captured from current GPS position.");
    setLocationStatus("Office location saved from current GPS.");
  }

  async function updateOfficePresence(
    coords: Pick<Location.LocationObjectCoords, "latitude" | "longitude">,
    options?: {
      allowTransition?: boolean;
      showAlert?: boolean;
      logStableState?: boolean;
    },
  ) {
    if (!officeLocationCoords) return;

    const distance = distanceMeters(officeLocationCoords, coords);
    const inside = distance <= OFFICE_GEOFENCE_RADIUS_METERS;
    const wasInside = officeInsideZoneRef.current;
    const allowTransition = options?.allowTransition ?? true;
    const showAlert = options?.showAlert ?? false;
    const logStableState = options?.logStableState ?? false;

    officeInsideZoneRef.current = inside;
    setOfficeInsideZone(inside);
    setLocationStatus(
      inside
        ? `Inside office zone (${Math.round(distance)}m from office).`
        : `Outside office zone by ${Math.round(distance)}m.`,
    );

    if (allowTransition && inside && !wasInside) {
      const detail =
        officeAutoMessage && officeArrivalEnabled
          ? `Reached office. ${officeArrivalMessage}`
          : "Reached office.";
      pushOfficeLog("arrival", detail);
      if (officeAutoMessage && officeArrivalEnabled) {
        const sent = await sendOfficeMessageToRecipients(officeArrivalMessage);
        if (!sent) {
          pushOfficeLog("check", "Arrival auto-message skipped because SMS permission or recipients are missing.");
        }
      }
      if (showAlert) {
        Alert.alert("Office Arrival", detail);
      }
      return;
    }

    if (allowTransition && !inside && wasInside) {
      const detail =
        officeAutoMessage && officeDepartureEnabled
          ? `Left office. ${officeDepartureMessage}`
          : "Left office.";
      pushOfficeLog("departure", detail);
      if (officeAutoMessage && officeDepartureEnabled) {
        const sent = await sendOfficeMessageToRecipients(officeDepartureMessage);
        if (!sent) {
          pushOfficeLog(
            "check",
            "Departure auto-message skipped because SMS permission or recipients are missing.",
          );
        }
      }
      if (showAlert) {
        Alert.alert("Office Departure", detail);
      }
      return;
    }

    if (logStableState) {
      pushOfficeLog(
        "check",
        inside
          ? `Still inside office zone (${Math.round(distance)}m).`
          : `Outside office zone by ${Math.round(distance)}m.`,
      );
    }
  }

  async function handleCheckOfficeStatus() {
    if (!officeLocationCoords) {
      Alert.alert("Office location missing", "Set the office location first.");
      return;
    }
    if (!(await ensureOfficeTrackingPermissions())) return;

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await updateOfficePresence(current.coords, {
      allowTransition: true,
      showAlert: true,
      logStableState: true,
    });
  }

  function evaluateDrivingSpeed(speedKph: number) {
    if (!drivingAutoDetect) return;

    if (speedKph > 25 && !drivingActive) {
      setDrivingActive(true);
      activateMode("driving", "Driving Mode");
      pushDrivingLog(`Speed ${Math.round(speedKph)} km/h detected. Driving Mode auto-enabled.`);
    }

    if (speedKph < 15 && drivingActive) {
      setDrivingActive(false);
      stopMode("driving");
      pushDrivingLog(`Speed dropped to ${Math.round(speedKph)} km/h. Driving Mode auto-disabled.`);
    }
  }

  async function handleCheckDrivingSpeed() {
    if (!(await ensureLocationPermission())) return;
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const speedKph = Math.max(0, (current.coords.speed ?? 0) * 3.6);
    setDrivingSpeed(speedKph);
    evaluateDrivingSpeed(speedKph);
    pushDrivingLog(`Live speed check recorded ${Math.round(speedKph)} km/h.`);
  }

  function handleDrivingTestCall(callerId = drivingTestCaller) {
    const contact =
      callerId === "unknown"
        ? null
        : contactsSeed.find((item) => item.id === callerId) ?? null;
    const callerName = contact?.name ?? "Unknown Number";

    if (!drivingActive) {
      pushDrivingLog(`${callerName} can call normally because Driving Mode is off.`);
      return;
    }

    pushDrivingLog(
      drivingAutoReply
        ? `${callerName} was muted and auto-replied with driving message.`
        : `${callerName} was muted during driving.`,
    );
    Alert.alert(
      "Driving Call Handled",
      drivingAutoReply ? drivingReplyText : `${callerName} was muted during driving.`,
    );
  }

  function handleCustomStop(manual = true) {
    setCustomSession(null);
    setCustomTick(Date.now());
    stopMode("custom");
    pushCustomLog(manual ? "Custom Mode stopped." : "Custom Mode ended automatically.");
  }

  useEffect(() => {
    let mounted = true;

    async function loadRestState() {
      try {
        const raw = await AsyncStorage.getItem(REST_STORAGE_KEY);
        if (!raw || !mounted) {
          if (mounted) setRestHydrated(true);
          return;
        }

        const saved = JSON.parse(raw) as {
          preset?: 60 | 120 | 180 | "custom";
          customMinutes?: number;
          missedCalls?: number;
          priorityEnabled?: boolean;
          priorityContacts?: Contact[];
          session?: RestSession | null;
          blockedCalls?: number;
          allowedCalls?: number;
          missedStreak?: number;
          logs?: RestCallLog[];
          testCaller?: string;
        };

        if (saved.preset) setRestPreset(saved.preset);
        if (typeof saved.customMinutes === "number") setRestCustomMinutes(saved.customMinutes);
        if (typeof saved.missedCalls === "number") setRestMissedCalls(saved.missedCalls);
        if (typeof saved.priorityEnabled === "boolean") setRestPriorityEnabled(saved.priorityEnabled);
        if (Array.isArray(saved.priorityContacts)) setRestPriorityContacts(saved.priorityContacts);
        if (typeof saved.blockedCalls === "number") setRestBlockedCalls(saved.blockedCalls);
        if (typeof saved.allowedCalls === "number") setRestAllowedCalls(saved.allowedCalls);
        if (typeof saved.missedStreak === "number") setRestMissedStreak(saved.missedStreak);
        if (Array.isArray(saved.logs)) setRestCallLogs(saved.logs);
        if (typeof saved.testCaller === "string") setRestTestCaller(saved.testCaller);

        if (saved.session && saved.session.endsAt > Date.now()) {
          setRestSession(saved.session);
          setRestTick(Date.now());
          setActiveMode({
            key: "rest",
            title: "Rest Mode",
            endLabel: `Ends at ${formatClockLabel(saved.session.endsAt)}`,
          });
        } else {
          setRestSession(null);
        }
      } catch {
        // Ignore malformed storage and continue with defaults.
      } finally {
        if (mounted) setRestHydrated(true);
      }
    }

    void loadRestState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!restHydrated) return;

    void AsyncStorage.setItem(
      REST_STORAGE_KEY,
      JSON.stringify({
        preset: restPreset,
        customMinutes: restCustomMinutes,
        missedCalls: restMissedCalls,
        priorityEnabled: restPriorityEnabled,
        priorityContacts: restPriorityContacts,
        session: restSession,
        blockedCalls: restBlockedCalls,
        allowedCalls: restAllowedCalls,
        missedStreak: restMissedStreak,
        logs: restCallLogs,
        testCaller: restTestCaller,
      }),
    );
  }, [
    restAllowedCalls,
    restBlockedCalls,
    restCallLogs,
    restCustomMinutes,
    restHydrated,
    restMissedCalls,
    restMissedStreak,
    restPreset,
    restPriorityContacts,
    restPriorityEnabled,
    restSession,
    restTestCaller,
  ]);

  useEffect(() => {
    void ensureNotificationPermission();
    void refreshReminderDiagnostics();
    void ensureNotificationListenerBinding();
  }, []);

  useEffect(() => {
    void refreshVoiceRecorderAccess();
    void refreshVoiceSimCards();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAppState() {
      let savedMuteApps: MuteApp[] | undefined;

      try {
        const raw = await AsyncStorage.getItem(APP_STORAGE_KEY);
        if (!raw || !mounted) {
          if (mounted && Platform.OS === "android") {
            await refreshMuteAppsState();
          }
          if (mounted) setAppHydrated(true);
          return;
        }

        const saved = JSON.parse(raw) as {
          reminders?: Reminder[];
          keepNotes?: unknown[];
          keepGrid?: boolean;
          todoSelectedDate?: string;
          todos?: unknown[];
          expenseEntries?: unknown[];
          expenseStorageVersion?: number;
          voiceRecorderEnabled?: boolean;
          voiceAutoStart?: boolean;
          voiceSpeakerAssist?: boolean;
          voiceRecordScope?: VoiceRecorderScope;
          voiceSelectedLine?: VoiceRecorderLine;
          voicePersonalNumber?: string;
          voiceOfficeNumber?: string;
          voiceCustomLabel?: string;
          voiceCustomNumber?: string;
          voiceSelectedSimId?: string | null;
          voiceContacts?: Contact[];
          voiceLogs?: unknown[];
          officeLocationLabel?: string;
          officeLocationCoords?: SavedLocation | null;
          officePriority?: string[];
          officePriorityExtraContacts?: Contact[];
          officeAutoMessage?: boolean;
          officeArrivalEnabled?: boolean;
          officeDepartureEnabled?: boolean;
          officeArrivalMessage?: string;
          officeDepartureMessage?: string;
          officeMessageRecipients?: Contact[];
          officePriorityCallsEnabled?: boolean;
          officeMuteUnknown?: boolean;
          officeQuickAddExpanded?: boolean;
          officeActive?: boolean;
          officeInsideZone?: boolean;
          officeLogs?: OfficeLog[];
          drivingAutoDetect?: boolean;
          drivingAutoReply?: boolean;
          drivingReplyText?: string;
          drivingActive?: boolean;
          drivingSpeed?: number;
          drivingLogs?: DrivingLog[];
          newsCategory?: string;
          savedNewsIds?: string[];
          muteApps?: MuteApp[];
          customDuration?: number;
          customAbsoluteSilence?: boolean;
          customMuteNotifications?: boolean;
          customContactMode?: "mute-all" | "specific";
          customAllowedContacts?: string[];
          customSession?: CustomSession | null;
          customLogs?: CustomLog[];
          exerciseHistory?: ExerciseHistory[];
        };

        if (Array.isArray(saved.reminders)) setReminders(saved.reminders);
        if (Array.isArray(saved.keepNotes)) setKeepNotes(normalizeKeepNotes(saved.keepNotes));
        if (typeof saved.keepGrid === "boolean") setKeepGrid(saved.keepGrid);
        if (typeof saved.todoSelectedDate === "string") setTodoSelectedDate(saved.todoSelectedDate);
        if (Array.isArray(saved.todos)) setTodos(normalizeTodoTasks(saved.todos));
        if (
          saved.expenseStorageVersion === EXPENSE_STORAGE_VERSION &&
          Array.isArray(saved.expenseEntries)
        ) {
          setExpenseEntries(normalizeExpenseEntries(saved.expenseEntries));
        }
        if (typeof saved.voiceRecorderEnabled === "boolean") {
          setVoiceRecorderEnabled(saved.voiceRecorderEnabled);
        }
        if (typeof saved.voiceAutoStart === "boolean") setVoiceAutoStart(saved.voiceAutoStart);
        if (typeof saved.voiceSpeakerAssist === "boolean") {
          setVoiceSpeakerAssist(saved.voiceSpeakerAssist);
        }
        if (saved.voiceRecordScope === "all" || saved.voiceRecordScope === "selected") {
          setVoiceRecordScope(saved.voiceRecordScope);
        }
        if (
          saved.voiceSelectedLine === "personal" ||
          saved.voiceSelectedLine === "office" ||
          saved.voiceSelectedLine === "custom"
        ) {
          setVoiceSelectedLine(saved.voiceSelectedLine);
        }
        if (typeof saved.voicePersonalNumber === "string") {
          setVoicePersonalNumber(saved.voicePersonalNumber);
        }
        if (typeof saved.voiceOfficeNumber === "string") {
          setVoiceOfficeNumber(saved.voiceOfficeNumber);
        }
        if (typeof saved.voiceCustomLabel === "string") setVoiceCustomLabel(saved.voiceCustomLabel);
        if (typeof saved.voiceCustomNumber === "string") setVoiceCustomNumber(saved.voiceCustomNumber);
        if (typeof saved.voiceSelectedSimId === "string" || saved.voiceSelectedSimId === null) {
          setVoiceSelectedSimId(saved.voiceSelectedSimId ?? null);
        }
        if (Array.isArray(saved.voiceContacts)) setVoiceContacts(saved.voiceContacts);
        if (Array.isArray(saved.voiceLogs)) {
          setVoiceLogs(normalizeVoiceRecorderLogs(saved.voiceLogs));
        }
        if (typeof saved.officeLocationLabel === "string") {
          setOfficeLocationLabel(saved.officeLocationLabel);
          setOfficeLocationDraft(saved.officeLocationLabel);
        }
        if (saved.officeLocationCoords) setOfficeLocationCoords(saved.officeLocationCoords);
        if (Array.isArray(saved.officePriority)) setOfficePriority(saved.officePriority);
        if (Array.isArray(saved.officePriorityExtraContacts)) {
          setOfficePriorityExtraContacts(saved.officePriorityExtraContacts);
        }
        if (typeof saved.officeAutoMessage === "boolean") setOfficeAutoMessage(saved.officeAutoMessage);
        if (typeof saved.officeArrivalEnabled === "boolean") setOfficeArrivalEnabled(saved.officeArrivalEnabled);
        if (typeof saved.officeDepartureEnabled === "boolean") setOfficeDepartureEnabled(saved.officeDepartureEnabled);
        if (typeof saved.officeArrivalMessage === "string") setOfficeArrivalMessage(saved.officeArrivalMessage);
        if (typeof saved.officeDepartureMessage === "string") setOfficeDepartureMessage(saved.officeDepartureMessage);
        if (Array.isArray(saved.officeMessageRecipients)) setOfficeMessageRecipients(saved.officeMessageRecipients);
        if (typeof saved.officePriorityCallsEnabled === "boolean") setOfficePriorityCallsEnabled(saved.officePriorityCallsEnabled);
        if (typeof saved.officeMuteUnknown === "boolean") setOfficeMuteUnknown(saved.officeMuteUnknown);
        if (typeof saved.officeQuickAddExpanded === "boolean") setOfficeQuickAddExpanded(saved.officeQuickAddExpanded);
        if (typeof saved.officeActive === "boolean") setOfficeActive(saved.officeActive);
        if (typeof saved.officeInsideZone === "boolean") setOfficeInsideZone(saved.officeInsideZone);
        if (Array.isArray(saved.officeLogs)) setOfficeLogs(saved.officeLogs);
        if (typeof saved.drivingAutoDetect === "boolean") setDrivingAutoDetect(saved.drivingAutoDetect);
        if (typeof saved.drivingAutoReply === "boolean") setDrivingAutoReply(saved.drivingAutoReply);
        if (typeof saved.drivingReplyText === "string") setDrivingReplyText(saved.drivingReplyText);
        if (typeof saved.drivingActive === "boolean") setDrivingActive(saved.drivingActive);
        if (typeof saved.drivingSpeed === "number") setDrivingSpeed(saved.drivingSpeed);
        if (Array.isArray(saved.drivingLogs)) setDrivingLogs(saved.drivingLogs);
        if (typeof saved.newsCategory === "string") setNewsCategory(saved.newsCategory);
        if (Array.isArray(saved.savedNewsIds)) setSavedNewsIds(saved.savedNewsIds);
        if (Array.isArray(saved.muteApps)) {
          savedMuteApps = saved.muteApps;
          setMuteApps(saved.muteApps);
        }
        if (typeof saved.customDuration === "number") setCustomDuration(saved.customDuration);
        if (typeof saved.customAbsoluteSilence === "boolean") setCustomAbsoluteSilence(saved.customAbsoluteSilence);
        if (typeof saved.customMuteNotifications === "boolean") setCustomMuteNotifications(saved.customMuteNotifications);
        if (saved.customContactMode) setCustomContactMode(saved.customContactMode);
        if (Array.isArray(saved.customAllowedContacts)) setCustomAllowedContacts(saved.customAllowedContacts);
        if (saved.customSession && saved.customSession.endsAt > Date.now()) {
          setCustomSession(saved.customSession);
          setCustomTick(Date.now());
        }
        if (Array.isArray(saved.customLogs)) setCustomLogs(saved.customLogs);
        if (Array.isArray(saved.exerciseHistory)) setExerciseHistory(saved.exerciseHistory);
      } catch {
        // Ignore malformed app state and continue with defaults.
      } finally {
        if (mounted && Platform.OS === "android") {
          await refreshMuteAppsState(savedMuteApps);
        }
        if (mounted) setAppHydrated(true);
      }
    }

    void loadAppState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appHydrated) return;

    void AsyncStorage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({
        reminders,
        keepNotes,
        keepGrid,
        todoSelectedDate,
        todos,
        expenseStorageVersion: EXPENSE_STORAGE_VERSION,
        expenseEntries,
        voiceRecorderEnabled,
        voiceAutoStart,
        voiceSpeakerAssist,
        voiceRecordScope,
        voiceSelectedLine,
        voicePersonalNumber,
        voiceOfficeNumber,
        voiceCustomLabel,
        voiceCustomNumber,
        voiceSelectedSimId,
        voiceContacts,
        voiceLogs,
        officeLocationLabel,
        officeLocationCoords,
        officePriority,
        officePriorityExtraContacts,
        officeAutoMessage,
        officeArrivalEnabled,
        officeDepartureEnabled,
        officeArrivalMessage,
        officeDepartureMessage,
        officeMessageRecipients,
        officePriorityCallsEnabled,
        officeMuteUnknown,
        officeQuickAddExpanded,
        officeActive,
        officeInsideZone,
        officeLogs,
        drivingAutoDetect,
        drivingAutoReply,
        drivingReplyText,
        drivingActive,
        drivingSpeed,
        drivingLogs,
        newsCategory,
        savedNewsIds,
        muteApps,
        customDuration,
        customAbsoluteSilence,
        customMuteNotifications,
        customContactMode,
        customAllowedContacts,
        customSession,
        customLogs,
        exerciseHistory,
      }),
    );
  }, [
    appHydrated,
    customAbsoluteSilence,
    customAllowedContacts,
    customContactMode,
    customDuration,
    customLogs,
    customMuteNotifications,
    customSession,
    drivingActive,
    drivingAutoDetect,
    drivingAutoReply,
    drivingLogs,
    drivingReplyText,
    drivingSpeed,
    exerciseHistory,
    expenseEntries,
    keepGrid,
    keepNotes,
    muteApps,
    newsCategory,
    voiceAutoStart,
    voiceContacts,
    voiceCustomLabel,
    voiceCustomNumber,
    voiceLogs,
    voiceOfficeNumber,
    voicePersonalNumber,
    voiceRecorderEnabled,
    voiceRecordScope,
    voiceSelectedSimId,
    voiceSelectedLine,
    officeActive,
    officeAutoMessage,
    officeArrivalEnabled,
    officeArrivalMessage,
    officeDepartureEnabled,
    officeDepartureMessage,
    officeInsideZone,
    officeLocationCoords,
    officeLocationLabel,
    officeLogs,
    officeMessageRecipients,
    officeMuteUnknown,
    officePriorityCallsEnabled,
    officePriority,
    officePriorityExtraContacts,
    officeQuickAddExpanded,
    reminders,
    savedNewsIds,
    todoSelectedDate,
    todos,
  ]);

  useEffect(() => {
    if (!keepDraftRestoreReady) {
      return;
    }

    if (!keepComposerVisible) {
      return;
    }

    void persistKeepDraftState(
      buildKeepDraftPersistenceState({
        editingNoteId: keepEditingNoteId,
        title: keepDraftTitle,
        body: keepDraftBody,
        listCategories: keepDraftListCategories,
        listCategoryInput: keepDraftListCategoryInput,
        activeListCategory: keepDraftActiveListCategory,
        categoryComposerVisible: keepCategoryComposerVisible,
        checklist: keepDraftChecklist,
        color: keepDraftColor,
        pinned: keepDraftPinned,
        listMode: keepDraftListMode,
        image: keepDraftImage,
        audio: keepDraftAudio,
      }),
    );
  }, [
    keepComposerVisible,
    keepDraftAudio,
    keepDraftActiveListCategory,
    keepDraftBody,
    keepDraftListCategories,
    keepDraftListCategoryInput,
    keepDraftChecklist,
    keepDraftColor,
    keepDraftImage,
    keepDraftListMode,
    keepDraftPinned,
    keepDraftRestoreReady,
    keepDraftTitle,
    keepCategoryComposerVisible,
    keepEditingNoteId,
  ]);

  useEffect(() => {
    if (!appHydrated || Platform.OS !== "android" || !LifeBalanceNative?.updateVoiceRecorderConfig) {
      return;
    }

    const selectedLineNumber = getVoiceEffectiveLineNumber(voiceSimCards, voiceSelectedSimId);
    const allowedNumbers = voiceContacts
      .map((contact) => normalizePhone(contact.phone))
      .filter(Boolean);

    void LifeBalanceNative.updateVoiceRecorderConfig(
      voiceRecorderEnabled,
      voiceAutoStart,
      voiceSpeakerAssist,
      voiceRecordScope,
      voiceSelectedLine,
      voiceSelectedSimId,
      selectedLineNumber,
      allowedNumbers,
    );
  }, [
    appHydrated,
    voiceAutoStart,
    voiceSpeakerAssist,
    voiceContacts,
    voiceCustomNumber,
    voiceSelectedSimId,
    voiceSimCards,
    voiceOfficeNumber,
    voicePersonalNumber,
    voiceRecordScope,
    voiceRecorderEnabled,
    voiceSelectedLine,
  ]);

  useEffect(() => {
    if (!appHydrated || keepDraftRestoreDoneRef.current) return;
    keepDraftRestoreDoneRef.current = true;

    let cancelled = false;

    async function restoreKeepDraft() {
      const [savedDraft, pendingResult] = await Promise.all([
        readPersistedKeepDraft(),
        LifeBalanceNative?.consumePendingPickedFile?.().catch(() => null) ?? Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      if (!savedDraft && !pendingResult) {
        setKeepDraftRestoreReady(true);
        return;
      }

      const restoredDraft: KeepDraftPersistence = savedDraft ?? {
        editingNoteId: null,
        title: "",
        body: "",
        listCategories: [],
        listCategoryInput: "",
        activeListCategory: null,
        categoryComposerVisible: false,
        checklist: [],
        color: keepNoteColors[0],
        pinned: false,
        listMode: false,
      };

      setScreenStack(["home", "reminder"]);
      setKeepEditingNoteId(restoredDraft.editingNoteId);
      setKeepDraftTitle(restoredDraft.title);
      setKeepDraftBody(restoredDraft.body);
      setKeepDraftListCategories(restoredDraft.listCategories);
      setKeepDraftListCategoryInput(restoredDraft.listCategoryInput);
      setKeepDraftActiveListCategory(restoredDraft.activeListCategory);
      setKeepDraftChecklist(restoredDraft.checklist);
      setKeepDraftImage(
        pendingResult?.requestType === "image" ? pendingResult.file : restoredDraft.image,
      );
      setKeepDraftAudio(
        pendingResult?.requestType === "audio" ? pendingResult.file : restoredDraft.audio,
      );
      setKeepDraftColor(restoredDraft.color);
      setKeepDraftPinned(restoredDraft.pinned);
      setKeepDraftListMode(restoredDraft.listMode);
      setKeepCategoryComposerVisible(restoredDraft.categoryComposerVisible);
      setKeepQuickMenuOpen(false);
      setKeepComposerVisible(true);
      setKeepDraftRestoreReady(true);
    }

    void restoreKeepDraft();

    return () => {
      cancelled = true;
    };
  }, [appHydrated, keepDraftRestoreDoneRef]);

  useEffect(() => {
    if (!appHydrated || Platform.OS !== "android") return;
    if (!LifeBalanceNative?.setMutedNotificationPackages) return;

    const mutedPackages = Array.from(buildMutePackageState(muteApps));
    void LifeBalanceNative.setMutedNotificationPackages(mutedPackages);
  }, [appHydrated, muteApps]);

  useEffect(() => {
    if (!restSession) return;

    setRestTick(Date.now());
    const timer = setInterval(() => {
      const now = Date.now();
      setRestTick(now);

      if (now >= restSession.endsAt) {
        clearInterval(timer);
        handleStopRest(false);
        Alert.alert(
          "Rest Mode Completed",
          "Selected quiet time is over. Phone is unmuted and Rest Mode is now off.",
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [restSession]);

  useEffect(() => {
    void refreshRestCallScreeningStatus();
    void refreshMuteListenerStatus();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshReminderDiagnostics();
        void refreshRestCallScreeningStatus();
        void ensureNotificationListenerBinding();
        void refreshMuteListenerStatus();
        void refreshMuteAppsState();
        void refreshOfficeStateFromStorage();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!restSession) {
      void syncRestModeNative(false);
      return;
    }

    void syncRestModeNative(true);
  }, [restMissedCalls, restPriorityContacts, restPriorityEnabled, restSession]);

  useEffect(() => {
    officeInsideZoneRef.current = officeInsideZone;
  }, [officeInsideZone]);

  useEffect(() => {
    if (!customSession) return;

    setCustomTick(Date.now());
    const timer = setInterval(() => {
      const now = Date.now();
      setCustomTick(now);
      if (now >= customSession.endsAt) {
        clearInterval(timer);
        handleCustomStop(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [customSession]);

  useEffect(() => {
    evaluateDrivingSpeed(drivingSpeed);
  }, [drivingSpeed]);

  useEffect(() => {
    if (!drivingAutoDetect) return;

    const timer = setInterval(() => {
      void handleCheckDrivingSpeed();
    }, 30000);

    return () => clearInterval(timer);
  }, [drivingAutoDetect]);

  useEffect(() => {
    if (!exerciseActive) {
      if (exerciseWatchRef.current) {
        exerciseWatchRef.current.remove();
        exerciseWatchRef.current = null;
      }
      return;
    }

    let mounted = true;

    void (async () => {
      if (!(await ensureLocationPermission()) || !mounted) return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 5,
        },
        (location) => {
          const nextPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          setExerciseRoutePoints((current) => {
            const previous = current[current.length - 1];
            if (previous) {
              const segment = distanceMeters(previous, nextPoint) / 1000;
              setExerciseDistanceKm((distance) => distance + segment);
            }
            return [...current, nextPoint];
          });
          setLocationStatus("Tracking workout route live.");
        },
      );

      exerciseWatchRef.current = subscription;
    })();

    return () => {
      mounted = false;
      if (exerciseWatchRef.current) {
        exerciseWatchRef.current.remove();
        exerciseWatchRef.current = null;
      }
    };
  }, [exerciseActive]);

  useEffect(() => {
    if (!exerciseActive || !exerciseStartedAt) return;

    const timer = setInterval(() => {
      const minutes = Math.max(1, Math.floor((Date.now() - exerciseStartedAt) / 60000));
      setExerciseMinutes(minutes);
      setExerciseCalories(minutes * 6);
    }, 15000);

    return () => clearInterval(timer);
  }, [exerciseActive, exerciseStartedAt]);

  useEffect(() => {
    if (!officeActive || !officeLocationCoords) {
      void stopOfficeBackgroundTracking();
      return;
    }

    let mounted = true;

    void (async () => {
      const trackingStarted = await startOfficeBackgroundTracking();
      if (!trackingStarted || !mounted) return;

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mounted) return;

      await updateOfficePresence(initialLocation.coords, {
        allowTransition: true,
        showAlert: false,
        logStableState: false,
      });
      pushOfficeLog("check", "Office Mode background geofence is active for automatic arrival and departure detection.");
    })();

    return () => {
      mounted = false;
      if (!officeActive) {
        void stopOfficeBackgroundTracking();
      }
    };
  }, [
    officeActive,
    officeLocationCoords,
  ]);

  function renderHome() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppCard style={styles.welcomeCard}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.heroName}>Alex! 👋</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🧸</Text>
          </View>
        </AppCard>

        {activeMode ? (
          <LinearGradient
            colors={["#fb6a7a", "#ff5f7d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeHero}
          >
            <Text style={styles.activeLabel}>CURRENTLY ACTIVE</Text>
            <Text style={styles.activeTitle}>{activeMode.title}</Text>
            <View style={styles.activeBadge}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.activeBadgeText}>
                {activeMode.endLabel ?? "Running now"}
              </Text>
            </View>
            <View style={styles.activeGlow} />
          </LinearGradient>
        ) : (
          <AppCard style={styles.balanceCard}>
            <View style={styles.balanceRing}>
              <View style={styles.balanceRingInner}>
                <Text style={styles.balanceRingValue}>65%</Text>
              </View>
            </View>
            <View style={styles.balanceTextWrap}>
              <Text style={styles.balanceTitle}>Daily Balance</Text>
              <Text style={styles.balanceBody}>
                You&apos;re doing great! Keep up the good work maintaining focus.
              </Text>
            </View>
          </AppCard>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Modules</Text>
          <Pressable onPress={() => switchRoot("modes")}>
            <Text style={styles.linkText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.moduleGrid}>
          {moduleCards.map((module) => (
            <ModuleTile
              key={module.key}
              module={module}
              active={activeMode?.key === module.key}
              onPress={() => pushScreen(module.key)}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderKeepNotesScreen(withBack: boolean) {
    const searchTerm = keepSearch.trim().toLowerCase();
    const visibleNotes = sortKeepNotes(
      keepNotes.filter((note) => {
        if (!searchTerm) return true;

        const haystack = [
          note.title,
          ...note.listCategories,
          note.body,
          ...note.checklist.map((item) => item.text),
          note.image?.name ?? "",
          note.audio?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchTerm);
      }),
    );
    const gridRows = keepGrid ? chunkItems(visibleNotes, 2) : [];
    const keepListModeActive = keepDraftListMode || keepDraftChecklist.length > 0;
    const keepDraftChecklistSections = buildKeepChecklistSections(
      keepDraftListCategories,
      keepDraftChecklist,
    );

    const renderKeepNoteCard = (note: KeepNote, compact = false) => {
      const checklistSections = buildKeepChecklistSections(note.listCategories, note.checklist);
      const checklistPreview = checklistSections.flatMap((section) => section.items).slice(0, compact ? 2 : 3);
      const bodyPreview = note.body.trim();

      return (
        <Pressable
          key={note.id}
          style={[
            styles.keepNoteCard,
            compact && styles.keepNoteCardCompact,
            { backgroundColor: note.color },
          ]}
          onPress={() => openKeepEditor(note)}
        >
          <View style={styles.keepNoteHeader}>
            <View style={styles.keepNoteTitleWrap}>
              {note.title ? (
                <Text style={styles.keepNoteTitle} numberOfLines={compact ? 2 : 3}>
                  {note.title}
                </Text>
              ) : (
                <Text style={styles.keepNoteUntitled}>Untitled note</Text>
              )}
              {note.pinned ? (
                <Ionicons name="pin" size={14} color="#5b64c9" />
              ) : null}
            </View>
            <Text style={styles.keepNoteDate}>{formatDateStamp(note.updatedAt)}</Text>
          </View>

          {bodyPreview ? (
            <Text style={styles.keepNoteBody} numberOfLines={compact ? 6 : 8}>
              {bodyPreview}
            </Text>
          ) : null}

          {checklistPreview.length ? (
            <View style={styles.keepChecklistPreview}>
              {checklistSections.map((section) => (
                <View key={section.key} style={styles.keepChecklistPreviewSection}>
                  {section.title ? (
                    <Text style={styles.keepChecklistPreviewHeading} numberOfLines={1}>
                      {section.title}
                    </Text>
                  ) : null}
                  {section.items.slice(0, compact ? 2 : 3).map((item) => (
                    <View key={item.id} style={styles.keepChecklistPreviewRow}>
                      <Ionicons
                        name={item.checked ? "checkbox" : "square-outline"}
                        size={14}
                        color={item.checked ? "#5b64c9" : "#8f8c9e"}
                      />
                      <Text
                        style={[
                          styles.keepChecklistPreviewText,
                          item.checked && styles.keepChecklistPreviewTextChecked,
                        ]}
                        numberOfLines={1}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {note.image?.uri ? (
            <Image source={{ uri: note.image.uri }} style={styles.keepNoteImagePreview} />
          ) : null}

          {note.audio ? (
            <Pressable
              style={styles.keepAttachmentBadge}
              onPress={() => void handleOpenKeepAttachment(note.audio)}
            >
              <Ionicons name="mic-outline" size={14} color="#5b64c9" />
              <Text style={styles.keepAttachmentBadgeText} numberOfLines={1}>
                {note.audio.name}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.keepNoteActions}>
            <Pressable
              style={styles.keepNoteActionButton}
              onPress={(event) => {
                event.stopPropagation();
                handleDownloadKeepNote(note);
              }}
            >
              <Ionicons name="download-outline" size={18} color="#303047" />
            </Pressable>
            <Pressable
              style={styles.keepNoteActionButton}
              onPress={(event) => {
                event.stopPropagation();
                void handleShareKeepNote(note);
              }}
            >
              <Ionicons name="share-social-outline" size={18} color="#303047" />
            </Pressable>
          </View>
        </Pressable>
      );
    };

    return (
      <>
        <ScrollView contentContainerStyle={styles.keepScreenContent} showsVerticalScrollIndicator={false}>
          <View style={styles.keepTopBar}>
            <Pressable
              style={styles.keepTopIconButton}
              onPress={withBack ? goBack : () => switchRoot("home")}
            >
              <Ionicons
                name={withBack ? "arrow-back" : "menu-outline"}
                size={28}
                color="#38364a"
              />
            </Pressable>

            <View style={styles.keepSearchShell}>
              <Ionicons name="search-outline" size={20} color="#7b7990" />
              <TextInput
                value={keepSearch}
                onChangeText={setKeepSearch}
                placeholder="Search Keep"
                placeholderTextColor="#8f8ca0"
                style={styles.keepSearchInput}
              />
              <Pressable
                style={styles.keepSearchAction}
                onPress={() => setKeepGrid((current) => !current)}
              >
                <Ionicons
                  name={keepGrid ? "reorder-three-outline" : "grid-outline"}
                  size={20}
                  color="#3f3d52"
                />
              </Pressable>
            </View>

            <View style={styles.keepAvatar}>
              <Text style={styles.keepAvatarText}>LB</Text>
            </View>
          </View>

          <View style={styles.keepSectionHeader}>
            <View>
              <Text style={styles.keepSectionTitle}>Keep Notes</Text>
              <Text style={styles.keepSectionCaption}>
                Text, checklist, image, and audio notes in one place
              </Text>
            </View>
            <Text style={styles.keepSectionCount}>{visibleNotes.length}</Text>
          </View>

          {visibleNotes.length ? (
            keepGrid ? (
              <View style={styles.keepGridWrap}>
                {gridRows.map((row, rowIndex) => (
                  <View key={`keep-row-${rowIndex}`} style={styles.keepGridRow}>
                    {row.map((note) => (
                      <View key={note.id} style={styles.keepGridCell}>
                        {renderKeepNoteCard(note, true)}
                      </View>
                    ))}
                    {row.length === 1 ? <View style={styles.keepGridCell} /> : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.keepListWrap}>
                {visibleNotes.map((note) => renderKeepNoteCard(note))}
              </View>
            )
          ) : (
            <View style={styles.keepEmptyState}>
              <Ionicons name="document-text-outline" size={40} color="#7d7a90" />
              <Text style={styles.keepEmptyTitle}>No notes found</Text>
              <Text style={styles.keepEmptyText}>
                Use the plus button to add text, checklist, image, or audio notes.
              </Text>
            </View>
          )}
        </ScrollView>

        <Animated.View
          pointerEvents={keepQuickMenuOpen ? "auto" : "none"}
          style={[
            styles.keepFabMenuWrap,
            {
              opacity: keepQuickMenuAnim,
              transform: [
                {
                  translateY: keepQuickMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: keepQuickMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {[
            { key: "audio", label: "Audio", icon: "mic-outline" as const },
            { key: "image", label: "Image", icon: "image-outline" as const },
            { key: "list", label: "List", icon: "checkbox-outline" as const },
            { key: "text", label: "Text", icon: "text-outline" as const },
          ].map((action, index) => (
            <Animated.View
              key={action.key}
              style={{
                opacity: keepQuickMenuAnim.interpolate({
                  inputRange: [index * 0.14, 0.38 + index * 0.14, 1],
                  outputRange: [0, 1, 1],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    translateY: keepQuickMenuAnim.interpolate({
                      inputRange: [index * 0.14, 0.38 + index * 0.14, 1],
                      outputRange: [16 + index * 6, 0, 0],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    scale: keepQuickMenuAnim.interpolate({
                      inputRange: [index * 0.14, 0.38 + index * 0.14, 1],
                      outputRange: [0.92, 1, 1],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={styles.keepFabMenuButton}
                onPress={() =>
                  openKeepComposer(action.key as "text" | "list" | "image" | "audio")
                }
              >
                <Ionicons name={action.icon} size={22} color="#303047" />
                <Text style={styles.keepFabMenuText}>{action.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        <Pressable
          style={styles.keepFloatingButton}
          onPress={() => setKeepQuickMenuOpen((current) => !current)}
        >
          <Ionicons name={keepQuickMenuOpen ? "close" : "add"} size={34} color="#fff" />
        </Pressable>

        <Modal
          visible={keepComposerVisible}
          animationType="slide"
          onRequestClose={closeKeepComposer}
        >
          <SafeAreaView style={styles.keepEditorScreen}>
            <View style={styles.keepEditorHeader}>
              <Pressable style={styles.keepEditorIconButton} onPress={closeKeepComposer}>
                <Ionicons name="arrow-back" size={28} color="#2e2b3c" />
              </Pressable>

              <View style={styles.keepEditorHeaderActions}>
                <Pressable style={styles.keepEditorIconButton} onPress={cycleKeepDraftColor}>
                  <Ionicons name="color-palette-outline" size={22} color="#2e2b3c" />
                </Pressable>
                <Pressable
                  style={styles.keepEditorIconButton}
                  onPress={() => handleKeepExportAction("download")}
                >
                  <Ionicons name="download-outline" size={22} color="#2e2b3c" />
                </Pressable>
                <Pressable
                  style={styles.keepEditorIconButton}
                  onPress={() => handleKeepExportAction("share")}
                >
                  <Ionicons name="share-social-outline" size={22} color="#2e2b3c" />
                </Pressable>
                {keepEditingNoteId ? (
                  <Pressable
                    style={styles.keepEditorIconButton}
                    onPress={() => handleDeleteKeepNote(keepEditingNoteId)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#d04d67" />
                  </Pressable>
                ) : null}
                <Pressable style={styles.keepEditorSaveButton} onPress={handleSaveKeepNote}>
                  <Text style={styles.keepEditorSaveText}>Save</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={[styles.keepEditorBody, { backgroundColor: keepDraftColor }]}
              contentContainerStyle={styles.keepEditorBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                value={keepDraftTitle}
                onChangeText={setKeepDraftTitle}
                placeholder="Title"
                placeholderTextColor="#9a98a8"
                style={styles.keepEditorTitleInput}
              />
              <TextInput
                value={keepDraftBody}
                onChangeText={setKeepDraftBody}
                placeholder="Write your note"
                placeholderTextColor="#9a98a8"
                style={styles.keepEditorTextInput}
                multiline
                textAlignVertical="top"
              />

              {keepDraftImage?.uri ? (
                <View style={styles.keepEditorMediaCard}>
                  <Image source={{ uri: keepDraftImage.uri }} style={styles.keepEditorImage} />
                  <View style={styles.keepEditorMediaFooter}>
                    <Text style={styles.keepEditorMediaTitle} numberOfLines={1}>
                      {keepDraftImage.name}
                    </Text>
                    <Pressable onPress={() => setKeepDraftImage(undefined)}>
                      <Ionicons name="close" size={22} color="#49465a" />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {keepDraftAudio ? (
                <Pressable
                  style={styles.keepEditorAudioCard}
                  onPress={() => void handleOpenKeepAttachment(keepDraftAudio)}
                >
                  <View style={styles.keepEditorAudioInfo}>
                    <Ionicons name="mic-outline" size={20} color="#5b64c9" />
                    <View style={styles.keepEditorAudioTextWrap}>
                      <Text style={styles.keepEditorAudioTitle} numberOfLines={1}>
                        {keepDraftAudio.name}
                      </Text>
                      <Text style={styles.keepEditorAudioMeta}>
                        {formatAttachmentSize(keepDraftAudio.size) || "Audio file"}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setKeepDraftAudio(undefined)}>
                    <Ionicons name="close" size={22} color="#49465a" />
                  </Pressable>
                </Pressable>
              ) : null}

              {keepListModeActive ? (
                <View style={styles.keepChecklistEditor}>
                  {keepCategoryComposerVisible || keepDraftListCategories.length ? (
                    <View style={styles.keepChecklistCategoryInlineCard}>
                      <View style={styles.keepChecklistCategoryInputRow}>
                        <TextInput
                          value={keepDraftListCategoryInput}
                          onChangeText={setKeepDraftListCategoryInput}
                          onSubmitEditing={addKeepListCategory}
                          placeholder="Add category"
                          placeholderTextColor="#a5a1b0"
                          style={styles.keepChecklistCategoryInput}
                        />
                        <Pressable
                          style={styles.keepChecklistCategoryAddButton}
                          onPress={addKeepListCategory}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </Pressable>
                      </View>

                      {keepDraftListCategories.length ? (
                        <View style={styles.keepChecklistCategoryChipWrap}>
                          {keepDraftListCategories.map((category) => (
                            <Pressable
                              key={category}
                              style={[
                                styles.keepChecklistCategoryChip,
                                keepDraftActiveListCategory === category &&
                                  styles.keepChecklistCategoryChipActive,
                              ]}
                              onPress={() => selectKeepListCategory(category)}
                            >
                              <Text style={styles.keepChecklistCategoryChipText}>{category}</Text>
                              <Pressable onPress={() => removeKeepListCategory(category)}>
                                <Ionicons name="close" size={16} color="#5652b9" />
                              </Pressable>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {keepDraftChecklistSections.map((section) => (
                    <View key={section.key} style={styles.keepChecklistSection}>
                      {section.title ? (
                        <Pressable
                          style={[
                            styles.keepChecklistSectionHeading,
                            keepDraftActiveListCategory === section.title &&
                              styles.keepChecklistSectionHeadingActive,
                          ]}
                          onPress={() => selectKeepListCategory(section.title)}
                        >
                          <Text style={styles.keepChecklistSectionHeadingText}>{section.title}</Text>
                        </Pressable>
                      ) : null}

                      {section.items.map((item) => (
                        <View key={item.id} style={styles.keepChecklistEditorRow}>
                          <Pressable onPress={() => toggleKeepChecklistItem(item.id)}>
                            <Ionicons
                              name={item.checked ? "checkbox" : "square-outline"}
                              size={22}
                              color={item.checked ? "#5b64c9" : "#7a788a"}
                            />
                          </Pressable>
                          <TextInput
                            value={item.text}
                            onChangeText={(text) => updateKeepChecklistItem(item.id, text)}
                            placeholder="List item"
                            placeholderTextColor="#a5a1b0"
                            style={styles.keepChecklistEditorInput}
                          />
                          <Pressable onPress={() => removeKeepChecklistItem(item.id)}>
                            <Ionicons name="close" size={20} color="#7a788a" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ))}

                  <View style={styles.keepChecklistActionRow}>
                    <Pressable
                      style={[styles.keepChecklistAddButton, styles.keepChecklistAddButtonInline]}
                      onPress={() => setKeepCategoryComposerVisible((current) => !current)}
                    >
                      <Ionicons name="pricetags-outline" size={18} color="#5b64c9" />
                      <Text style={styles.keepChecklistAddText}>Add categories</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.keepChecklistAddButton, styles.keepChecklistAddButtonInline]}
                      onPress={addKeepChecklistItem}
                    >
                      <Ionicons name="add" size={18} color="#5b64c9" />
                      <Text style={styles.keepChecklistAddText}>
                        {keepDraftActiveListCategory
                          ? `Add item in ${keepDraftActiveListCategory}`
                          : keepDraftChecklist.length
                            ? "Add list item"
                            : "Add first list item"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.keepEditorToolbar}>
              <Pressable style={styles.keepEditorToolButton} onPress={() => undefined}>
                <Ionicons name="text-outline" size={20} color="#303047" />
                <Text style={styles.keepEditorToolText}>Text</Text>
              </Pressable>
              <Pressable
                style={styles.keepEditorToolButton}
                onPress={() => setKeepDraftListMode(true)}
              >
                <Ionicons name="checkbox-outline" size={20} color="#303047" />
                <Text style={styles.keepEditorToolText}>List</Text>
              </Pressable>
              <Pressable style={styles.keepEditorToolButton} onPress={() => void handlePickKeepImage()}>
                <Ionicons name="image-outline" size={20} color="#303047" />
                <Text style={styles.keepEditorToolText}>Image</Text>
              </Pressable>
              <Pressable style={styles.keepEditorToolButton} onPress={() => void handlePickKeepAudio()}>
                <Ionicons name="mic-outline" size={20} color="#303047" />
                <Text style={styles.keepEditorToolText}>Audio</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  function renderModesScreen() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header title="All Modes" />
        <AppCard style={styles.infoStripCard}>
          <Text style={styles.infoStripTitle}>Build calm around your day</Text>
          <Text style={styles.infoStripText}>
            Pick a mode below. Every screen keeps the same visual language from your shared design.
          </Text>
        </AppCard>
        <View style={styles.moduleGrid}>
          {moduleCards.map((module) => (
            <ModuleTile
              key={module.key}
              module={module}
              active={activeMode?.key === module.key}
              onPress={() => pushScreen(module.key)}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderProfileScreen() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header title="Profile" />
        <AppCard style={styles.profileHero}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarEmoji}>🧘</Text>
            </View>
            <View>
              <Text style={styles.profileName}>Alex Sharma</Text>
              <Text style={styles.settingSubtitle}>LifeBalance Prototyping Profile</Text>
            </View>
          </View>
        </AppCard>
        <AppCard>
          <Text style={styles.subSectionTitle}>Today&apos;s Focus</Text>
          <View style={styles.profileStatRow}>
            <MetricCard
              title="Active Mode"
              value={activeMode?.title ?? "None"}
              subtitle="Current"
              icon={{ family: "ion", name: "sparkles-outline" }}
              softColor={palette.redSoft}
              accentColor={palette.coral}
            />
            <MetricCard
              title="Muted Apps"
              value={`${mutedCount}`}
              subtitle="Selected"
              icon={{ family: "material", name: "bell-off-outline" }}
              softColor={palette.graySoft}
              accentColor={palette.navy}
            />
          </View>
        </AppCard>
      </ScrollView>
    );
  }

  function renderRestScreen() {
    return (
      <>
        <ScrollView contentContainerStyle={styles.detailScrollContent}>
          <Header title="Rest Mode" onBack={goBack} />

          <LinearGradient
            colors={["#ffe78b", "#f8c58b", "#e8a09b"]}
            style={styles.restHeroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.restHeroCloudMain} />
            <View style={styles.restHeroCloudLeft} />
            <View style={styles.restHeroCloudRight} />
            <View style={styles.restHeroBubbleOne} />
            <View style={styles.restHeroBubbleTwo} />
            <View style={styles.restHeroBubbleThree} />
            <Text style={styles.restHeroTitle}>Unplug & Recharge</Text>
          </LinearGradient>

          <AppCard style={styles.restPanelCard}>
            <View style={styles.restPanelTitleRow}>
              <View style={styles.restPanelIconWrap}>
                <Ionicons name="time-outline" size={24} color={palette.coral} />
              </View>
              <Text style={styles.restPanelTitle}>Duration</Text>
            </View>

            <View style={styles.restDurationRow}>
              {[60, 120, 180].map((minutes) => {
                const active = restPreset === minutes;
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => setRestPreset(minutes as 60 | 120 | 180)}
                    style={[
                      styles.restDurationChip,
                      active && styles.restDurationChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.restDurationChipText,
                        active && styles.restDurationChipTextActive,
                      ]}
                    >
                      {formatTimeLabel(minutes)}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setRestPreset("custom")}
                style={[
                  styles.restDurationChip,
                  restPreset === "custom" && styles.restDurationChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.restDurationChipText,
                    restPreset === "custom" && styles.restDurationChipTextActive,
                  ]}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {restPreset === "custom" ? (
              <View style={styles.restCustomTimeWrap}>
                <Pressable
                  style={styles.restTimeStepButton}
                  onPress={() => setRestCustomMinutes((current) => Math.max(15, current - 5))}
                >
                  <Ionicons name="remove" size={18} color={palette.coral} />
                </Pressable>
                <TextInput
                  value={`${restCustomMinutes}`}
                  onChangeText={(value) => {
                    const digits = value.replace(/\D/g, "");
                    const next = digits ? Math.min(240, Math.max(15, Number(digits))) : 15;
                    setRestCustomMinutes(next);
                  }}
                  keyboardType="number-pad"
                  style={styles.restCustomTimeInput}
                />
                <Text style={styles.restCustomTimeSuffix}>minutes</Text>
                <Pressable
                  style={styles.restTimeStepButton}
                  onPress={() => setRestCustomMinutes((current) => Math.min(240, current + 5))}
                >
                  <Ionicons name="add" size={18} color={palette.coral} />
                </Pressable>
              </View>
            ) : null}
          </AppCard>

          <AppCard style={styles.restPanelCard}>
            <View style={styles.restPriorityHeaderRow}>
              <View style={styles.restPriorityHeaderLeft}>
                <View style={styles.restPriorityHeaderIcon}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#5f5cff" />
                </View>
                <View style={styles.restPriorityHeaderTextWrap}>
                  <Text style={styles.restPriorityHeaderTitle}>Priority Contacts</Text>
                  <Text style={styles.restPriorityHeaderSubtitle}>
                    These contacts can still reach you
                  </Text>
                </View>
              </View>
              <TogglePill
                value={restPriorityEnabled}
                onToggle={() => setRestPriorityEnabled((current) => !current)}
                activeColor="#f0606a"
              />
            </View>

            <View style={styles.restPriorityDivider} />

            <View style={!restPriorityEnabled ? styles.restDisabledSection : undefined}>
              <View style={styles.restPriorityList}>
                {restPriorityContacts.map((contact) => (
                  <View key={contact.id} style={styles.restPriorityRow}>
                    <View
                      style={[
                        styles.restPriorityAvatar,
                        { backgroundColor: getRestPriorityAvatarBackground(contact.id) },
                      ]}
                    >
                      <Text style={styles.restPriorityAvatarText}>{contact.emoji ?? "👤"}</Text>
                    </View>
                    <View style={styles.restPriorityTextWrap}>
                      <Text style={styles.restPriorityName}>{contact.name}</Text>
                      <Text style={styles.restPriorityPhone}>
                        {contact.phone ?? "No number"}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.restPriorityRemove}
                      onPress={() => removeRestPriorityContact(contact.id)}
                    >
                      <Ionicons name="close" size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <Pressable style={styles.restQuickAddRow} onPress={() => void openRestContactPicker()}>
                <Text style={styles.restQuickAddText}>
                  {restContactsLoading ? "Loading contacts..." : "Quick add"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#70819a" />
              </Pressable>

              <Pressable
                style={styles.restAddContactButton}
                onPress={() => void openRestContactPicker()}
              >
                <Feather name="edit-3" size={20} color="#5f5cff" />
                <Text style={styles.restAddContactText}>Add Contact</Text>
              </Pressable>
            </View>
          </AppCard>

          <AppCard style={styles.restRepeatCard}>
            <View style={styles.restRepeatLeft}>
              <View style={styles.restRepeatIconWrap}>
                <Ionicons name="call-outline" size={20} color={palette.coral} />
              </View>
              <View style={styles.restRepeatTextWrap}>
                <Text style={styles.restRepeatTitle}>Repeat Callers</Text>
                <Text style={styles.restRepeatSubtitle} numberOfLines={1}>
                  Alert after {restMissedCalls} missed calls
                </Text>
              </View>
            </View>
            <View style={styles.restCounterWrap}>
              <Pressable
                style={styles.restCounterButton}
                onPress={() => setRestMissedCalls((current) => Math.max(1, current - 1))}
              >
                <Ionicons name="remove" size={18} color={palette.text} />
              </Pressable>
              <Text style={styles.restCounterValue}>{restMissedCalls}</Text>
              <Pressable
                style={styles.restCounterButton}
                onPress={() => setRestMissedCalls((current) => Math.min(9, current + 1))}
              >
                <Ionicons name="add" size={18} color={palette.text} />
              </Pressable>
            </View>
          </AppCard>

          {restIsActive ? (
            <View style={styles.restActiveSummary}>
              <Text style={styles.restActiveSummaryText}>
                Active now • ends at {formatClockLabel(restSession!.endsAt)}
              </Text>
              <Text style={styles.restActiveSummaryTextMuted}>
                {formatCountdown(restRemainingSeconds)} left
              </Text>
            </View>
          ) : null}

          <GradientButton
            label={restIsActive ? "Stop Rest Mode" : "Start Rest Mode"}
            colors={["#f56b7f", "#f25f70"]}
            onPress={restIsActive ? () => handleStopRest(true) : handleStartRest}
          />

          <View
            style={[
              styles.restStatusBadge,
              restCallScreeningReady ? styles.restStatusBadgeOk : styles.restStatusBadgeWarn,
            ]}
          >
            <Ionicons
              name={restCallScreeningReady ? "checkmark-circle" : "alert-circle"}
              size={18}
              color={restCallScreeningReady ? "#198754" : palette.coral}
            />
            <Text
              style={[
                styles.restStatusBadgeText,
                restCallScreeningReady
                  ? styles.restStatusBadgeTextOk
                  : styles.restStatusBadgeTextWarn,
              ]}
            >
              {restCallScreeningReady
                ? "Call screening connected"
                : "Call screening not connected"}
            </Text>
          </View>

          <Pressable style={styles.restAccessLink} onPress={openCallScreeningSettings}>
            <Text style={styles.restAccessLinkText}>Open Call Screening Access</Text>
          </Pressable>

          <Pressable style={styles.restAccessLink} onPress={openDndSettings}>
            <Text style={styles.restAccessLinkText}>Open Android DND Access</Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={restContactPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRestContactPickerVisible(false)}
        >
          <View style={styles.restContactModalBackdrop}>
            <View style={styles.restContactModalSheet}>
              <View style={styles.sectionRow}>
                <Text style={styles.headerTitle}>Select Contact</Text>
                <Pressable onPress={() => setRestContactPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={palette.text} />
                </Pressable>
              </View>
              <Text style={styles.helpText}>
                Pick a contact from your phone to allow calls during Rest Mode.
              </Text>
              <ScrollView style={styles.restContactModalList}>
                {restAvailableContacts.length ? (
                  restAvailableContacts.map((contact) => {
                    const alreadySelected = restPriorityContacts.some(
                      (item) => normalizePhone(item.phone) === normalizePhone(contact.phone),
                    );
                    return (
                      <Pressable
                        key={contact.id}
                        style={[
                          styles.restContactOption,
                          alreadySelected && styles.restContactOptionSelected,
                        ]}
                        onPress={() => addRestPriorityContact(contact)}
                      >
                        <View style={styles.restContactOptionAvatar}>
                          <Text style={styles.restPriorityAvatarText}>{contact.emoji ?? "+"}</Text>
                        </View>
                        <View style={styles.restPriorityTextWrap}>
                          <Text style={styles.restPriorityName}>{contact.name}</Text>
                          <Text style={styles.restPriorityPhone}>{contact.phone}</Text>
                        </View>
                        {alreadySelected ? (
                          <Text style={styles.restContactSelectedLabel}>Added</Text>
                        ) : (
                          <Ionicons name="add-circle-outline" size={22} color={palette.indigo} />
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No contacts found</Text>
                    <Text style={styles.emptyText}>
                      Save phone numbers on the device and try again.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  function renderTodoScreen() {
    const today = formatLocalDateInput(new Date());
    const visibleTodos = sortTodoTasks(
      todos.filter(
        (todo) =>
          todo.date === todoSelectedDate &&
          todo.title.toLowerCase().includes(todoSearch.trim().toLowerCase()),
      ),
    );
    const dateOptions = buildTodoDateOptions(7);
    const completedCount = visibleTodos.filter((todo) => todo.done).length;
    const sectionTitle =
      todoSelectedDate === today
        ? "Today's tasks"
        : `${formatReminderDateLabel(todoSelectedDate)} tasks`;

    return (
      <>
        <ScrollView contentContainerStyle={styles.todoPlannerContent} showsVerticalScrollIndicator={false}>
          <Header title="Task Planner" onBack={goBack} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.todoDateStrip}
          >
            {dateOptions.map((option) => {
              const active = option.value === todoSelectedDate;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setTodoSelectedDate(option.value);
                    setTodoDraftDate(option.value);
                  }}
                  style={[styles.todoDateChip, active && styles.todoDateChipActive]}
                >
                  <Text style={[styles.todoDateNumber, active && styles.todoDateNumberActive]}>
                    {option.dayNumber}
                  </Text>
                  <Text style={[styles.todoDateWeekday, active && styles.todoDateWeekdayActive]}>
                    {option.weekday}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <SearchBar
            value={todoSearch}
            onChangeText={setTodoSearch}
            placeholder="Search"
            containerStyle={styles.todoSearchBar}
          />

          {renderReminderPopupWarningCard()}

          <View style={styles.todoSectionHeader}>
            <View>
              <Text style={styles.todoSectionTitle}>{sectionTitle}</Text>
              <Text style={styles.todoSectionCaption}>
                {completedCount}/{visibleTodos.length || 0} completed
              </Text>
            </View>
            <View style={styles.todoSectionBadge}>
              <Ionicons name="notifications-outline" size={16} color="#8d7328" />
              <Text style={styles.todoSectionBadgeText}>Timed</Text>
            </View>
          </View>

          <View style={styles.todoTaskStack}>
            {visibleTodos.length ? (
              visibleTodos.map((todo) => (
                <View key={todo.id} style={styles.todoTimelineCard}>
                  <Pressable
                    onPress={() => void toggleTodoTask(todo.id)}
                    style={[
                      styles.todoTimelineCheck,
                      todo.done && styles.todoTimelineCheckDone,
                    ]}
                  >
                    {todo.done ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : null}
                  </Pressable>

                  <Pressable
                    style={styles.todoTimelineContent}
                    onPress={() => openTodoEditor(todo)}
                  >
                    <Text style={styles.todoTimelineTime}>{formatReminderTimeLabel(todo.time)}</Text>
                    <Text style={[styles.todoTimelineTitle, todo.done && styles.todoTimelineTitleDone]}>
                      {todo.title}
                    </Text>
                    {todo.details ? (
                      <Text
                        style={[
                          styles.todoTimelineDetails,
                          todo.done && styles.todoTimelineDetailsDone,
                        ]}
                      >
                        {todo.details}
                      </Text>
                    ) : null}
                  </Pressable>

                  <View style={styles.todoTimelineActions}>
                    <Ionicons
                      name={todo.notificationId ? "notifications" : "notifications-outline"}
                      size={18}
                      color={todo.notificationId ? "#d7ab24" : "#c7b27c"}
                    />
                    <Pressable
                      onPress={() => void handleDeleteTodo(todo)}
                      style={styles.todoTimelineDelete}
                    >
                      <Ionicons name="trash-outline" size={20} color="#d7ab24" />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.todoEmptyState}>
                <Text style={styles.todoEmptyTitle}>No tasks for this day</Text>
                <Text style={styles.todoEmptyText}>
                  Tap the plus button to add a dated reminder task.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <Pressable style={styles.todoFloatingButton} onPress={() => openTodoComposer()}>
          <Ionicons name="add" size={34} color="#fff" />
        </Pressable>

        <Modal
          transparent
          visible={todoComposerVisible}
          animationType="slide"
          onRequestClose={() => setTodoComposerVisible(false)}
        >
          <View style={styles.todoModalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setTodoComposerVisible(false)}
            />
            <View style={styles.todoModalSheet}>
              <Text style={styles.todoModalTitle}>
                {todoEditingTaskId ? "Edit Task" : "Add New Task"}
              </Text>
              <Text style={styles.todoModalHint}>
                Choose a date and time. The app will show a reminder notification at that moment.
              </Text>

              <TextInput
                value={todoDraftTitle}
                onChangeText={setTodoDraftTitle}
                placeholder="Task title"
                placeholderTextColor="#a48f69"
                style={styles.todoModalInput}
              />

              <Text style={styles.todoModalLabel}>Details</Text>
              <TextInput
                value={todoDraftDetails}
                onChangeText={setTodoDraftDetails}
                placeholder="Add more task details"
                placeholderTextColor="#a48f69"
                style={[styles.todoModalInput, styles.todoModalTextArea]}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.todoModalLabel}>Pick a day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.todoComposerDateStrip}
              >
                {dateOptions.map((option) => {
                  const active = option.value === todoDraftDate;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setTodoDraftDate(option.value)}
                      style={[
                        styles.todoComposerDateChip,
                        active && styles.todoComposerDateChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.todoComposerDateNumber,
                          active && styles.todoComposerDateNumberActive,
                        ]}
                      >
                        {option.dayNumber}
                      </Text>
                      <Text
                        style={[
                          styles.todoComposerDateWeekday,
                          active && styles.todoComposerDateWeekdayActive,
                        ]}
                      >
                        {option.weekday}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.todoModalLabel}>Date</Text>
              <TextInput
                value={todoDraftDate}
                onChangeText={setTodoDraftDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#a48f69"
                style={styles.todoModalInput}
              />

              <Text style={styles.todoModalLabel}>Time</Text>
              <Pressable style={styles.todoModalPicker} onPress={openTodoTimePicker}>
                <Text style={styles.todoModalPickerLabel}>Choose time</Text>
                <Text style={styles.todoModalPickerValue}>
                  {formatReminderTimeLabel(todoDraftTime)}
                </Text>
              </Pressable>

              <View style={styles.todoModalActions}>
                <Pressable
                  style={styles.todoModalGhostButton}
                  onPress={closeTodoComposer}
                >
                  <Text style={styles.todoModalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.todoModalPrimaryButton} onPress={() => void handleSaveTodoTask()}>
                  <Ionicons name="notifications-outline" size={18} color="#fffdf5" />
                  <Text style={styles.todoModalPrimaryText}>
                    {todoEditingTaskId ? "Update Task" : "Save Task"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={todoTimePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTodoTimePickerVisible(false)}
        >
          <View style={styles.restContactModalBackdrop}>
            <View style={styles.reminderPickerSheet}>
              <View style={styles.sectionRow}>
                <Text style={styles.headerTitle}>Pick Task Time</Text>
                <Pressable onPress={() => setTodoTimePickerVisible(false)}>
                  <Ionicons name="close" size={24} color={palette.text} />
                </Pressable>
              </View>
              <Text style={styles.helpText}>Select a ready-made time instead of typing manually.</Text>

              <View style={styles.reminderTimeSummary}>
                <Text style={styles.reminderTimeSummaryText}>
                  {formatReminderTimeLabel(buildReminderTime(
                    todoPickerHour,
                    todoPickerMinute,
                    todoPickerPeriod,
                  ))}
                </Text>
              </View>

              <Text style={styles.reminderPickerLabel}>Hour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderTimeRow}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <Pressable
                    key={hour}
                    style={[
                      styles.reminderTimeChip,
                      todoPickerHour === hour && styles.reminderTimeChipActive,
                    ]}
                    onPress={() => setTodoPickerHour(hour)}
                  >
                    <Text
                      style={[
                        styles.reminderTimeChipText,
                        todoPickerHour === hour && styles.reminderTimeChipTextActive,
                      ]}
                    >
                      {String(hour).padStart(2, "0")}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.reminderPickerLabel}>Minute</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderTimeRow}>
                {Array.from({ length: 12 }, (_, index) => index * 5).map((minute) => (
                  <Pressable
                    key={minute}
                    style={[
                      styles.reminderTimeChip,
                      todoPickerMinute === minute && styles.reminderTimeChipActive,
                    ]}
                    onPress={() => setTodoPickerMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.reminderTimeChipText,
                        todoPickerMinute === minute && styles.reminderTimeChipTextActive,
                      ]}
                    >
                      {String(minute).padStart(2, "0")}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.reminderPickerLabel}>Period</Text>
              <View style={styles.reminderPeriodRow}>
                {(["AM", "PM"] as const).map((period) => (
                  <Pressable
                    key={period}
                    style={[
                      styles.reminderPeriodChip,
                      todoPickerPeriod === period && styles.reminderPeriodChipActive,
                    ]}
                    onPress={() => setTodoPickerPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.reminderPeriodText,
                        todoPickerPeriod === period && styles.reminderPeriodTextActive,
                      ]}
                    >
                      {period}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <GradientButton
                label="Use This Time"
                colors={["#f9a23f", "#ff6f3c"]}
                onPress={applyTodoTimePicker}
                small
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  function renderVoiceRecorderScreen() {
    const selectedLineNumber = getVoiceEffectiveLineNumber(voiceSimCards, voiceSelectedSimId);
    const selectedLineTitle = getVoiceEffectiveLineLabel(voiceSimCards, voiceSelectedSimId);
    const selectedSim = getVoiceSelectedSim(voiceSimCards, voiceSelectedSimId);
    const latestVoiceRecording = voiceRecordedCalls[0] ?? null;
    const isMicFallbackWarning = latestVoiceRecording?.sourceLabel === "mic";

    return (
      <>
        <ScrollView contentContainerStyle={styles.detailScrollContent}>
          <Header title="Voice Recorder" onBack={goBack} />

          <LinearGradient
            colors={["#f0e8ff", "#eef4ff", "#fff3e6"]}
            style={styles.voiceHeroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.voiceHeroBadge}>
              <Ionicons name="mic-outline" size={20} color="#ffffff" />
            </View>
            <Text style={styles.voiceHeroTitle}>Auto Call Recording</Text>
            <Text style={styles.voiceHeroSubtitle}>
              Choose the phone line you use for office calls, then let matching calls prepare the
              recorder automatically.
            </Text>
          </LinearGradient>

          <AppCard style={styles.voicePanelCard}>
            <View style={styles.voicePanelHeader}>
              <View>
                <Text style={styles.subSectionTitle}>Recording Engine</Text>
                <Text style={styles.settingSubtitle}>
                  Personal and office lines can have different auto-start behavior.
                </Text>
              </View>
              <TogglePill
                value={voiceRecorderEnabled}
                onToggle={() => void handleVoiceRecorderToggle(!voiceRecorderEnabled)}
                activeColor="#7c3aed"
              />
            </View>

            <View style={styles.voiceStatusRow}>
              <View
                style={[
                  styles.voiceStatusBadge,
                  voiceMicPermissionReady
                    ? styles.voiceStatusBadgeReady
                    : styles.voiceStatusBadgeWarn,
                ]}
              >
                <Text
                  style={[
                    styles.voiceStatusBadgeText,
                    voiceMicPermissionReady
                      ? styles.voiceStatusBadgeTextReady
                      : styles.voiceStatusBadgeTextWarn,
                  ]}
                >
                  {voiceMicPermissionReady ? "Mic Ready" : "Mic Access"}
                </Text>
              </View>
              <View
                style={[
                  styles.voiceStatusBadge,
                  voiceCallAccessReady
                    ? styles.voiceStatusBadgeReady
                    : styles.voiceStatusBadgeWarn,
                ]}
              >
                <Text
                  style={[
                    styles.voiceStatusBadgeText,
                    voiceCallAccessReady
                      ? styles.voiceStatusBadgeTextReady
                      : styles.voiceStatusBadgeTextWarn,
                  ]}
                >
                  {voiceCallAccessReady ? "Call Access Ready" : "Call Access"}
                </Text>
              </View>
              <View
                style={[
                  styles.voiceStatusBadge,
                  voiceAutoStart ? styles.voiceStatusBadgeReady : styles.voiceStatusBadgeNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.voiceStatusBadgeText,
                    voiceAutoStart
                      ? styles.voiceStatusBadgeTextReady
                      : styles.voiceStatusBadgeTextNeutral,
                  ]}
                >
                  {voiceAutoStart ? "Auto Start On" : "Auto Start Off"}
                </Text>
              </View>
              <View
                style={[
                  styles.voiceStatusBadge,
                  voiceSpeakerAssist
                    ? styles.voiceStatusBadgeReady
                    : styles.voiceStatusBadgeNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.voiceStatusBadgeText,
                    voiceSpeakerAssist
                      ? styles.voiceStatusBadgeTextReady
                      : styles.voiceStatusBadgeTextNeutral,
                  ]}
                >
                  {voiceSpeakerAssist ? "Speaker Assist On" : "Speaker Assist Off"}
                </Text>
              </View>
            </View>

            <Text style={styles.voiceStatusText}>{voiceStatus}</Text>
            <View style={styles.voiceHelperRow}>
              <View style={styles.voiceHelperCopy}>
                <Text style={styles.voiceHelperTitle}>Speaker Assist</Text>
                <Text style={styles.voiceHelperText}>
                  Uses speaker-call routing during auto-recording so mic-based capture can pick up
                  more call audio on restricted phones.
                </Text>
              </View>
              <TogglePill
                value={voiceSpeakerAssist}
                onToggle={() => setVoiceSpeakerAssist((current) => !current)}
                activeColor="#7c3aed"
              />
            </View>
            {isMicFallbackWarning ? (
              <View style={styles.voiceWarningCard}>
                <Ionicons name="warning-outline" size={18} color="#c76a00" />
                <View style={styles.voiceWarningCopy}>
                  <Text style={styles.voiceWarningTitle}>Mic Fallback Detected</Text>
                  <Text style={styles.voiceWarningText}>
                    This phone is still recording through the microphone only. Keep speaker assist
                    on and raise call volume if the other side sounds weak or silent.
                  </Text>
                </View>
              </View>
            ) : null}
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <View style={styles.voicePanelHeader}>
              <View>
                <Text style={styles.subSectionTitle}>Detected SIM Cards</Text>
                <Text style={styles.settingSubtitle}>
                  Select the SIM on which automatic call recording should start.
                </Text>
              </View>
              <Pressable style={styles.voiceSecondaryActionButton} onPress={() => void refreshVoiceSimCards()}>
                <Ionicons name="refresh-outline" size={18} color="#5b556b" />
                <Text style={styles.voiceSecondaryActionButtonText}>
                  {voiceSimLoading ? "Checking..." : "Fetch SIMs"}
                </Text>
              </Pressable>
            </View>

            {voiceSimCards.length ? (
              <View style={styles.voiceSimList}>
                {voiceSimCards.map((sim) => {
                  const active = voiceSelectedSimId === sim.id;
                  return (
                    <Pressable
                      key={sim.id}
                      style={[styles.voiceSimCard, active && styles.voiceSimCardActive]}
                      onPress={() => setVoiceSelectedSimId(sim.id)}
                    >
                      <View style={styles.voiceSimCardTop}>
                        <Text style={[styles.voiceSimName, active && styles.voiceSimNameActive]}>
                          {sim.displayName || sim.carrierName || `SIM ${sim.slotIndex + 1}`}
                        </Text>
                        <Text style={[styles.voiceSimSlot, active && styles.voiceSimSlotActive]}>
                          SIM {sim.slotIndex + 1}
                        </Text>
                      </View>
                      <Text style={[styles.voiceSimCarrier, active && styles.voiceSimCarrierActive]}>
                        {sim.carrierName || "Carrier unavailable"}
                      </Text>
                      <Text style={[styles.voiceSimNumber, active && styles.voiceSimNumberActive]}>
                        {sim.number?.trim() ? sim.number : "Number not exposed by Android"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.voiceEmptyText}>
                {voiceSimLoading
                  ? "Reading SIM details..."
                  : "No SIM details found yet. Tap Fetch SIMs. Some phones may hide the number even when the SIM is active."}
              </Text>
            )}
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <View style={styles.voicePanelHeader}>
              <View>
                <Text style={styles.subSectionTitle}>Auto-Start Scope</Text>
                <Text style={styles.settingSubtitle}>
                  Decide whether the selected line records all calls or only chosen callers.
                </Text>
              </View>
              <TogglePill
                value={voiceAutoStart}
                onToggle={() => setVoiceAutoStart((current) => !current)}
                activeColor="#7c3aed"
              />
            </View>

            <View style={styles.voiceScopeRow}>
              <Chip
                label="Selected callers"
                active={voiceRecordScope === "selected"}
                activeColor="#7c3aed"
                onPress={() => setVoiceRecordScope("selected")}
              />
              <Chip
                label="All calls on line"
                active={voiceRecordScope === "all"}
                activeColor="#7c3aed"
                onPress={() => setVoiceRecordScope("all")}
              />
            </View>

            <Text style={styles.voiceScopeHint}>
              Current line: {selectedLineTitle}
              {selectedLineNumber
                ? ` • ${selectedLineNumber}`
                : selectedSim
                  ? " • SIM number hidden by Android"
                  : " • Select a detected SIM"}
            </Text>
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <View style={styles.voicePanelHeader}>
              <View>
                <Text style={styles.subSectionTitle}>Auto-Record Callers</Text>
                <Text style={styles.settingSubtitle}>
                  Pick office contacts if only some callers should trigger recording automatically.
                </Text>
              </View>
              <Pressable style={styles.voiceActionButton} onPress={() => void openVoiceContactPicker()}>
                <Ionicons name="person-add-outline" size={18} color="#ffffff" />
                <Text style={styles.voiceActionButtonText}>
                  {voiceContactsLoading ? "Loading..." : "Add Contact"}
                </Text>
              </Pressable>
            </View>

            {voiceRecordScope === "all" ? (
              <View style={styles.voiceNoteBox}>
                <Ionicons name="radio-outline" size={18} color="#7c3aed" />
                <Text style={styles.voiceNoteText}>
                  Every incoming or outgoing call on the selected line is eligible for auto-start.
                </Text>
              </View>
            ) : voiceContacts.length ? (
              <View style={styles.voiceContactsList}>
                {voiceContacts.map((contact) => (
                  <View key={contact.id} style={styles.voiceContactRow}>
                    <View style={styles.voiceContactAvatar}>
                      <Text style={styles.voiceContactAvatarText}>
                        {(contact.name || "C").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.voiceContactMeta}>
                      <Text style={styles.voiceContactName}>{contact.name}</Text>
                      <Text style={styles.voiceContactPhone}>{contact.phone || "No number"}</Text>
                    </View>
                    <Pressable onPress={() => removeVoiceContact(contact.id)}>
                      <Ionicons name="close-circle" size={22} color="#9a98a3" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.voiceEmptyText}>
                Add the office or client numbers you want to auto-record on this line.
              </Text>
            )}
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <View style={styles.voicePanelHeader}>
              <View>
                <Text style={styles.subSectionTitle}>Recorded Call History</Text>
                <Text style={styles.settingSubtitle}>
                  Only real saved recordings from the selected detected SIM appear here.
                </Text>
              </View>
              <Pressable
                style={styles.voiceSecondaryActionButton}
                onPress={() => void refreshVoiceRecorderHistory()}
              >
                <Ionicons name="time-outline" size={18} color="#5b556b" />
                <Text style={styles.voiceSecondaryActionButtonText}>Refresh</Text>
              </Pressable>
            </View>

            {voiceRecordedCalls.length ? (
              <View style={styles.voiceHistoryList}>
                {voiceRecordedCalls.map((entry) => (
                  <View key={entry.id} style={styles.voiceHistoryRow}>
                    <Pressable
                      style={styles.voiceHistoryMain}
                      onPress={() => void handleOpenVoiceRecording(entry)}
                    >
                      <View style={styles.voiceHistoryBadge}>
                        <Ionicons name="play-outline" size={18} color="#7c3aed" />
                      </View>
                      <View style={styles.voiceHistoryMeta}>
                        <Text style={styles.voiceHistoryCaller}>{entry.callerNumber}</Text>
                        <Text style={styles.voiceHistoryLine}>
                          {entry.lineLabel}
                          {entry.lineNumber ? ` • ${entry.lineNumber}` : ""}
                        </Text>
                        <Text style={styles.voiceHistoryMetaLine}>
                          {formatVoiceRecordingDuration(entry.durationMs)}
                          {entry.size ? ` • ${formatAttachmentSize(entry.size)}` : ""}
                          {entry.sourceLabel ? ` • ${entry.sourceLabel}` : ""}
                        </Text>
                        <Text style={styles.voiceHistoryDate}>
                          {formatDateStamp(entry.timestamp)}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.voiceHistoryActions}>
                      <Pressable
                        style={styles.voiceHistoryActionButton}
                        onPress={() => void handleShareVoiceRecording(entry)}
                      >
                        <Ionicons name="share-social-outline" size={16} color="#5a5469" />
                      </Pressable>
                      <Pressable
                        style={[styles.voiceHistoryActionButton, styles.voiceHistoryActionDelete]}
                        onPress={() => handleDeleteVoiceRecording(entry)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#d65266" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.voiceEmptyText}>
                No recorded-call history yet. When a call matches the selected SIM and rule, it
                will appear here.
              </Text>
            )}
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <Text style={styles.subSectionTitle}>Diagnostics</Text>
            <Text style={styles.settingSubtitle}>
              Android can restrict call audio capture on some phones. Use this setup to manage the
              auto-start rules and required access.
            </Text>

            <View style={styles.voiceDiagnosticsRow}>
              <Pressable
                style={styles.voiceSecondaryButton}
                onPress={() => void refreshVoiceRecorderAccess()}
              >
                <Text style={styles.voiceSecondaryButtonText}>Check Access</Text>
              </Pressable>
              <Pressable
                style={styles.voiceSecondaryButton}
                onPress={() => void ensureVoiceRecorderSetup()}
              >
                <Text style={styles.voiceSecondaryButtonText}>Request Access</Text>
              </Pressable>
              <Pressable style={styles.voicePrimaryButton} onPress={handleVoiceRecorderTest}>
                <Text style={styles.voicePrimaryButtonText}>Test Auto Start</Text>
              </Pressable>
            </View>
          </AppCard>

          <AppCard style={styles.voicePanelCard}>
            <Text style={styles.subSectionTitle}>Recent Activity</Text>
            <Text style={styles.settingSubtitle}>
              This feed shows whether a call matched the current line and auto-start rule.
            </Text>

            {voiceLogs.length ? (
              <View style={styles.voiceLogList}>
                {voiceLogs.map((entry) => (
                  <View key={entry.id} style={styles.voiceLogRow}>
                    <View
                      style={[
                        styles.voiceLogDot,
                        entry.type === "match"
                          ? styles.voiceLogDotMatch
                          : entry.type === "skip"
                            ? styles.voiceLogDotSkip
                            : styles.voiceLogDotInfo,
                      ]}
                    />
                    <View style={styles.voiceLogTextWrap}>
                      <Text style={styles.voiceLogText}>{entry.text}</Text>
                      <Text style={styles.voiceLogDate}>{formatDateStamp(entry.timestamp)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.voiceEmptyText}>
                Turn on Voice Recorder and run a test to populate the activity feed.
              </Text>
            )}
          </AppCard>
        </ScrollView>

        <Modal
          visible={voiceContactPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setVoiceContactPickerVisible(false)}
        >
          <View style={styles.restContactModalBackdrop}>
            <View style={styles.restContactModalSheet}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Pick Caller</Text>
                <Pressable onPress={() => setVoiceContactPickerVisible(false)}>
                  <Ionicons name="close" size={26} color={palette.text} />
                </Pressable>
              </View>
              <Text style={styles.settingSubtitle}>
                Choose the callers that should trigger automatic recording on the selected line.
              </Text>
              <ScrollView style={styles.restContactModalList}>
                {voiceAvailableContacts.length ? (
                  voiceAvailableContacts.map((contact) => {
                    const alreadySelected = voiceContacts.some(
                      (item) => normalizePhone(item.phone) === normalizePhone(contact.phone),
                    );
                    return (
                      <Pressable
                        key={`${contact.id}-${contact.phone}`}
                        style={[
                          styles.restContactOption,
                          alreadySelected && styles.restContactOptionSelected,
                        ]}
                        onPress={() => addVoiceContact(contact)}
                      >
                        <View style={styles.restContactOptionAvatar}>
                          <Text style={styles.restPriorityAvatarText}>{contact.name.slice(0, 1)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{contact.name}</Text>
                          <Text style={styles.restPriorityPhone}>{contact.phone}</Text>
                        </View>
                        {alreadySelected ? (
                          <Text style={styles.restContactSelectedLabel}>Added</Text>
                        ) : null}
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>Save phone numbers on the device and try again.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  function renderOfficeScreen() {
    return (
      <>
        <ScrollView contentContainerStyle={[styles.detailScrollContent, styles.officeScreenContent]}>
        <Header title="Office Mode" onBack={goBack} />

        <AppCard style={styles.officeLocationCard}>
          <View style={styles.officeHeaderRow}>
            <View style={styles.officeHeaderLeft}>
              <View style={[styles.officeHeaderIconWrap, { backgroundColor: "#dce9ff" }]}>
                <Ionicons name="location-outline" size={28} color="#2b68ff" />
              </View>
              <View style={styles.officeHeaderTextWrap}>
                <Text style={styles.officeHeaderTitle}>Office Location</Text>
                <Text style={styles.officeHeaderSubtitle}>{officeLocationLabel}</Text>
              </View>
            </View>

            <Pressable style={styles.officeGhostButton} onPress={() => void handleSetOfficeLocation()}>
              <Feather name="edit-3" size={16} color="#2b68ff" />
              <Text style={styles.officeGhostButtonText}>Edit</Text>
            </Pressable>
          </View>

          <Pressable style={styles.officeLocationHint} onPress={() => void handleSetOfficeLocation()}>
            <Ionicons name="alert-circle-outline" size={18} color="#ff9a14" />
            <Text style={styles.officeLocationHintText}>
              Use <Text style={styles.officeLocationHintStrong}>"Use Current Location"</Text> to enable GPS
              auto-detection on arrival.
            </Text>
          </Pressable>

          <TextInput
            value={officeLocationDraft}
            onChangeText={setOfficeLocationDraft}
            placeholder="Type office address manually"
            placeholderTextColor="#95a3b7"
            style={styles.officeLocationInput}
          />

          <View style={styles.officeLocationActionRow}>
            <Pressable style={styles.officeSecondaryButton} onPress={() => void handleSetOfficeLocation()}>
              <Ionicons name="navigate-outline" size={16} color="#2b68ff" />
              <Text style={styles.officeSecondaryButtonText}>Use Current Location</Text>
            </Pressable>
            <Pressable style={styles.officeSecondaryButton} onPress={() => void handleCheckOfficeStatus()}>
              <Ionicons name="scan-outline" size={16} color="#2b68ff" />
              <Text style={styles.officeSecondaryButtonText}>Check Status</Text>
            </Pressable>
            <Pressable style={styles.officePrimaryButton} onPress={saveOfficeLocationLabel}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.officePrimaryButtonText}>Save Typed Location</Text>
            </Pressable>
          </View>

          <Text style={styles.officeRecipientsEmpty}>
            {officeInsideZone ? "Inside office zone" : "Outside office zone"} • {locationStatus}
          </Text>
        </AppCard>

        <AppCard style={styles.officeAutoCard}>
          <View style={styles.officeHeaderRow}>
            <View style={styles.officeHeaderLeft}>
              <View style={[styles.officeHeaderIconWrap, { backgroundColor: "#eee7ff" }]}>
                <Feather name="message-square" size={24} color="#6a39ff" />
              </View>
              <View style={styles.officeHeaderTextWrap}>
                <Text style={styles.officeHeaderTitle}>Auto-Messages</Text>
                <Text style={styles.officeHeaderSubtitle}>Send SMS on arrival & departure</Text>
              </View>
            </View>

            <TogglePill
              value={officeAutoMessage}
              onToggle={() => setOfficeAutoMessage((current) => !current)}
              activeColor={palette.coral}
            />
          </View>

          <View style={styles.officeSectionDivider} />

          <View style={!officeAutoMessage ? styles.restDisabledSection : undefined}>
            <View style={styles.officeAutoRow}>
              <View style={styles.officeAutoRowLabelWrap}>
                <Ionicons name="log-in-outline" size={22} color="#10b981" />
                <Text style={styles.officeAutoRowLabel}>On Arrival</Text>
              </View>
              <TogglePill
                value={officeArrivalEnabled}
                onToggle={() => setOfficeArrivalEnabled((current) => !current)}
                activeColor="#10c58a"
              />
            </View>

            <View style={[styles.officeMessagePanel, styles.officeMessagePanelArrival]}>
              <View style={styles.officeMessagePanelTopRow}>
                <Pressable
                  style={styles.officePresetSelector}
                  onPress={() => cycleOfficeMessagePreset("arrival")}
                >
                  <Text style={styles.officePresetSelectorText}>Presets</Text>
                  <Ionicons name="chevron-down" size={15} color="#6c84a3" />
                </Pressable>
                <Pressable style={styles.officeCustomChip}>
                  <Feather name="edit-3" size={14} color="#ff8a5a" />
                  <Text style={styles.officeCustomChipText}>Custom</Text>
                </Pressable>
              </View>
              <View style={styles.officeMessageBubble}>
                <Text style={[styles.officeMessageBubbleText, { color: "#11755f" }]}>
                  "{officeArrivalMessage}"
                </Text>
              </View>
            </View>

            <View style={styles.officeAutoRow}>
              <View style={styles.officeAutoRowLabelWrap}>
                <Ionicons name="log-out-outline" size={22} color="#ff2b63" />
                <Text style={styles.officeAutoRowLabel}>On Departure</Text>
              </View>
              <TogglePill
                value={officeDepartureEnabled}
                onToggle={() => setOfficeDepartureEnabled((current) => !current)}
                activeColor="#ff2b63"
              />
            </View>

            <View style={[styles.officeMessagePanel, styles.officeMessagePanelDeparture]}>
              <View style={styles.officeMessagePanelTopRow}>
                <Pressable
                  style={styles.officePresetSelector}
                  onPress={() => cycleOfficeMessagePreset("departure")}
                >
                  <Text style={styles.officePresetSelectorText}>Presets</Text>
                  <Ionicons name="chevron-down" size={15} color="#6c84a3" />
                </Pressable>
                <Pressable style={styles.officeCustomChip}>
                  <Feather name="edit-3" size={14} color="#ff8a5a" />
                  <Text style={styles.officeCustomChipText}>Custom</Text>
                </Pressable>
              </View>
              <View style={styles.officeMessageBubble}>
                <Text style={[styles.officeMessageBubbleText, { color: "#ea335d" }]}>
                  "{officeDepartureMessage}"
                </Text>
              </View>
            </View>

            <View style={styles.officeRecipientsWrap}>
              <View style={styles.officeRecipientsHeader}>
                <Text style={styles.officeRecipientsTitle}>Auto-message Recipients</Text>
                <Pressable
                  style={styles.officeGhostButton}
                  onPress={() => void openOfficeContactPicker("sms")}
                >
                  <Ionicons name="add" size={16} color="#2b68ff" />
                  <Text style={styles.officeGhostButtonText}>
                    {officeContactsLoading ? "Loading..." : "Add Number"}
                  </Text>
                </Pressable>
              </View>

              {officeMessageRecipients.length ? (
                <View style={styles.restPriorityList}>
                  {officeMessageRecipients.map((contact) => (
                    <View key={contact.id} style={styles.officeRecipientRow}>
                      <View
                        style={[
                          styles.restPriorityAvatar,
                          { backgroundColor: getOfficeAvatarBackground(contact.id) },
                        ]}
                      >
                        <Text style={styles.restPriorityAvatarText}>
                          {contact.emoji ?? buildRestAvatar(contact.name)}
                        </Text>
                      </View>
                      <View style={styles.restPriorityTextWrap}>
                        <Text style={styles.officePriorityContactName}>{contact.name}</Text>
                        <Text style={styles.officeRecipientsPhone}>{contact.phone}</Text>
                      </View>
                      <Pressable
                        style={styles.restPriorityRemove}
                        onPress={() => removeOfficeMessageRecipient(contact.id)}
                      >
                        <Ionicons name="close" size={20} color="#8b98ad" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.officeRecipientsEmpty}>
                  Add phone numbers to send the arrival and departure SMS.
                </Text>
              )}

              <View style={styles.officeRecipientsActions}>
                <Pressable
                  style={styles.officeSecondaryButton}
                  onPress={() => void testOfficeAutoMessage("arrival")}
                >
                  <Ionicons name="send-outline" size={16} color="#2b68ff" />
                  <Text style={styles.officeSecondaryButtonText}>Test Arrival SMS</Text>
                </Pressable>
                <Pressable
                  style={[styles.officeSecondaryButton, styles.officeDepartureTestButton]}
                  onPress={() => void testOfficeAutoMessage("departure")}
                >
                  <Ionicons name="paper-plane-outline" size={16} color="#ea335d" />
                  <Text style={styles.officeDepartureTestButtonText}>Test Departure SMS</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.officePriorityCard}>
          <View style={styles.officeHeaderRow}>
            <View style={styles.officeHeaderLeft}>
              <View style={[styles.officeHeaderIconWrap, { backgroundColor: "#dce5ff" }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#5a44ff" />
              </View>
              <View style={styles.officeHeaderTextWrap}>
                <Text style={styles.officeHeaderTitle}>Priority Contacts</Text>
                <Text style={styles.officeHeaderSubtitle}>These people can always reach you</Text>
              </View>
            </View>
          </View>

          <View style={styles.officePriorityControls}>
            <View style={styles.officePriorityControlRow}>
              <View style={styles.officePriorityControlLeft}>
                <Ionicons name="call-outline" size={20} color="#5a44ff" />
                <Text style={styles.officePriorityControlLabel}>Allow priority calls</Text>
              </View>
              <TogglePill
                value={officePriorityCallsEnabled}
                onToggle={() => setOfficePriorityCallsEnabled((current) => !current)}
                activeColor="#5438f5"
              />
            </View>

            <View style={styles.officePriorityControlsDivider} />

            <View style={styles.officePriorityControlRow}>
              <View style={styles.officePriorityControlLeft}>
                <Ionicons name="notifications-off-outline" size={20} color="#5a44ff" />
                <Text style={styles.officePriorityControlLabel}>Mute others' notifications</Text>
              </View>
              <TogglePill
                value={officeMuteUnknown}
                onToggle={() => setOfficeMuteUnknown((current) => !current)}
                activeColor="#5438f5"
              />
            </View>
          </View>

          <View style={styles.officeSectionDivider} />

          <View style={styles.restPriorityList}>
            {officePriorityContacts.map((contact) => (
              <View key={contact.id} style={styles.officePriorityContactRow}>
                <View
                  style={[
                    styles.restPriorityAvatar,
                    { backgroundColor: getOfficeAvatarBackground(contact.id) },
                  ]}
                >
                  <Text style={styles.restPriorityAvatarText}>
                    {contact.emoji ?? buildRestAvatar(contact.name)}
                  </Text>
                </View>
                <View style={styles.restPriorityTextWrap}>
                  <Text style={styles.officePriorityContactName}>{getOfficePriorityLabel(contact)}</Text>
                  <Text style={styles.officePriorityContactPhone}>{getOfficePrioritySubtitle(contact)}</Text>
                </View>
                <Pressable
                  style={styles.restPriorityRemove}
                  onPress={() => removeOfficePriorityContact(contact.id)}
                >
                  <Ionicons name="close" size={20} color="#8b98ad" />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.restQuickAddRow}
            onPress={() => setOfficeQuickAddExpanded((current) => !current)}
          >
            <Text style={styles.restQuickAddText}>Quick add</Text>
            <Ionicons
              name={officeQuickAddExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#70819a"
            />
          </Pressable>

          {officeQuickAddExpanded && officeQuickAddContacts.length ? (
            <View style={styles.officeQuickAddChipRow}>
              {officeQuickAddContacts.map((contact) => (
                <Pressable
                  key={contact.id}
                  style={styles.officeQuickAddChip}
                  onPress={() => addOfficePriorityContact(contact.id)}
                >
                  <Text style={styles.officeQuickAddChipText}>{contact.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            style={styles.restAddContactButton}
            onPress={() => void openOfficeContactPicker("priority")}
          >
            <Feather name="edit-3" size={20} color="#5f5cff" />
            <Text style={styles.restAddContactText}>
              {officeContactsLoading ? "Loading..." : "Add Contact"}
            </Text>
          </Pressable>
        </AppCard>

          <GradientButton
            label={officeActive ? "Stop Office Mode" : "Start Office Mode"}
            colors={["#ff7388", "#f1546a"]}
            onPress={handleOfficeToggle}
          />
        </ScrollView>

        <Modal
          visible={officeContactPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setOfficeContactPickerVisible(false)}
        >
          <View style={styles.restContactModalBackdrop}>
            <View style={styles.restContactModalSheet}>
              <View style={styles.sectionRow}>
                <Text style={styles.headerTitle}>
                  {officeContactPickerMode === "priority" ? "Pick Priority Contact" : "Pick SMS Recipient"}
                </Text>
                <Pressable onPress={() => setOfficeContactPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={palette.text} />
                </Pressable>
              </View>
              <Text style={styles.helpText}>
                {officeContactPickerMode === "priority"
                  ? "Pick a device contact to allow direct priority calling in Office Mode."
                  : "Pick a device contact to receive arrival and departure auto-messages."}
              </Text>
              <ScrollView style={styles.restContactModalList}>
                {officeAvailableContacts.length ? (
                  officeAvailableContacts.map((contact) => {
                    const alreadySelected =
                      officeContactPickerMode === "priority"
                        ? officePriorityContacts.some(
                            (item) => normalizePhone(item.phone) === normalizePhone(contact.phone),
                          )
                        : officeMessageRecipients.some(
                            (item) => normalizePhone(item.phone) === normalizePhone(contact.phone),
                          );

                    return (
                      <Pressable
                        key={contact.id}
                        style={[
                          styles.restContactOption,
                          alreadySelected && styles.restContactOptionSelected,
                        ]}
                        onPress={() =>
                          officeContactPickerMode === "priority"
                            ? addOfficePriorityDeviceContact(contact)
                            : addOfficeMessageRecipient(contact)
                        }
                      >
                        <View style={styles.restContactOptionAvatar}>
                          <Text style={styles.restPriorityAvatarText}>{contact.emoji ?? "+"}</Text>
                        </View>
                        <View style={styles.restPriorityTextWrap}>
                          <Text style={styles.restPriorityName}>{contact.name}</Text>
                          <Text style={styles.restPriorityPhone}>{contact.phone}</Text>
                        </View>
                        {alreadySelected ? (
                          <Text style={styles.restContactSelectedLabel}>Added</Text>
                        ) : (
                          <Ionicons name="add-circle-outline" size={22} color={palette.indigo} />
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No contacts found</Text>
                    <Text style={styles.emptyText}>
                      Save phone numbers on the device and try again.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );

    return (
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Header title="Office Mode" onBack={goBack} />

        <AppCard style={styles.officeLocationCard}>
          <View style={styles.officeHeaderRow}>
            <View style={styles.officeHeaderLeft}>
              <View style={[styles.officeHeaderIconWrap, { backgroundColor: "#dce9ff" }]}>
                <Ionicons name="location-outline" size={28} color="#2b68ff" />
              </View>
              <View style={styles.officeHeaderTextWrap}>
                <Text style={styles.officeHeaderTitle}>Office Location</Text>
                <Text style={styles.officeHeaderSubtitle}>{officeLocationLabel}</Text>
              </View>
            </View>

            <Pressable style={styles.officeGhostButton} onPress={() => void handleSetOfficeLocation()}>
              <Feather name="edit-3" size={16} color="#2b68ff" />
              <Text style={styles.officeGhostButtonText}>Edit</Text>
            </Pressable>
          </View>

          <Pressable style={styles.officeLocationHint} onPress={() => void handleSetOfficeLocation()}>
            <Ionicons name="alert-circle-outline" size={18} color="#ff9a14" />
            <Text style={styles.officeLocationHintText}>
              Use <Text style={styles.officeLocationHintStrong}>"Use Current Location"</Text> to enable GPS
              auto-detection on arrival.
            </Text>
          </Pressable>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Geo Check</Text>
          <Text style={styles.helpText}>
            Save the current place as office, then run a live location check to trigger arrival or departure messaging.
          </Text>
          <View style={styles.shareRow}>
            <GradientButton
              label="Check Office Status"
              colors={["#5d87ff", "#3c6df3"]}
              small
              onPress={() => void handleCheckOfficeStatus()}
            />
            <GradientButton
              label="Compose Arrival SMS"
              colors={["#ff7388", "#f1546a"]}
              small
              onPress={() =>
                void composeSms(
                  ["+919999999999"],
                  "I have reached the office.",
                )
              }
            />
          </View>
          <Text style={styles.badgeText}>
            {officeInsideZone ? "Inside office zone" : "Outside office zone"} • {locationStatus}
          </Text>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Office Hours</Text>
          <View style={styles.twoStatRow}>
            <MetricCard
              title="Start"
              value={officeStart}
              icon={{ family: "ion", name: "sunny-outline" }}
              softColor={palette.orangeSoft}
              accentColor={palette.orange}
            />
            <MetricCard
              title="End"
              value={officeEnd}
              icon={{ family: "ion", name: "moon-outline" }}
              softColor={palette.violetSoft}
              accentColor={palette.violet}
            />
          </View>
        </AppCard>

        <AppCard>
          <SettingRow
            title="Auto-Messages"
            subtitle="Send SMS on office arrival and departure"
            icon={{ family: "feather", name: "message-circle" }}
            softColor={palette.redSoft}
            accentColor={palette.coral}
            right={
              <TogglePill
                value={officeAutoMessage}
                onToggle={() => setOfficeAutoMessage((current) => !current)}
              />
            }
          />
          <Divider />
          <SettingRow
            title="Mute Unknown Calls"
            subtitle="Allow family and office only during office hours"
            icon={{ family: "material", name: "briefcase-outline" }}
            softColor={palette.graySoft}
            accentColor={palette.navy}
            right={
              <TogglePill
                value={officeMuteUnknown}
                onToggle={() => setOfficeMuteUnknown((current) => !current)}
              />
            }
          />
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Priority Calls</Text>
          <View style={styles.contactWrap}>
            {contactsSeed.map((contact) => {
              const selected = officePriority.includes(contact.id);
              return (
                <Pressable
                  key={contact.id}
                  onPress={() =>
                    setOfficePriority((current) => toggleSelected(current, contact.id, 5))
                  }
                  style={[
                    styles.contactChip,
                    selected && { borderColor: palette.coral, backgroundColor: "#fff2f5" },
                  ]}
                >
                  <Text style={[styles.contactName, selected && { color: palette.coral }]}>
                    {contact.name}
                  </Text>
                  <Text style={styles.contactRelation}>{contact.relation}</Text>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        <AppCard>
          <View style={styles.sectionRow}>
            <Text style={styles.subSectionTitle}>Message Log</Text>
            <Text style={styles.sectionMutedCount}>{officeLogs.length} updates</Text>
          </View>
          {officeLogs.length ? (
            <View style={styles.listGap}>
              {officeLogs.map((entry) => (
                <View key={entry.id} style={styles.listItemCard}>
                  <View style={styles.listItemLeft}>
                    <IconCircle
                      icon={{
                        family: "ion",
                        name:
                          entry.type === "arrival"
                            ? "log-in-outline"
                            : entry.type === "departure"
                              ? "log-out-outline"
                              : "location-outline",
                      }}
                      softColor={palette.redSoft}
                      accentColor={palette.coral}
                    />
                    <View>
                      <Text style={styles.listTitle}>{entry.text}</Text>
                      <Text style={styles.listSubtitle}>{formatDateStamp(entry.timestamp)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No office messages yet</Text>
              <Text style={styles.emptyText}>Geo checks and mode activity will appear here.</Text>
            </View>
          )}
        </AppCard>

        <GradientButton
          label={officeActive ? "Stop Office Mode" : "Start Office Mode"}
          colors={["#ff7388", "#f1546a"]}
          onPress={handleOfficeToggle}
        />
      </ScrollView>
    );
  }

  function renderDrivingScreen() {
    return (
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Header title="Driving Mode" onBack={goBack} />

        <View style={styles.drivingCenter}>
          <View style={styles.drivingRing}>
            <View style={styles.drivingRingInner}>
              {renderIcon(
                { family: "material", name: "car-outline" },
                palette.violet,
                40,
              )}
            </View>
          </View>
          <Text style={styles.drivingTitle}>
            {drivingActive ? "Driving Mode On" : "Standing By"}
          </Text>
          <Text style={styles.drivingSubtitle}>
            Auto-detects speed &gt; 25 km/h and checks every 30 seconds
          </Text>
        </View>

        <SliderPanel
          label="Speed Simulator"
          minLabel="0 km/h"
          maxLabel="100 km/h"
          value={drivingSpeed}
          min={0}
          max={100}
          step={5}
          accentColor={palette.coral}
          formatValue={(value) => `${Math.round(value)} km/h`}
          onChange={setDrivingSpeed}
        />

        <AppCard>
          <SettingRow
            title="Auto-Detect"
            subtitle="Uses GPS speed to trigger mute"
            icon={{ family: "material", name: "pulse" }}
            softColor={palette.violetSoft}
            accentColor={palette.violet}
            right={
              <TogglePill
                value={drivingAutoDetect}
                onToggle={() => setDrivingAutoDetect((current) => !current)}
                activeColor={palette.coral}
              />
            }
          />
          <Divider />
          <SettingRow
            title="Auto-Reply SMS"
            subtitle={drivingReplyText}
            icon={{ family: "ion", name: "chatbubble-ellipses-outline" }}
            softColor={palette.redSoft}
            accentColor={palette.coral}
            right={
              <TogglePill
                value={drivingAutoReply}
                onToggle={() => setDrivingAutoReply((current) => !current)}
                activeColor={palette.coral}
              />
            }
          />
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Speed Check</Text>
          <Text style={styles.helpText}>
            Simulated speed updates the mode instantly. You can also pull current GPS speed from the phone.
          </Text>
          <View style={styles.shareRow}>
            <GradientButton
              label="Use Current Speed"
              colors={["#9b5cff", "#6f39ff"]}
              small
              onPress={() => void handleCheckDrivingSpeed()}
            />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Reply Message</Text>
          <SoftInput
            value={drivingReplyText}
            onChangeText={setDrivingReplyText}
            placeholder="Auto reply SMS"
          />
          <Text style={styles.helpText}>
            Calls are muted during driving, and the message above is ready to send automatically.
          </Text>
          <View style={styles.shareRow}>
            <GradientButton
              label="Compose SMS"
              colors={["#ff7388", "#f1546a"]}
              small
              onPress={() => void composeSms(["+919999999999"], drivingReplyText)}
            />
            <GradientButton
              label="Request Call Role"
              colors={["#23314d", "#101827"]}
              small
              onPress={() => void requestCallScreeningRole()}
            />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Call Tester</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroller}>
            <View style={styles.horizontalChips}>
              <Chip
                label="Unknown"
                active={drivingTestCaller === "unknown"}
                activeColor={palette.coral}
                onPress={() => setDrivingTestCaller("unknown")}
              />
              {contactsSeed.map((contact) => (
                <Chip
                  key={contact.id}
                  label={contact.name}
                  active={drivingTestCaller === contact.id}
                  activeColor={palette.violet}
                  onPress={() => setDrivingTestCaller(contact.id)}
                />
              ))}
            </View>
          </ScrollView>
          <GradientButton
            label="Simulate Incoming Call"
            colors={["#b14fff", "#6327ff"]}
            small
            onPress={() => handleDrivingTestCall()}
          />
        </AppCard>

        <AppCard>
          <View style={styles.sectionRow}>
            <Text style={styles.subSectionTitle}>Driving Log</Text>
            <Text style={styles.sectionMutedCount}>{drivingLogs.length} updates</Text>
          </View>
          {drivingLogs.length ? (
            <View style={styles.listGap}>
              {drivingLogs.map((entry) => (
                <View key={entry.id} style={styles.listItemCard}>
                  <View style={styles.listItemLeft}>
                    <IconCircle
                      icon={{ family: "material", name: "car-outline" }}
                      softColor={palette.violetSoft}
                      accentColor={palette.violet}
                    />
                    <View>
                      <Text style={styles.listTitle}>{entry.text}</Text>
                      <Text style={styles.listSubtitle}>{formatDateStamp(entry.timestamp)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No driving events yet</Text>
              <Text style={styles.emptyText}>Speed checks and muted call handling will appear here.</Text>
            </View>
          )}
        </AppCard>

        <GradientButton
          label={drivingActive ? "Manual Override Off" : "Manual Override On"}
          colors={["#b14fff", "#6327ff"]}
          onPress={handleDrivingToggle}
        />
      </ScrollView>
    );
  }

  function renderMuteAppsScreen() {
    return (
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Header title="Mute Apps" onBack={goBack} />

        <AppCard>
          <Text style={styles.subSectionTitle}>Central Notification Mute</Text>
          <Text style={styles.helpText}>
            Select any installed app here. When notification access is enabled, LifeBalance will
            dismiss notifications from the muted apps in one place.
          </Text>
          <Text style={styles.helpText}>
            Notification access: {muteListenerEnabled ? "Enabled" : "Disabled"}
          </Text>
          <Text style={styles.helpText}>{muteSyncStatus}</Text>
        </AppCard>

        <SearchBar
          value={muteSearch}
          onChangeText={setMuteSearch}
          placeholder="Search applications..."
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Installed Apps</Text>
          <Text style={styles.sectionMutedCount}>
            {mutedCount} Muted • {muteApps.length} Total
          </Text>
        </View>

        <View style={styles.shareRow}>
          <GradientButton
            label="Notif Access"
            colors={["#50627f", "#24324b"]}
            small
            onPress={openNotificationListenerSettings}
          />
          <GradientButton
            label="Refresh"
            colors={["#23314d", "#101827"]}
            small
            onPress={() => void refreshMuteAppsState()}
          />
          <GradientButton
            label="Unmute All"
            colors={["#8aa3c8", "#667a9c"]}
            small
            onPress={() =>
              setMuteApps((current) => current.map((app) => ({ ...app, muted: false })))
            }
          />
        </View>

        <View style={styles.listGap}>
          {muteAppsLoading ? (
            <AppCard>
              <Text style={styles.listTitle}>Loading apps...</Text>
              <Text style={styles.listSubtitle}>
                Installed applications are being fetched from the connected Android build.
              </Text>
            </AppCard>
          ) : null}

          {!muteAppsLoading && filteredMuteApps.length === 0 ? (
            <AppCard>
              <Text style={styles.listTitle}>No apps found</Text>
              <Text style={styles.listSubtitle}>
                Try a different search or refresh the installed app list.
              </Text>
            </AppCard>
          ) : null}

          {filteredMuteApps.map((app) => (
            <AppCard key={app.id} style={styles.appRowCard}>
              <View style={styles.listItemLeft}>
                <View style={[styles.appAvatar, { backgroundColor: app.color }]}>
                  {app.iconUri ? (
                    <Image source={{ uri: app.iconUri }} style={styles.appIcon} />
                  ) : (
                    <Text style={styles.appLetter}>{app.letter}</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.listTitle}>{app.name}</Text>
                  {false ? <Text style={styles.listSubtitle}>
                    {app.type} • {app.packageName}
                  </Text> : null}
                </View>
              </View>
              <TogglePill
                value={app.muted}
                onToggle={() => handleToggleMuteApp(app.packageName)}
                activeColor={palette.navy}
              />
            </AppCard>
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderExerciseScreen() {
    return (
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Header title="Exercise Mode" onBack={goBack} />

        <View style={styles.twoStatRow}>
          <MetricCard
            title="GPS"
            value="READY"
            icon={{ family: "ion", name: "map-outline" }}
            softColor={palette.cyanSoft}
            accentColor={palette.teal}
          />
          <MetricCard
            title="Goal"
            value={`${exerciseGoal} MINS`}
            icon={{ family: "ion", name: "trophy-outline" }}
            softColor={palette.orangeSoft}
            accentColor={palette.orange}
          />
        </View>

        <AppCard>
          <Text style={styles.subSectionTitle}>Today&apos;s Stats</Text>
          <Divider />
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="time-outline" size={22} color={palette.muted} />
              <Text style={styles.statLabel}>Active Time</Text>
            </View>
            <Text style={styles.statValue}>{exerciseMinutes} mins</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="fire" size={22} color={palette.muted} />
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <Text style={styles.statValue}>{exerciseCalories} kcal</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="navigate-outline" size={22} color={palette.muted} />
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <Text style={styles.statValue}>{exerciseDistanceKm.toFixed(1)} km</Text>
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>GPS Status</Text>
          <Text style={styles.helpText}>{locationStatus}</Text>
          <Text style={styles.badgeText}>
            {exerciseRoutePoints.length} route points captured
          </Text>
        </AppCard>

        <AppCard>
          <Text style={styles.subSectionTitle}>Location History</Text>
          <Text style={styles.helpText}>
            Workout route summaries are saved locally after each completed session.
          </Text>
          {exerciseHistory.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View>
                <Text style={styles.listTitle}>{item.date}</Text>
                <Text style={styles.listSubtitle}>
                  {item.duration} • {item.distance}
                </Text>
              </View>
              <Text style={styles.linkText}>View</Text>
            </View>
          ))}
        </AppCard>

        <GradientButton
          label={exerciseActive ? "End Workout" : "Start Workout"}
          colors={["#18c2dd", "#0ea5e9"]}
          onPress={handleExerciseToggle}
        />
      </ScrollView>
    );
  }

  function renderExpenseScreen() {
    const keypadRows = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
    ];
    const draftAmountValue = Number.parseInt(expenseDraftAmount, 10) || 0;

    return (
      <>
        <View style={styles.expenseScreen}>
          <ScrollView
            contentContainerStyle={styles.expenseScreenContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.expenseTopRow}>
              <Pressable style={styles.expenseMenuButton} onPress={goBack}>
                <Ionicons name="apps-outline" size={24} color="#181818" />
              </Pressable>

              <Text style={styles.expenseTopTitle}>Dashboard</Text>

              <Pressable
                style={styles.expenseReportsButton}
                onPress={() => setExpenseReportsVisible(true)}
              >
                <Ionicons name="stats-chart-outline" size={18} color="#181818" />
                <Text style={styles.expenseReportsButtonText}>Reports</Text>
              </Pressable>
            </View>

            <View style={styles.expenseBalanceCard}>
              <View>
                <Text
                  style={[
                    styles.expenseBalanceAmount,
                    expenseTotal < 0
                      ? styles.expenseBalanceAmountNegative
                      : expenseTotal > 0
                        ? styles.expenseBalanceAmountPositive
                        : null,
                  ]}
                >
                  {formatExpenseAmount(expenseTotal)}
                </Text>
              </View>
              <Text style={styles.expenseBalanceCurrency}>INR</Text>
            </View>

            <View style={styles.expenseSectionHeader}>
              <View>
                <Text style={styles.expenseSectionTitle}>All Expenses</Text>
                <Text style={styles.expenseSectionCaption}>Today</Text>
              </View>
              <Pressable style={styles.expenseViewAllButton}>
                <Text style={styles.expenseViewAllText}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.expenseListWrap}>
              {expenseSections.map((section) => (
                <View key={section.label} style={styles.expenseGroup}>
                  <Text style={styles.expenseGroupLabel}>{section.label}</Text>

                  {section.entries.map((entry) => {
                    const category = getExpenseCategory(entry.categoryId);
                    return (
                      <View key={entry.id} style={styles.expenseEntryCard}>
                        <LinearGradient
                          colors={["#9b27ff", "#6f13ff"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.expenseEntryIcon}
                        >
                          {renderIcon(category.icon, "#ffffff", 20)}
                        </LinearGradient>

                        <View style={styles.expenseEntryContent}>
                          <Text style={styles.expenseEntryTitle}>
                            {entry.categoryLabel || category.label}
                          </Text>
                          <Text style={styles.expenseEntrySubtitle} numberOfLines={1}>
                            {entry.description || "Expense added"}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.expenseEntryAmount,
                            entry.kind === "credit" && styles.expenseEntryAmountCredit,
                          ]}
                        >
                          {formatExpenseHistoryAmount(entry.amount, entry.kind)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable style={styles.expenseFloatingButton} onPress={openExpenseComposer}>
            <Ionicons name="add" size={32} color="#ffffff" />
          </Pressable>
        </View>

        <Modal
          visible={expenseReportsVisible}
          animationType="slide"
          onRequestClose={() => setExpenseReportsVisible(false)}
        >
          <SafeAreaView style={styles.expenseReportsScreen}>
            <View style={styles.expenseReportsHeader}>
              <Pressable
                style={styles.expenseComposerBack}
                onPress={() => setExpenseReportsVisible(false)}
              >
                <Ionicons name="chevron-back" size={26} color="#181818" />
              </Pressable>
              <Text style={styles.expenseComposerTitle}>Expense Reports</Text>
              <View style={styles.expenseComposerBackGhost} />
            </View>

            <ScrollView
              contentContainerStyle={styles.expenseReportsContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.expenseComposerLabel}>Advanced Filters</Text>
              <View style={styles.expenseReportFilterRow}>
                <View style={styles.expenseReportFilterCell}>
                  <Text style={styles.expenseReportFilterLabel}>Date</Text>
                  <Pressable
                    style={styles.expenseReportDropdownTrigger}
                    onPress={() => setExpenseReportDateMenuVisible((current) => !current)}
                  >
                    <Text style={styles.expenseReportDropdownValue}>{expenseReportDate}</Text>
                    <Ionicons
                      name={expenseReportDateMenuVisible ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#181818"
                    />
                  </Pressable>
                  {expenseReportDateMenuVisible ? (
                    <View style={styles.expenseReportDropdownMenu}>
                      {expenseDateOptions.map((option) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.expenseReportDropdownOption,
                            expenseReportDate === option &&
                              styles.expenseReportDropdownOptionActive,
                          ]}
                          onPress={() => {
                            setExpenseReportDate(option);
                            setExpenseReportDateMenuVisible(false);
                          }}
                        >
                          <Text style={styles.expenseReportDropdownOptionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.expenseReportFilterCell}>
                  <Text style={styles.expenseReportFilterLabel}>Month</Text>
                  <Pressable
                    style={styles.expenseReportDropdownTrigger}
                    onPress={() => setExpenseReportMonthMenuVisible((current) => !current)}
                  >
                    <Text style={styles.expenseReportDropdownValue}>
                      {formatExpenseMonthLabel(expenseReportMonth)}
                    </Text>
                    <Ionicons
                      name={expenseReportMonthMenuVisible ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#181818"
                    />
                  </Pressable>
                  {expenseReportMonthMenuVisible ? (
                    <View style={styles.expenseReportDropdownMenu}>
                      {expenseMonthOptions.map((option) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.expenseReportDropdownOption,
                            expenseReportMonth === option &&
                              styles.expenseReportDropdownOptionActive,
                          ]}
                          onPress={() => {
                            setExpenseReportMonth(option);
                            setExpenseReportMonthMenuVisible(false);
                          }}
                        >
                          <Text style={styles.expenseReportDropdownOptionText}>
                            {formatExpenseMonthLabel(option)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.expenseReportFilterCell}>
                  <Text style={styles.expenseReportFilterLabel}>Year</Text>
                  <Pressable
                    style={styles.expenseReportDropdownTrigger}
                    onPress={() => setExpenseReportYearMenuVisible((current) => !current)}
                  >
                    <Text style={styles.expenseReportDropdownValue}>{expenseReportYear}</Text>
                    <Ionicons
                      name={expenseReportYearMenuVisible ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#181818"
                    />
                  </Pressable>
                  {expenseReportYearMenuVisible ? (
                    <View style={styles.expenseReportDropdownMenu}>
                      {expenseYearOptions.map((option) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.expenseReportDropdownOption,
                            expenseReportYear === option &&
                              styles.expenseReportDropdownOptionActive,
                          ]}
                          onPress={() => {
                            setExpenseReportYear(option);
                            setExpenseReportYearMenuVisible(false);
                          }}
                        >
                          <Text style={styles.expenseReportDropdownOptionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.expenseReportsSummaryGrid}>
                <View style={styles.expenseReportsSummaryCardWide}>
                  <Text style={styles.expenseReportsSummaryLabel}>Net Balance</Text>
                  <Text
                    style={[
                      styles.expenseReportsSummaryNet,
                      expenseReportSummary.received - expenseReportSummary.withdrawn < 0
                        ? styles.expenseReportsSummaryValueNegative
                        : styles.expenseReportsSummaryValuePositive,
                    ]}
                  >
                    {formatExpenseAmount(
                      expenseReportSummary.received - expenseReportSummary.withdrawn,
                    )}
                  </Text>
                </View>

                <View style={styles.expenseReportsSummaryRow}>
                  <View style={styles.expenseReportsSummaryCardHalf}>
                    <Text style={styles.expenseReportsSummaryLabel}>Total Received</Text>
                    <Text style={styles.expenseReportsSummaryValuePositive}>
                      {formatExpenseHistoryAmount(expenseReportSummary.received, "credit")}
                    </Text>
                  </View>
                  <View style={styles.expenseReportsSummaryCardHalf}>
                    <Text style={styles.expenseReportsSummaryLabel}>Total Withdraw</Text>
                    <Text style={styles.expenseReportsSummaryValueNegative}>
                      {formatExpenseHistoryAmount(expenseReportSummary.withdrawn, "debit")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.expenseReportsList}>
                {expenseReportEntries.length ? (
                  expenseReportEntries.map((entry) => {
                    const category = getExpenseCategory(entry.categoryId);
                    return (
                      <View key={entry.id} style={styles.expenseReportEntryCard}>
                        <View style={styles.expenseReportEntryTop}>
                          <Text style={styles.expenseReportEntryTitle}>
                            {entry.categoryLabel || category.label}
                          </Text>
                          <Text
                            style={[
                              styles.expenseEntryAmount,
                              entry.kind === "credit" && styles.expenseEntryAmountCredit,
                            ]}
                          >
                            {formatExpenseHistoryAmount(entry.amount, entry.kind)}
                          </Text>
                        </View>
                        <Text style={styles.expenseReportEntryMeta}>
                          {entry.description || "Transaction saved"}
                        </Text>
                        <Text style={styles.expenseReportEntryMeta}>
                          {formatDateStamp(entry.timestamp)}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.expenseReportsEmpty}>
                    <Text style={styles.expenseReportsEmptyTitle}>No entries found</Text>
                    <Text style={styles.expenseReportsEmptyText}>
                      Change the filters to see received and withdraw records for another date or month.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={expenseComposerVisible}
          animationType="slide"
          onRequestClose={closeExpenseComposer}
        >
          <SafeAreaView style={styles.expenseComposerScreen}>
            <View style={styles.expenseComposerHeader}>
              <Pressable style={styles.expenseComposerBack} onPress={closeExpenseComposer}>
                <Ionicons name="chevron-back" size={26} color="#181818" />
              </Pressable>
              <Text style={styles.expenseComposerTitle}>Add Amount</Text>
              <View style={styles.expenseComposerBackGhost} />
            </View>

            <ScrollView
              contentContainerStyle={styles.expenseComposerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.expenseComposerLabel}>Amount</Text>
              <View style={styles.expenseComposerAmountRow}>
                <Text style={styles.expenseComposerAmount}>{formatExpenseAmount(draftAmountValue)}</Text>
                <Text style={styles.expenseComposerCurrency}>INR</Text>
              </View>
              <View style={styles.expenseComposerDivider} />

              <Text style={styles.expenseComposerLabel}>Type</Text>
              <View style={styles.expenseTypeToggleWrap}>
                <Pressable
                  style={[
                    styles.expenseTypeToggleButton,
                    expenseDraftKind === "debit" && styles.expenseTypeToggleButtonWithdrawActive,
                  ]}
                  onPress={() => updateExpenseDraftKind("debit")}
                >
                  <Text
                    style={[
                      styles.expenseTypeToggleText,
                      expenseDraftKind === "debit" && styles.expenseTypeToggleTextActive,
                    ]}
                  >
                    - Withdraw
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.expenseTypeToggleButton,
                    expenseDraftKind === "credit" && styles.expenseTypeToggleButtonDepositActive,
                  ]}
                  onPress={() => updateExpenseDraftKind("credit")}
                >
                  <Text
                    style={[
                      styles.expenseTypeToggleText,
                      expenseDraftKind === "credit" && styles.expenseTypeToggleTextActive,
                    ]}
                  >
                    + Deposit
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.expenseComposerLabel}>Transaction for</Text>
              <View style={styles.expenseComposerSelectRow}>
                <View style={styles.expenseComposerSelectTextWrap}>
                  <TextInput
                    value={expenseDraftCategoryLabel}
                    onChangeText={setExpenseDraftCategoryLabel}
                    placeholder="Type transaction title"
                    placeholderTextColor="#a7a7a7"
                    style={styles.expenseComposerSelectInput}
                  />
                </View>
                <Pressable
                  style={styles.expenseComposerSelectButton}
                  onPress={() => setExpenseCategoryMenuVisible((current) => !current)}
                >
                  <Ionicons
                    name={expenseCategoryMenuVisible ? "chevron-up" : "chevron-down"}
                    size={22}
                    color="#181818"
                  />
                </Pressable>
              </View>

              {expenseCategoryMenuVisible ? (
                <View style={styles.expenseCategoryMenu}>
                  {expenseCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.expenseCategoryOption,
                        expenseDraftCategoryId === category.id && styles.expenseCategoryOptionActive,
                      ]}
                      onPress={() => {
                        setExpenseDraftCategoryId(category.id);
                        setExpenseDraftCategoryLabel(category.label);
                        setExpenseCategoryMenuVisible(false);
                      }}
                    >
                      <View
                        style={[
                          styles.expenseCategoryOptionIcon,
                          { backgroundColor: category.softColor },
                        ]}
                      >
                        {renderIcon(category.icon, category.accentColor, 18)}
                      </View>
                      <Text style={styles.expenseCategoryOptionText}>{category.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.expenseComposerLabel}>Description</Text>
              <TextInput
                value={expenseDraftDescription}
                onChangeText={setExpenseDraftDescription}
                placeholder="Meeting and Snacks with Victor"
                placeholderTextColor="#a7a7a7"
                style={styles.expenseComposerDescriptionInput}
                multiline
              />
            </ScrollView>

            <View style={styles.expenseKeypad}>
              {keypadRows.map((row) => (
                <View key={row.join("-")} style={styles.expenseKeypadRow}>
                  {row.map((key) => (
                    <Pressable
                      key={key}
                      style={styles.expenseKeypadButton}
                      onPress={() => handleExpenseDigitPress(key)}
                    >
                      <Text style={styles.expenseKeypadButtonText}>{key}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}

              <View style={styles.expenseKeypadRow}>
                <Pressable
                  style={styles.expenseKeypadButton}
                  onPress={() => handleExpenseDigitPress("backspace")}
                >
                  <Ionicons name="backspace-outline" size={24} color="#181818" />
                </Pressable>
                <Pressable
                  style={styles.expenseKeypadButton}
                  onPress={() => handleExpenseDigitPress("0")}
                >
                  <Text style={styles.expenseKeypadButtonText}>0</Text>
                </Pressable>
                <Pressable
                  style={styles.expenseKeypadConfirmButton}
                  onPress={handleSaveExpenseEntry}
                >
                  <Ionicons name="checkmark-circle-outline" size={28} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  function renderCurrentScreen() {
    switch (currentScreen) {
      case "home":
        return renderHome();
      case "schedule":
        return renderKeepNotesScreen(false);
      case "modes":
        return renderModesScreen();
      case "profile":
        return renderProfileScreen();
      case "rest":
        return renderRestScreen();
      case "reminder":
        return renderKeepNotesScreen(true);
      case "todo":
        return renderTodoScreen();
      case "expense":
        return renderExpenseScreen();
      case "voice":
        return renderVoiceRecorderScreen();
      case "office":
        return renderOfficeScreen();
      case "driving":
        return renderDrivingScreen();
      case "mute":
        return renderMuteAppsScreen();
      case "exercise":
        return renderExerciseScreen();
      default:
        return renderHome();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <View style={styles.appBackground}>
        <View style={styles.phoneFrame}>
          {renderCurrentScreen()}
          {showBottomNav ? (
            <BottomNav active={currentRoot} onSelect={switchRoot} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceSoft,
  },
  appBackground: {
    flex: 1,
    backgroundColor: palette.surfaceSoft,
  },
  phoneFrame: {
    flex: 1,
    width: "100%",
    backgroundColor: palette.surfaceSoft,
    borderRadius: 0,
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 120,
    gap: 18,
  },
  detailScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 18,
  },
  officeScreenContent: {
    paddingTop: 92,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 30,
    padding: 20,
    shadowColor: "#a08f80",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 24,
  },
  greeting: {
    color: palette.muted,
    fontSize: 18,
    marginBottom: 2,
  },
  heroName: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#fff4ef",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffe1dc",
  },
  profileAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#fff4ef",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffe1dc",
  },
  avatarEmoji: {
    fontSize: 34,
  },
  activeHero: {
    borderRadius: 30,
    padding: 24,
    overflow: "hidden",
    shadowColor: palette.coral,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  activeLabel: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  activeTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 14,
  },
  activeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  activeGlow: {
    position: "absolute",
    right: -20,
    top: 10,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 16,
    borderColor: "rgba(255,255,255,0.14)",
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  balanceRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 10,
    borderColor: "#f0d2d7",
    borderTopColor: palette.coral,
    borderRightColor: palette.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceRingInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  balanceRingValue: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.text,
  },
  balanceTextWrap: {
    flex: 1,
    gap: 8,
  },
  balanceTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  balanceBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 28,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  linkText: {
    color: palette.coral,
    fontSize: 16,
    fontWeight: "700",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  moduleTileWrap: {
    width: "31%",
    alignItems: "center",
  },
  moduleTile: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: palette.surface,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#b0a194",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    position: "relative",
  },
  activeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
    top: 12,
    right: 12,
  },
  moduleTitle: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    shadowColor: "#9e8f81",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  bottomNavIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  bottomNavDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.coral,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#b1a191",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  backButtonGhost: {
    width: 10,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
  },
  bannerCard: {
    borderRadius: 30,
    padding: 22,
    shadowColor: "#e48e54",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  bannerEyebrow: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
  },
  bannerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  formGap: {
    gap: 14,
  },
  subSectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  helpText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
  },
  softInput: {
    backgroundColor: palette.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.text,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  chipInactive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "#dce5f1",
  },
  chipText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  fullButtonWrap: {
    marginTop: 8,
  },
  gradientButton: {
    borderRadius: 28,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.coral,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    paddingHorizontal: 26,
  },
  gradientButtonSmall: {
    minHeight: 54,
    borderRadius: 22,
    paddingHorizontal: 24,
  },
  gradientButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  listGap: {
    gap: 12,
  },
  listItemCard: {
    backgroundColor: palette.surfaceSoft,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  listTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  listSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  badgeText: {
    alignSelf: "flex-start",
    marginTop: 8,
    color: palette.coral,
    fontSize: 13,
    fontWeight: "700",
  },
  reminderSelectionRow: {
    flexDirection: "row",
    gap: 12,
  },
  reminderSelectionCard: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#f0decf",
  },
  reminderSelectionCardWide: {
    flex: 1.2,
  },
  reminderSelectionLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  reminderSelectionValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  reminderSelectionHint: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  reminderDateQuickRow: {
    gap: 10,
    paddingRight: 4,
  },
  reminderDateQuickChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "#e3ddd5",
  },
  reminderDateQuickChipActive: {
    backgroundColor: palette.orange,
    borderColor: palette.orange,
  },
  reminderDateQuickText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  reminderDateQuickTextActive: {
    color: "#fff",
  },
  reminderPickerSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: "78%",
  },
  reminderDateOptionGrid: {
    gap: 12,
  },
  reminderDateOption: {
    backgroundColor: palette.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#efe3d8",
  },
  reminderDateOptionActive: {
    backgroundColor: "#fff4e9",
    borderColor: palette.orange,
  },
  reminderDateOptionLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  reminderDateOptionLabelActive: {
    color: palette.orange,
  },
  reminderDateOptionValue: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  reminderDateOptionValueActive: {
    color: palette.orange,
  },
  reminderTimeSummary: {
    backgroundColor: "#fff4e9",
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  reminderTimeSummaryText: {
    color: palette.orange,
    fontSize: 28,
    fontWeight: "800",
  },
  reminderPickerLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  reminderTimeRow: {
    gap: 10,
    paddingBottom: 14,
  },
  reminderTimeChip: {
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: "#e9dfd6",
    alignItems: "center",
  },
  reminderTimeChipActive: {
    backgroundColor: palette.orange,
    borderColor: palette.orange,
  },
  reminderTimeChipText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  reminderTimeChipTextActive: {
    color: "#fff",
  },
  reminderPeriodRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  reminderPeriodChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: "#e9dfd6",
  },
  reminderPeriodChipActive: {
    backgroundColor: palette.orange,
    borderColor: palette.orange,
  },
  reminderPeriodText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  reminderPeriodTextActive: {
    color: "#fff",
  },
  reminderDebugCard: {
    backgroundColor: "#fff7ee",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3d9bf",
    gap: 6,
  },
  reminderPopupWarningCard: {
    backgroundColor: "#fff6dc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0cf72",
    gap: 10,
  },
  reminderPopupWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderPopupWarningTitle: {
    color: "#6d4900",
    fontSize: 15,
    fontWeight: "800",
  },
  reminderPopupWarningText: {
    color: "#8a661a",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  reminderPopupWarningButton: {
    alignSelf: "flex-start",
    backgroundColor: "#d7ab24",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  reminderPopupWarningButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  reminderDebugTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  reminderDebugLine: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  reminderActions: {
    alignItems: "center",
    gap: 14,
    marginLeft: 12,
  },
  searchWrap: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#b1a091",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: palette.text,
  },
  sectionMutedCount: {
    color: palette.muted,
    fontSize: 16,
    fontWeight: "700",
  },
  restHeroCard: {
    height: 182,
    borderRadius: 34,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 22,
    position: "relative",
    shadowColor: "#d7a58f",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  restHeroCloudMain: {
    position: "absolute",
    width: 190,
    height: 96,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.78)",
    right: 88,
    top: 42,
  },
  restHeroCloudLeft: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.82)",
    right: 202,
    top: 60,
  },
  restHeroCloudRight: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.7)",
    right: 48,
    top: 44,
  },
  restHeroBubbleOne: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f28f74",
    left: 62,
    bottom: 40,
  },
  restHeroBubbleTwo: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f1cdb5",
    right: 126,
    top: 28,
  },
  restHeroBubbleThree: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f46060",
    right: 88,
    bottom: 48,
  },
  restHeroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  restPanelCard: {
    padding: 20,
  },
  restPriorityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  restPriorityHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  restPriorityHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ececff",
    alignItems: "center",
    justifyContent: "center",
  },
  restPriorityHeaderTextWrap: {
    flex: 1,
  },
  restPriorityHeaderTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  restPriorityHeaderSubtitle: {
    color: "#6d7f99",
    fontSize: 14,
    fontWeight: "500",
  },
  restPriorityDivider: {
    height: 1,
    backgroundColor: "#dbe3f1",
    marginTop: 18,
    marginBottom: 18,
  },
  restPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  restPanelIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff0f2",
    alignItems: "center",
    justifyContent: "center",
  },
  restPanelTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
  },
  restDurationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  restDurationChip: {
    flex: 1,
    minHeight: 74,
    borderRadius: 999,
    backgroundColor: "#fff7f8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  restDurationChipActive: {
    backgroundColor: palette.surface,
    borderColor: palette.coral,
    borderWidth: 3,
  },
  restDurationChipText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "800",
  },
  restDurationChipTextActive: {
    color: palette.coral,
  },
  restCustomTimeWrap: {
    marginTop: 18,
    minHeight: 78,
    borderRadius: 999,
    backgroundColor: "#fff7f8",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  restTimeStepButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ddc9c9",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  restCustomTimeInput: {
    minWidth: 52,
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  restCustomTimeSuffix: {
    flex: 1,
    color: palette.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  restStatusCard: {
    gap: 18,
  },
  restStatusTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  restStatusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  restStatusPillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  restStatRow: {
    flexDirection: "row",
    gap: 12,
  },
  appRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  appLetter: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  infoStripCard: {
    backgroundColor: "#fff6ef",
  },
  infoStripTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoStripText: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 26,
  },
  profileHero: {
    paddingVertical: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileName: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  profileStatRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  metricTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  metricValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  metricSubtitle: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  sliderHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sliderTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  sliderTrackWrap: {
    height: 28,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#f1d8d3",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 10,
    borderRadius: 6,
  },
  sliderKnob: {
    position: "absolute",
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  sliderEdge: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  contactWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  restPriorityList: {
    gap: 8,
  },
  restDisabledSection: {
    opacity: 0.5,
  },
  restPriorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#e9efff",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  restPriorityAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  restPriorityAvatarText: {
    fontSize: 18,
  },
  restPriorityTextWrap: {
    flex: 1,
  },
  restPriorityName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 1,
  },
  restPriorityPhone: {
    color: "#6b84a4",
    fontSize: 11,
    fontWeight: "500",
  },
  restPriorityRemove: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#cdd7ea",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  restQuickAddRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 18,
  },
  restQuickAddText: {
    color: "#6d7f99",
    fontSize: 15,
    fontWeight: "500",
  },
  restAddContactButton: {
    minHeight: 70,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#c9d4ff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
  },
  restAddContactText: {
    color: "#5f5cff",
    fontSize: 17,
    fontWeight: "700",
  },
  contactChip: {
    minWidth: 92,
    backgroundColor: palette.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  contactName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  contactRelation: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginVertical: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  settingSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  toggleTrack: {
    width: 74,
    height: 40,
    borderRadius: 22,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleKnob: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  toggleKnobOff: {
    alignSelf: "flex-start",
  },
  todoComposerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    paddingLeft: 18,
    borderRadius: 999,
  },
  todoComposerInput: {
    flex: 1,
    fontSize: 17,
    color: palette.text,
  },
  todoAddButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: palette.coral,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.coral,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  todoPlannerContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 140,
    gap: 18,
    backgroundColor: "#f6f2e8",
  },
  todoDateStrip: {
    gap: 10,
    paddingRight: 14,
    marginBottom: 4,
  },
  todoDateChip: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4d9c4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    shadowColor: "#c8b99d",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  todoDateChipActive: {
    backgroundColor: "#e0b935",
    borderColor: "#e0b935",
  },
  todoDateNumber: {
    color: "#53472c",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 1,
  },
  todoDateNumberActive: {
    color: "#fffdf5",
  },
  todoDateWeekday: {
    color: "#857455",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  todoDateWeekdayActive: {
    color: "#fff6d7",
  },
  todoSearchBar: {
    width: "84%",
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOpacity: 0.05,
    marginBottom: 4,
  },
  todoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
    marginBottom: 2,
  },
  todoSectionTitle: {
    color: "#413728",
    fontSize: 31,
    fontWeight: "900",
  },
  todoSectionCaption: {
    color: "#8d8065",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  todoSectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#f7ebbd",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todoSectionBadgeText: {
    color: "#8d7328",
    fontSize: 13,
    fontWeight: "800",
  },
  todoTaskStack: {
    gap: 12,
    alignItems: "center",
  },
  todoTimelineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "92%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd3bf",
    backgroundColor: "#fffdf8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#d8ccb4",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  todoTimelineCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#dfba39",
    backgroundColor: "#fffdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  todoTimelineCheckDone: {
    backgroundColor: "#dfba39",
  },
  todoTimelineContent: {
    flex: 1,
    minWidth: 0,
  },
  todoTimelineTime: {
    color: "#786b54",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  todoTimelineTitle: {
    color: "#362f25",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  todoTimelineTitleDone: {
    color: "#9d9078",
    textDecorationLine: "line-through",
  },
  todoTimelineDetails: {
    color: "#625744",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 4,
  },
  todoTimelineDetailsDone: {
    color: "#ada28e",
    textDecorationLine: "line-through",
  },
  todoTimelineActions: {
    alignItems: "center",
    gap: 14,
  },
  todoTimelineDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff6d7",
  },
  todoEmptyState: {
    borderRadius: 28,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#eadcc1",
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
  },
  todoEmptyTitle: {
    color: "#51452f",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  todoEmptyText: {
    color: "#8d8065",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  todoFloatingButton: {
    position: "absolute",
    right: 26,
    bottom: 56,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e0b935",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d8aa1d",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  todoModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(42,33,17,0.25)",
  },
  todoModalSheet: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 14,
  },
  todoModalTitle: {
    color: "#413728",
    fontSize: 26,
    fontWeight: "900",
  },
  todoModalHint: {
    color: "#8f7f63",
    fontSize: 14,
    lineHeight: 22,
  },
  todoModalLabel: {
    color: "#5c5038",
    fontSize: 14,
    fontWeight: "800",
  },
  todoModalInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e6d9be",
    backgroundColor: "#fffdf8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#413728",
    fontSize: 16,
    fontWeight: "600",
  },
  todoModalTextArea: {
    minHeight: 96,
    paddingTop: 14,
  },
  todoModalPicker: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e6d9be",
    backgroundColor: "#fffdf8",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  todoModalPickerLabel: {
    color: "#a48f69",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  todoModalPickerValue: {
    color: "#413728",
    fontSize: 18,
    fontWeight: "800",
  },
  todoComposerDateStrip: {
    gap: 10,
    paddingRight: 14,
  },
  todoComposerDateChip: {
    width: 58,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e7dcc5",
    backgroundColor: "#fffdf8",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  todoComposerDateChipActive: {
    backgroundColor: "#f3d469",
    borderColor: "#f3d469",
  },
  todoComposerDateNumber: {
    color: "#5b4b31",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  todoComposerDateNumberActive: {
    color: "#fffdf5",
  },
  todoComposerDateWeekday: {
    color: "#8a7a5e",
    fontSize: 11,
    fontWeight: "700",
  },
  todoComposerDateWeekdayActive: {
    color: "#fff6d7",
  },
  todoModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  todoModalGhostButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0d2b4",
    backgroundColor: "#fffdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  todoModalGhostText: {
    color: "#73664b",
    fontSize: 15,
    fontWeight: "800",
  },
  todoModalPrimaryButton: {
    flex: 1.3,
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: "#d9b236",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  todoModalPrimaryText: {
    color: "#fffdf5",
    fontSize: 15,
    fontWeight: "900",
  },
  pillScroller: {
    marginHorizontal: -20,
  },
  horizontalChips: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  restTesterSummary: {
    backgroundColor: palette.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 14,
  },
  restTesterName: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  restTesterHint: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  restActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  restSecondaryButton: {
    minHeight: 54,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d9e1ee",
  },
  restSecondaryButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  shareRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  restRepeatCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 34,
  },
  restRepeatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  restRepeatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffe6ec",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  restRepeatTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  restRepeatTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
    marginBottom: 1,
  },
  restRepeatSubtitle: {
    color: "#6f87a7",
    fontSize: 12,
    lineHeight: 14,
    flexShrink: 1,
  },
  restCounterWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff5f5",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 5,
    flexShrink: 0,
    width: 116,
  },
  restCounterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d6c8ca",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  restCounterValue: {
    minWidth: 18,
    textAlign: "center",
    color: palette.text,
    fontSize: 14,
    fontWeight: "900",
  },
  restActiveSummary: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  restActiveSummaryText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  restActiveSummaryTextMuted: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  restAccessLink: {
    alignItems: "center",
    marginTop: 8,
  },
  restAccessLinkText: {
    color: palette.indigo,
    fontSize: 15,
    fontWeight: "700",
  },
  restStatusBadge: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  restStatusBadgeOk: {
    backgroundColor: "#e6f6ed",
  },
  restStatusBadgeWarn: {
    backgroundColor: "#fff0f3",
  },
  restStatusBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  restStatusBadgeTextOk: {
    color: "#198754",
  },
  restStatusBadgeTextWarn: {
    color: palette.coral,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 16,
  },
  restLogCard: {
    alignItems: "flex-start",
  },
  restLogDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  restLogTextWrap: {
    flex: 1,
  },
  restLogTime: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  restContactModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,34,58,0.28)",
    justifyContent: "flex-end",
  },
  restContactModalSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    minHeight: "58%",
    maxHeight: "82%",
  },
  restContactModalList: {
    marginTop: 8,
  },
  restContactOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: "#f7f8ff",
    marginBottom: 10,
  },
  restContactOptionSelected: {
    backgroundColor: "#eef1ff",
  },
  restContactOptionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e6fbff",
    alignItems: "center",
    justifyContent: "center",
  },
  restContactSelectedLabel: {
    color: palette.green,
    fontSize: 13,
    fontWeight: "800",
  },
  todoCard: {
    gap: 10,
  },
  todoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  todoHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  todoCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#d2dae7",
    alignItems: "center",
    justifyContent: "center",
  },
  todoTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  todoCategoryLabel: {
    color: palette.coral,
    fontSize: 13,
    fontWeight: "800",
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  childText: {
    color: palette.muted,
    fontSize: 15,
    flex: 1,
  },
  todoDoneText: {
    textDecorationLine: "line-through",
    color: "#93a0b6",
  },
  officeLocationCard: {
    padding: 18,
    gap: 16,
  },
  officeAutoCard: {
    padding: 18,
  },
  officePriorityCard: {
    padding: 18,
  },
  officeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  officeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  officeHeaderIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  officeHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  officeHeaderTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  officeHeaderSubtitle: {
    color: "#6d7f99",
    fontSize: 14,
    lineHeight: 20,
  },
  officeGhostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#edf3ff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  officeGhostButtonText: {
    color: "#2b68ff",
    fontSize: 15,
    fontWeight: "800",
  },
  officeLocationHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff9e8",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffd882",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  officeLocationHintText: {
    flex: 1,
    color: "#d36d00",
    fontSize: 14,
    lineHeight: 22,
  },
  officeLocationHintStrong: {
    fontWeight: "900",
  },
  officeLocationInput: {
    borderWidth: 1,
    borderColor: "#d7e0ee",
    backgroundColor: "#fbfdff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.text,
    fontSize: 15,
    fontWeight: "500",
  },
  officeLocationActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  officeSecondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#edf3ff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  officeSecondaryButtonText: {
    color: "#2b68ff",
    fontSize: 14,
    fontWeight: "800",
  },
  officePrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2b68ff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  officePrimaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  officeSectionDivider: {
    height: 1,
    backgroundColor: "#dbe3f1",
    marginVertical: 18,
  },
  officeAutoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  officeAutoRowLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  officeAutoRowLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  officeMessagePanel: {
    borderRadius: 34,
    padding: 16,
    marginBottom: 18,
  },
  officeMessagePanelArrival: {
    backgroundColor: "#e8fbf2",
  },
  officeMessagePanelDeparture: {
    backgroundColor: "#fff0f3",
  },
  officeMessagePanelTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  officePresetSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  officePresetSelectorText: {
    color: "#647d9d",
    fontSize: 15,
    fontWeight: "500",
  },
  officeCustomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d9e1ee",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  officeCustomChipText: {
    color: "#647d9d",
    fontSize: 14,
    fontWeight: "800",
  },
  officeMessageBubble: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  officeMessageBubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  officeRecipientsWrap: {
    gap: 12,
    marginBottom: 4,
  },
  officeRecipientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  officeRecipientsTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  officeRecipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eef5ff",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  officeRecipientsPhone: {
    color: "#6b84a4",
    fontSize: 11,
    fontWeight: "500",
  },
  officeRecipientsEmpty: {
    color: "#6d7f99",
    fontSize: 13,
    lineHeight: 20,
  },
  officeRecipientsActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  officeDepartureTestButton: {
    backgroundColor: "#fff0f3",
  },
  officeDepartureTestButtonText: {
    color: "#ea335d",
    fontSize: 14,
    fontWeight: "800",
  },
  officePriorityControls: {
    backgroundColor: "#fff6f2",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    marginTop: 16,
  },
  officePriorityControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  officePriorityControlLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  officePriorityControlLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  officePriorityControlsDivider: {
    height: 1,
    backgroundColor: "#dbe3f1",
    marginVertical: 8,
  },
  officePriorityContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#e9efff",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  officePriorityContactName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  officePriorityContactPhone: {
    color: "#ff9500",
    fontSize: 11,
    fontWeight: "500",
  },
  officeQuickAddChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  officeQuickAddChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#edf3ff",
  },
  officeQuickAddChipText: {
    color: "#5c7090",
    fontSize: 13,
    fontWeight: "700",
  },
  officeHero: {
    borderRadius: 34,
    padding: 24,
    minHeight: 150,
    justifyContent: "flex-end",
  },
  officeHeroTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  officeHeroSubtitle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 15,
    lineHeight: 24,
  },
  twoStatRow: {
    flexDirection: "row",
    gap: 12,
  },
  drivingCenter: {
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  drivingRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 16,
    borderColor: "#e9ddff",
    borderLeftColor: palette.violet,
    borderBottomColor: palette.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  drivingRingInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#faf7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  drivingTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
  },
  drivingSubtitle: {
    color: palette.muted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 24,
  },
  newsTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  newsSource: {
    color: palette.coral,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  newsTime: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  newsTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 10,
  },
  newsSummary: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 16,
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  keepScreenContent: {
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 112,
    gap: 18,
    backgroundColor: "#f6f4fb",
  },
  keepTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  keepTopIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  keepSearchShell: {
    flex: 1,
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: "#d7d5e7",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  keepSearchInput: {
    flex: 1,
    color: "#2c2a38",
    fontSize: 18,
    fontWeight: "500",
    paddingVertical: 0,
  },
  keepSearchAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f0f8",
  },
  keepAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#5b64c9",
    alignItems: "center",
    justifyContent: "center",
  },
  keepAvatarText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  keepSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  keepSectionTitle: {
    color: "#2b2938",
    fontSize: 27,
    fontWeight: "800",
  },
  keepSectionCaption: {
    color: "#7b7990",
    fontSize: 14,
    marginTop: 4,
  },
  keepSectionCount: {
    color: "#5b64c9",
    fontSize: 18,
    fontWeight: "800",
  },
  keepListWrap: {
    gap: 14,
  },
  keepGridWrap: {
    gap: 14,
  },
  keepGridRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "stretch",
  },
  keepGridCell: {
    flex: 1,
  },
  keepNoteCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d8d4e6",
    gap: 12,
  },
  keepNoteCardCompact: {
    minHeight: 220,
  },
  keepNoteHeader: {
    gap: 6,
  },
  keepNoteTitleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  keepNoteTitle: {
    flex: 1,
    color: "#2a2835",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
  },
  keepNoteUntitled: {
    color: "#7f7b8f",
    fontSize: 16,
    fontWeight: "600",
  },
  keepNoteDate: {
    color: "#9b97ab",
    fontSize: 12,
    fontWeight: "600",
  },
  keepNoteBody: {
    color: "#504d5d",
    fontSize: 16,
    lineHeight: 24,
  },
  keepNoteCategoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  keepNoteCategoryWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keepNoteCategoryBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(91,100,201,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  keepNoteCategoryText: {
    color: "#4b52b2",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  keepNoteCategoryToggle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,100,201,0.12)",
  },
  keepChecklistPreview: {
    gap: 8,
  },
  keepChecklistPreviewSection: {
    gap: 6,
  },
  keepChecklistPreviewHeading: {
    color: "#5852bf",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  keepChecklistPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  keepChecklistPreviewText: {
    flex: 1,
    color: "#504d5d",
    fontSize: 15,
  },
  keepChecklistPreviewTextChecked: {
    color: "#9691a6",
    textDecorationLine: "line-through",
  },
  keepChecklistCollapsedHint: {
    color: "#7b768d",
    fontSize: 13,
    fontWeight: "600",
  },
  keepNoteImagePreview: {
    width: "100%",
    height: 152,
    borderRadius: 18,
    backgroundColor: "#e9e6f2",
  },
  keepAttachmentBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  keepAttachmentBadgeText: {
    maxWidth: 180,
    color: "#3f3c50",
    fontSize: 13,
    fontWeight: "600",
  },
  keepNoteActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  keepNoteActionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  keepEmptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
  },
  keepEmptyTitle: {
    color: "#333041",
    fontSize: 20,
    fontWeight: "700",
  },
  keepEmptyText: {
    color: "#817e92",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    paddingHorizontal: 24,
  },
  keepFabMenuWrap: {
    position: "absolute",
    right: 20,
    bottom: 148,
    gap: 14,
    alignItems: "flex-end",
  },
  keepFabMenuButton: {
    minWidth: 146,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#e3e0eb",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#b9b4cb",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  keepFabMenuText: {
    color: "#303047",
    fontSize: 17,
    fontWeight: "700",
  },
  keepFloatingButton: {
    position: "absolute",
    right: 24,
    bottom: 64,
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#5b64c9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5b64c9",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  keepEditorScreen: {
    flex: 1,
    backgroundColor: "#f6f4fb",
    paddingTop: 30,
  },
  keepEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  keepEditorHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  keepEditorIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e3e0eb",
  },
  keepEditorSaveButton: {
    borderRadius: 14,
    backgroundColor: "#5b64c9",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  keepEditorSaveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  keepEditorBody: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 30,
  },
  keepEditorBodyContent: {
    padding: 22,
    gap: 18,
    paddingBottom: 30,
  },
  keepEditorTitleInput: {
    color: "#2a2835",
    fontSize: 34,
    fontWeight: "600",
  },
  keepEditorTextInput: {
    minHeight: 160,
    color: "#3e3b4b",
    fontSize: 18,
    lineHeight: 28,
  },
  keepEditorMediaCard: {
    gap: 10,
  },
  keepEditorImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    backgroundColor: "#e8e5f1",
  },
  keepEditorMediaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  keepEditorMediaTitle: {
    flex: 1,
    color: "#3e3a4a",
    fontSize: 15,
    fontWeight: "600",
  },
  keepEditorAudioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 16,
  },
  keepEditorAudioInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  keepEditorAudioTextWrap: {
    flex: 1,
    gap: 4,
  },
  keepEditorAudioTitle: {
    color: "#323040",
    fontSize: 15,
    fontWeight: "700",
  },
  keepEditorAudioMeta: {
    color: "#79758a",
    fontSize: 13,
  },
  keepChecklistEditor: {
    gap: 12,
  },
  keepChecklistSection: {
    gap: 10,
  },
  keepChecklistSectionHeading: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(91,100,201,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keepChecklistSectionHeadingActive: {
    backgroundColor: "rgba(91,100,201,0.22)",
  },
  keepChecklistSectionHeadingText: {
    color: "#4b52b2",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  keepChecklistCategoryCard: {
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  keepChecklistCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  keepChecklistCategoryLabel: {
    color: "#55516a",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  keepChecklistCategoryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  keepChecklistCategoryToggleText: {
    color: "#5652b9",
    fontSize: 13,
    fontWeight: "700",
  },
  keepChecklistCategoryInput: {
    flex: 1,
    color: "#353242",
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#d4cfdf",
    paddingVertical: 8,
  },
  keepChecklistCategoryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  keepChecklistCategoryAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5b64c9",
  },
  keepChecklistCategoryChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keepChecklistCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(91,100,201,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keepChecklistCategoryChipActive: {
    backgroundColor: "rgba(91,100,201,0.22)",
  },
  keepChecklistCategoryChipText: {
    color: "#4b52b2",
    fontSize: 13,
    fontWeight: "700",
  },
  keepChecklistCategoryHint: {
    color: "#807b90",
    fontSize: 13,
    lineHeight: 19,
  },
  keepChecklistEditorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  keepChecklistEditorInput: {
    flex: 1,
    color: "#3c3948",
    fontSize: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#d4cfdf",
    paddingVertical: 8,
  },
  keepChecklistAddButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  keepChecklistActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  keepChecklistAddButtonInline: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  keepChecklistAddText: {
    color: "#5b64c9",
    fontSize: 14,
    fontWeight: "700",
  },
  keepChecklistCategoryInlineCard: {
    gap: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.66)",
    padding: 12,
  },
  keepEditorToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 52,
    gap: 8,
  },
  keepEditorToolButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 18,
    backgroundColor: "#e3e0eb",
    paddingVertical: 12,
    shadowColor: "#b9b4cb",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  keepEditorToolText: {
    color: "#303047",
    fontSize: 12,
    fontWeight: "700",
  },
  expenseScreen: {
    flex: 1,
    backgroundColor: "#f3f1f7",
  },
  expenseScreenContent: {
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 130,
    gap: 22,
  },
  expenseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  expenseTopTitle: {
    flex: 1,
    marginLeft: 14,
    color: "#191919",
    fontSize: 20,
    fontWeight: "800",
  },
  expenseReportsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expenseReportsButtonText: {
    color: "#181818",
    fontSize: 14,
    fontWeight: "800",
  },
  expenseAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  expenseAvatarText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  expenseBalanceCard: {
    borderRadius: 34,
    backgroundColor: "#6f6f73",
    paddingHorizontal: 28,
    paddingVertical: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#111111",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  expenseBalanceAmount: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  expenseBalanceAmountNegative: {
    color: "#ff8b95",
  },
  expenseBalanceAmountPositive: {
    color: "#7ef0a7",
  },
  expenseBalanceCurrency: {
    color: "#a6a6a6",
    fontSize: 18,
    fontWeight: "700",
  },
  expenseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseSectionTitle: {
    color: "#161616",
    fontSize: 17,
    fontWeight: "800",
  },
  expenseSectionCaption: {
    color: "#9d9d9d",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  expenseViewAllButton: {
    borderRadius: 16,
    backgroundColor: "#ece9f1",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  expenseViewAllText: {
    color: "#83818a",
    fontSize: 13,
    fontWeight: "700",
  },
  expenseListWrap: {
    gap: 18,
  },
  expenseGroup: {
    gap: 10,
  },
  expenseGroupLabel: {
    color: "#97959f",
    fontSize: 12,
    fontWeight: "700",
  },
  expenseEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    backgroundColor: "#f1f0f3",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  expenseEntryIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseEntryContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  expenseEntryTitle: {
    color: "#191919",
    fontSize: 17,
    fontWeight: "800",
  },
  expenseEntrySubtitle: {
    color: "#7b7983",
    fontSize: 14,
    fontWeight: "600",
  },
  expenseEntryAmount: {
    color: "#181818",
    fontSize: 16,
    fontWeight: "800",
  },
  expenseEntryAmountCredit: {
    color: "#16934f",
  },
  expenseFloatingButton: {
    position: "absolute",
    right: 26,
    bottom: 38,
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
    shadowColor: "#111111",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  expenseComposerScreen: {
    flex: 1,
    backgroundColor: "#fdfcfa",
  },
  expenseReportsScreen: {
    flex: 1,
    backgroundColor: "#f6f3f8",
  },
  expenseReportsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 42,
    paddingBottom: 22,
  },
  expenseReportsContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 34,
    gap: 18,
  },
  expenseReportFilterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  expenseReportFilterCell: {
    flex: 1,
    gap: 8,
  },
  expenseReportFilterLabel: {
    color: "#8a8792",
    fontSize: 12,
    fontWeight: "700",
  },
  expenseReportDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  expenseReportDropdownValue: {
    flex: 1,
    color: "#181818",
    fontSize: 13,
    fontWeight: "700",
  },
  expenseReportDropdownMenu: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 8,
    gap: 6,
    maxHeight: 220,
  },
  expenseReportDropdownOption: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expenseReportDropdownOptionActive: {
    backgroundColor: "#efe8ff",
  },
  expenseReportDropdownOptionText: {
    color: "#181818",
    fontSize: 14,
    fontWeight: "700",
  },
  expenseReportsSummaryGrid: {
    gap: 12,
  },
  expenseReportsSummaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  expenseReportsSummaryCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  expenseReportsSummaryCardHalf: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  expenseReportsSummaryCardWide: {
    borderRadius: 24,
    backgroundColor: "#171717",
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 10,
  },
  expenseReportsSummaryLabel: {
    color: "#8a8792",
    fontSize: 13,
    fontWeight: "700",
  },
  expenseReportsSummaryValuePositive: {
    color: "#16934f",
    fontSize: 22,
    fontWeight: "900",
  },
  expenseReportsSummaryValueNegative: {
    color: "#e25366",
    fontSize: 22,
    fontWeight: "900",
  },
  expenseReportsSummaryNet: {
    fontSize: 24,
    fontWeight: "900",
  },
  expenseReportsList: {
    gap: 12,
  },
  expenseReportEntryCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  expenseReportEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  expenseReportEntryTitle: {
    flex: 1,
    color: "#181818",
    fontSize: 16,
    fontWeight: "800",
  },
  expenseReportEntryMeta: {
    color: "#7b7983",
    fontSize: 13,
    fontWeight: "600",
  },
  expenseReportsEmpty: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 8,
    alignItems: "center",
  },
  expenseReportsEmptyTitle: {
    color: "#181818",
    fontSize: 18,
    fontWeight: "800",
  },
  expenseReportsEmptyText: {
    color: "#7b7983",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  expenseComposerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  expenseComposerBack: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseComposerBackGhost: {
    width: 36,
    height: 36,
  },
  expenseComposerTitle: {
    color: "#181818",
    fontSize: 18,
    fontWeight: "800",
  },
  expenseComposerContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 18,
  },
  expenseComposerLabel: {
    color: "#8d8b92",
    fontSize: 14,
    fontWeight: "700",
  },
  expenseComposerAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseComposerAmount: {
    color: "#171717",
    fontSize: 34,
    fontWeight: "900",
  },
  expenseComposerCurrency: {
    color: "#9a98a1",
    fontSize: 16,
    fontWeight: "700",
  },
  expenseComposerDivider: {
    height: 2,
    backgroundColor: "#1e1e1e",
    opacity: 0.9,
    marginTop: 2,
    marginBottom: 6,
  },
  expenseTypeToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expenseTypeToggleButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f1efec",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseTypeToggleButtonWithdrawActive: {
    backgroundColor: "#f4c2c7",
  },
  expenseTypeToggleButtonDepositActive: {
    backgroundColor: "#c0edd0",
  },
  expenseTypeToggleText: {
    color: "#555555",
    fontSize: 14,
    fontWeight: "800",
  },
  expenseTypeToggleTextActive: {
    color: "#171717",
  },
  expenseComposerSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  expenseComposerSelectTextWrap: {
    flex: 1,
  },
  expenseComposerSelectValue: {
    color: "#181818",
    fontSize: 18,
    fontWeight: "800",
  },
  expenseComposerSelectInput: {
    color: "#181818",
    fontSize: 18,
    fontWeight: "800",
    paddingVertical: 6,
  },
  expenseComposerSelectButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0efed",
  },
  expenseCategoryMenu: {
    gap: 10,
    borderRadius: 24,
    backgroundColor: "#f5f3f0",
    padding: 12,
  },
  expenseCategoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  expenseCategoryOptionActive: {
    backgroundColor: "#ffffff",
  },
  expenseCategoryOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseCategoryOptionText: {
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "700",
  },
  expenseComposerDescriptionInput: {
    minHeight: 72,
    color: "#181818",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    paddingVertical: 6,
  },
  expenseKeypad: {
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
  },
  expenseKeypadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseKeypadButton: {
    width: 84,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseKeypadButtonText: {
    color: "#181818",
    fontSize: 30,
    fontWeight: "500",
  },
  expenseKeypadConfirmButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8a19ff",
    shadowColor: "#8a19ff",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  voiceHeroCard: {
    borderRadius: 34,
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 12,
    overflow: "hidden",
  },
  voiceHeroBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceHeroTitle: {
    color: "#1f1832",
    fontSize: 30,
    fontWeight: "800",
  },
  voiceHeroSubtitle: {
    color: "#605978",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  voicePanelCard: {
    gap: 16,
  },
  voicePanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  voiceStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  voiceStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voiceStatusBadgeReady: {
    backgroundColor: "#e6f7ee",
  },
  voiceStatusBadgeWarn: {
    backgroundColor: "#fff0f0",
  },
  voiceStatusBadgeNeutral: {
    backgroundColor: "#efedf5",
  },
  voiceStatusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  voiceStatusBadgeTextReady: {
    color: "#1f8a52",
  },
  voiceStatusBadgeTextWarn: {
    color: "#c04b5d",
  },
  voiceStatusBadgeTextNeutral: {
    color: "#666071",
  },
  voiceStatusText: {
    color: "#4d465f",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  voiceHelperRow: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#f7f4fc",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  voiceHelperCopy: {
    flex: 1,
    gap: 4,
  },
  voiceHelperTitle: {
    color: "#312b43",
    fontSize: 14,
    fontWeight: "800",
  },
  voiceHelperText: {
    color: "#6a647c",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  voiceWarningCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#fff2df",
    borderWidth: 1,
    borderColor: "#f3d5a7",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  voiceWarningCopy: {
    flex: 1,
    gap: 4,
  },
  voiceWarningTitle: {
    color: "#8a4b00",
    fontSize: 14,
    fontWeight: "800",
  },
  voiceWarningText: {
    color: "#9a6521",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  voiceLineSelectorRow: {
    gap: 12,
  },
  voiceLineOption: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ebe5f5",
    backgroundColor: "#faf8fe",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 4,
  },
  voiceLineOptionActive: {
    borderColor: "#7c3aed",
    backgroundColor: "#f2ebff",
  },
  voiceLineOptionTitle: {
    color: "#2b2539",
    fontSize: 15,
    fontWeight: "800",
  },
  voiceLineOptionTitleActive: {
    color: "#5a27c7",
  },
  voiceLineOptionNumber: {
    color: "#7b748e",
    fontSize: 13,
    fontWeight: "600",
  },
  voiceLineOptionNumberActive: {
    color: "#5f5880",
  },
  voiceSecondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#efedf5",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  voiceSecondaryActionButtonText: {
    color: "#5b556b",
    fontSize: 13,
    fontWeight: "800",
  },
  voiceSimList: {
    gap: 12,
  },
  voiceSimCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ebe5f5",
    backgroundColor: "#faf8fe",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 6,
  },
  voiceSimCardActive: {
    borderColor: "#7c3aed",
    backgroundColor: "#f2ebff",
  },
  voiceSimCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  voiceSimName: {
    flex: 1,
    color: "#2b2539",
    fontSize: 15,
    fontWeight: "800",
  },
  voiceSimNameActive: {
    color: "#5a27c7",
  },
  voiceSimSlot: {
    color: "#7f7891",
    fontSize: 12,
    fontWeight: "800",
  },
  voiceSimSlotActive: {
    color: "#5a27c7",
  },
  voiceSimCarrier: {
    color: "#736c86",
    fontSize: 13,
    fontWeight: "700",
  },
  voiceSimCarrierActive: {
    color: "#605780",
  },
  voiceSimNumber: {
    color: "#8c859d",
    fontSize: 13,
    fontWeight: "600",
  },
  voiceSimNumberActive: {
    color: "#61587d",
  },
  voiceNumberInputs: {
    gap: 12,
  },
  voiceInputBlock: {
    gap: 8,
  },
  voiceInputLabel: {
    color: "#7f7892",
    fontSize: 12,
    fontWeight: "700",
  },
  voiceScopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  voiceScopeHint: {
    color: "#58516d",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  voiceActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  voiceActionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  voiceNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "#f4edff",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  voiceNoteText: {
    flex: 1,
    color: "#554d6d",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  voiceContactsList: {
    gap: 12,
  },
  voiceContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    backgroundColor: "#f5f2f9",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  voiceContactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#e7ddff",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceContactAvatarText: {
    color: "#5c2bc8",
    fontSize: 18,
    fontWeight: "800",
  },
  voiceContactMeta: {
    flex: 1,
    gap: 4,
  },
  voiceContactName: {
    color: "#221c32",
    fontSize: 16,
    fontWeight: "800",
  },
  voiceContactPhone: {
    color: "#756d87",
    fontSize: 13,
    fontWeight: "600",
  },
  voiceEmptyText: {
    color: "#7d768f",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  voiceDiagnosticsRow: {
    gap: 10,
  },
  voiceHistoryList: {
    gap: 12,
  },
  voiceHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    backgroundColor: "#f6f4f9",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  voiceHistoryMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voiceHistoryBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#eee7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceHistoryMeta: {
    flex: 1,
    gap: 4,
  },
  voiceHistoryCaller: {
    color: "#2f2940",
    fontSize: 15,
    fontWeight: "800",
  },
  voiceHistoryLine: {
    color: "#6d6780",
    fontSize: 13,
    fontWeight: "700",
  },
  voiceHistoryMetaLine: {
    color: "#817a92",
    fontSize: 12,
    fontWeight: "700",
  },
  voiceHistoryActions: {
    gap: 10,
    alignItems: "center",
  },
  voiceHistoryActionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#efebf6",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceHistoryActionDelete: {
    backgroundColor: "#fcecef",
  },
  voiceHistoryDate: {
    color: "#90889f",
    fontSize: 12,
    fontWeight: "600",
  },
  voiceSecondaryButton: {
    borderRadius: 18,
    backgroundColor: "#f0edf6",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  voiceSecondaryButtonText: {
    color: "#514b63",
    fontSize: 14,
    fontWeight: "800",
  },
  voicePrimaryButton: {
    borderRadius: 18,
    backgroundColor: "#171717",
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  voicePrimaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  voiceLogList: {
    gap: 12,
  },
  voiceLogRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 20,
    backgroundColor: "#f6f4f9",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  voiceLogDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  voiceLogDotMatch: {
    backgroundColor: "#20b26b",
  },
  voiceLogDotSkip: {
    backgroundColor: "#e8697b",
  },
  voiceLogDotInfo: {
    backgroundColor: "#7c3aed",
  },
  voiceLogTextWrap: {
    flex: 1,
    gap: 6,
  },
  voiceLogText: {
    color: "#2f2940",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  voiceLogDate: {
    color: "#8a839b",
    fontSize: 12,
    fontWeight: "600",
  },
});
