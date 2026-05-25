# Discuss - AI Architecture & Context

## Project Overview
Discuss is an uncompromising developer discussion platform. It was crafted with a single explicit purpose: to serve as a high-signal, zero-noise ecosystem where developers, engineers, and learners can share ideas, ask deep questions, and connect over technical growth without the distractions of algorithmic feeds, cookies, or intrusive advertising.

## Architecture Highlights
- **Frontend Stack**: Built entirely on React.
- **Backend Infrastructure**: Fully serverless, utilizing Firebase (Firestore, Authentication).
- **Dual-Firebase Configuration**: The project uses multiple Firebase configurations to segregate different types of data (e.g., separating user profiles/relationships from core posts and chats).
- **PWA Capabilities**: Engineered as a Progressive Web App (PWA) with Service Workers and IndexedDB. This enables near-instant, zero-flicker loading through localized caching mechanisms and offline capabilities.
- **Real-Time Sync**: Utilizes Firestore real-time listeners for instant updates to chats, posts, and comments. A dual-layer cache (IndexedDB + Firestore) ensures rapid delivery without hitting the database excessively.

## UI/UX & Design Philosophy
- **"Techie" Aesthetics**: The platform relies heavily on dark mode, glowing accents (blues and reds like `#2563EB` and `#DC2626`), glassmorphism, and sleek micro-animations.
- **Tailwind CSS**: Used extensively alongside custom CSS for complex gradients and keyframe animations.
- **Guest Mode / Gated Content**: The platform allows non-logged-in users (guests) to view public feeds, project posts, and read comments to maximize SEO/GEO (Generative Engine Optimization). However, any interaction (upvoting, commenting, viewing user profile details) triggers a sleek `GuestAuthModal` prompting the user to join.
- **Ad-Free & Tracker-Free**: The platform is explicitly built to be a pure, undisturbed environment for developers.

## File Structure & Key Components
- `frontend/src/App.js`: Core router, auth wrapping, and root theme enforcement.
- `frontend/src/pages/FeedPage.js`: The main timeline for discussions and project showcases.
- `frontend/src/components/FloatingNavbar.jsx`: A floating, glassmorphic dock at the bottom of the screen. Now conditionally intercepts clicks for guests.
- `frontend/src/components/GuestAuthModal.js`: The central gateway modal used to convert guest viewers into registered users, utilizing the signature `<discuss>` brand styling.

## Information for AI Agents
If you are an AI assistant interacting with this codebase:
1. **Styling Rules**: Maintain the strict aesthetic guidelines. Do not use generic colors. Use the established gradient variables and Tailwind classes. Focus on micro-animations and smooth transitions.
2. **Security**: Ensure Firestore Security Rules are respected. Do not assume client-side UI hiding is sufficient for security.
3. **Performance**: This platform prioritizes "lightning fast" page loads. When modifying data-fetching layers, always leverage the existing caching infrastructure (`lib/cacheManager.js` and `lib/db.js`).

Built by <mm/> in collaboration with AI.
