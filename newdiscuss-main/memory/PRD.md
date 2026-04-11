# Discuss - Developer Discussion Platform

## Architecture (Serverless)
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Database**: Firebase Realtime Database (direct from frontend)
- **Auth**: Firebase Authentication (Email + Google)
- **Offline**: IndexedDB caching

## What's Been Implemented
- [x] Converted to direct Firebase (no backend)
- [x] Removed Python/Render dependency
- [x] Added mobile zoom disable
- [x] Fixed npm dependency conflicts
- [x] YouTube-style voting system (up/down, separate counts)
- [x] Real-time posts, comments, votes
- [x] Google and email authentication
- [x] Account creation restricted to unique emails
- [x] Admin toggles for signup and forgot password
- [x] Terms & Conditions modal with scroll-to-accept
- [x] Custom footer "Developed by Mohammed Maaz A"
- [x] PWA "Add to Home Screen" banner (shows once)
- [x] Animated loading screens
- [x] Share modal (sanitized)
- [x] Secure logout (clears history, redirects to landing)
- [x] Trending hashtags (Top 4)
- [x] Link highlighting + External Link Warning Modal
- [x] Admin Message Box banner
- [x] Custom `<discuss>` text logo globally
- [x] Unlimited posts in feed (confirmed no limits exist)

## Core Features
- Email/password and Google auth
- Discussion posts and project showcases
- Real-time voting (YouTube-style up/down)
- Real-time comments
- Hashtag support + Trending (Top 4)
- Offline caching with IndexedDB
- PWA support
- Admin controls (signup toggle, forgot password toggle, message banner)
- External link safety warnings
- Search by title, content, author, hashtag

## Deployment
- Frontend only to Netlify/Vercel
- Firebase env vars required
- Add domain to Firebase Authorized Domains

## Firebase Config
- Project: discuss-13fbc
- Database: https://discuss-13fbc-default-rtdb.firebaseio.com

## Backlog
- P0: Firebase Email Link Verification (passwordless auth flow, redirect to https://dsscus.netlify.app/)
