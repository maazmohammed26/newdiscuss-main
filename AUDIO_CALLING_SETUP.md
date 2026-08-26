# Discuss audio calling deployment

Discuss audio calling is implemented only in private conversations. A call begins with two active friends and can contain at most four active or invited participants. Group conversations intentionally have no call control.

## Architecture

- LiveKit Cloud transports real-time audio. Discuss does not record or store audio.
- Two authenticated Vercel Functions create signed LiveKit room tokens and receive signed LiveKit webhook events.
- The primary Firebase Realtime Database stores short-lived call state and incoming invitations.
- The private-chat database stores one compact call-history message after a call ends: status, participants, start/end time and duration.
- OneSignal sends background incoming-call notifications. The React call layer handles in-app ringing.
- The LiveKit API secret and Firebase service-account key exist only as encrypted Vercel runtime environment variables. They must never use a `REACT_APP_` prefix or be committed to GitHub, included in an APK, or returned by an API.

Vercel Hobby is suitable for this first phase: the calls themselves travel through LiveKit, while Vercel handles only short token/control requests and webhook events.

## Required Vercel environment variables

Add these in Vercel Project Settings > Environment Variables for Production, Preview and Development as appropriate:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
ONESIGNAL_REST_API_KEY
```

Optional database URL overrides:

```text
PRIMARY_DATABASE_URL
SECONDARY_DATABASE_URL
CHATS_DATABASE_URL
```

`FIREBASE_SERVICE_ACCOUNT_JSON` is the complete JSON for one dedicated server service account. Keep it as one environment-variable value. The backend safely restores escaped private-key line breaks.

The LiveKit credentials shared during development must be rotated in LiveKit Cloud before public release because the original secret was exposed outside a secret manager. The old `REACT_APP_ONESIGNAL_REST_API_KEY` must also be rotated because older browser builds could include it. Save only the rotated server keys under the non-prefixed names above, then remove the old `REACT_APP_` REST-key variable after the new deployment is verified.

## Firebase access

The dedicated server service account must have Realtime Database access to:

- `discuss-13fbc` for user profiles, calls and incoming invitations;
- `discussit-5879b` for friendship verification;
- `discuss-f1f56` for private-chat validation and final call logs.

Grant only the database access required by these projects. Do not place this service-account JSON in an env file. Save it to Vercel and delete the local copy after configuration.

Client database rules should permit a signed-in user to read only calls in which their UID is a participant and only `callInvites/{theirUid}`. Client writes to `calls` and `callInvites` should be denied because the Vercel backend owns those paths.

## LiveKit webhook

After the Vercel production deployment, add this URL in LiveKit Cloud and enable room/participant events:

```text
https://www.discussit.in/api/livekit-webhook
```

Use the same rotated API key/secret pair in LiveKit and Vercel. The webhook rejects unsigned or modified events.

## OneSignal and wrappers

- OneSignal users are linked to Firebase UID as `external_id` by the existing auth integration.
- The web SDK uses `/push/onesignal/OneSignalSDKWorker.js` with a dedicated scope; `/sw-push.js` continues handling the PWA shell.
- Incoming payloads include Median's `targetUrl`, so tapping a notification returns to the correct private conversation.
- Keep the Android notification channel at high importance with sound and vibration.
- Enable microphone permission and Background Audio in the Median wrapper when calls must continue outside the foreground.
- An installed iOS PWA can receive notifications and make calls, but iOS may suspend web apps. A guaranteed native system call overlay requires a future CallKit/native wrapper integration.

## Verification checklist

1. Friend A calls Friend B; B receives the in-app call screen and a background notification.
2. Non-friends, blocked conversations and users with calling disabled cannot connect.
3. Accept, decline, mute, output control, minimize/restore and leave work in light and dark themes.
4. Connected participants can invite friends until four active/invited people are present.
5. One participant leaving a multi-person call does not end the call for everyone else.
6. A centered call-history card shows status, participants, date/time and duration.
7. Group chats never show the phone control.
8. Only genuine LiveKit quota/capacity failures show the first-phase capacity message.
