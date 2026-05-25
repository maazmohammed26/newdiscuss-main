# Discuss - Developer Discussion Platform

A modern real-time discussion platform for developers. Built with React and Firebase (no backend server needed!).

## 🎨 New: Discuss Theme!

Experience our brand new **retro terminal-style theme** featuring:
- Classic green-on-black color scheme
- Square edges throughout (no rounded corners)
- Monospace font (Roboto Mono)
- Retro button shadows with press effects
- Authentic terminal aesthetic

Switch themes anytime from your Profile page! Choose between Light, Dark, or the new Discuss theme.

## Architecture

```
Frontend (React) ──► Firebase Auth (Authentication)
                 ──► Firebase Realtime Database (Data)
                 ──► IndexedDB (Offline Cache)
```

**No backend server required!** Everything runs directly from Firebase.

## Deployment

### Deploy to Netlify

1. Go to [netlify.com](https://app.netlify.com) → Import repo
2. **Base directory**: `frontend`
3. **Build command**: `yarn build`
4. **Publish directory**: `frontend/build`
5. **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `REACT_APP_FIREBASE_API_KEY` | AIzaSyAHjarX3OLHRw7kqvFh_8GsTnqsyl9vg9c |
   | `REACT_APP_FIREBASE_AUTH_DOMAIN` | discuss-13fbc.firebaseapp.com |
   | `REACT_APP_FIREBASE_DATABASE_URL` | https://discuss-13fbc-default-rtdb.firebaseio.com |
   | `REACT_APP_FIREBASE_PROJECT_ID` | discuss-13fbc |
   | `REACT_APP_FIREBASE_STORAGE_BUCKET` | discuss-13fbc.firebasestorage.app |
   | `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | 922676469024 |
   | `REACT_APP_FIREBASE_APP_ID` | 1:922676469024:web:1c81d8dfc6a914d9d2cb45 |
6. Click **Deploy**

### Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → Import repo
2. **Root Directory**: Click "Edit" → type `frontend`
3. **Framework Preset**: `Create React App`
4. Add all environment variables (same as Netlify above)
5. Click **Deploy**

### After Deployment

Add your deployed domain to Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Authentication → Settings → Authorized domains
4. Add your Netlify/Vercel domain

## Local Development

```bash
cd frontend
yarn install
yarn start
```

## Features

- **Email/Password Authentication** - Register and login with email
- **Google Sign-In** - One-click Google authentication
- **Discussion Posts** - Share thoughts and ideas
- **Project Showcase** - Share projects with GitHub links and live previews
- **Real-time Voting** - Upvote/downvote posts (minimum score: 0)
- **Comments** - Real-time comments on posts
- **Hashtags** - Tag posts and search by hashtags
- **Offline Support** - IndexedDB caching for offline access
- **Mobile Optimized** - Zoom disabled for better mobile UX
- **🆕 Multiple Themes** - Choose from Light, Dark, or retro Discuss theme
- **🆕 Modal Editing** - Edit posts and projects in a clean modal interface
- **🆕 Enhanced SEO** - Complete meta tags, structured data, and sitemap for better search visibility

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Database**: Firebase Realtime Database
- **Auth**: Firebase Authentication (Email + Google)
- **Offline**: IndexedDB via idb library
- **Themes**: 3 theme options (Light, Dark, Discuss)
- **Fonts**: Inter, DM Sans, Roboto Mono
- **PWA Ready**: Service worker support
- **SEO**: Comprehensive meta tags, structured data, sitemap

## Firebase Security Rules

For production, set these rules in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "users": {
      ".indexOn": ["email"],
      "$uid": {
        ".read": true,
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "posts": {
      ".indexOn": ["timestamp", "author_id"],
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "comments": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "votes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## SEO & Search Console

For comprehensive SEO setup and Google Search Console integration, see:
- **[GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md)** - Complete guide for verification and optimization
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Detailed feature documentation

### Quick SEO Features:
- Complete meta tags (Open Graph, Twitter Cards)
- Structured data (JSON-LD) for Organization and WebApplication
- Optimized sitemap.xml with image tags
- Robots.txt configured for all major crawlers and AI bots
- Mobile-optimized with proper viewport settings
- PWA-ready with manifest and service worker
- Performance-optimized with font preconnects

## License
MIT
