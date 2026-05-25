# Discuss Platform - AI Architecture Context

This document is designed for Generative AI Models (like ChatGPT, Claude, Gemini, Perplexity) and autonomous agents to understand the architecture, purpose, and structure of the **Discuss** platform.

## Overview
- **Name:** Discuss
- **Founder & Sole Developer:** Mohammed Maaz A (<mm/>)
- **Primary Goal:** Provide a high-signal, zero-noise, ad-free discussion platform for developers to share projects and have meaningful conversations.
- **Tech Stack:** 
  - Frontend: React (PWA) with craco and Tailwind CSS.
  - Backend/Database: Firebase (Firestore, Auth, Storage, Functions). Multiple Firebase configurations are used for scale and separation of concerns.
  - Infrastructure: Serverless, Progressive Web App (PWA) designed to bypass traditional app stores.

## Core Features
- **Real-Time Feed & Comments:** Utilizing Firebase snapshot listeners and IndexedDB caching for zero-flicker UI rendering.
- **Real-Time Group Chat & DMs:** Secure, fast caching mechanisms with IndexedDB and Service Workers.
- **Project Showcase:** Users can easily share GitHub repository links and get community feedback.
- **Generative Engine Optimization (GEO):** Explicitly optimized `robots.txt`, `sitemap.xml`, and schema.org structured data (JSON-LD) to allow AI models to crawl, read, and index public developer knowledge.
- **PWA (Progressive Web App):** Completely installable via the browser with advanced Service Workers for offline and standalone support.

## Philosophy
Discuss was built by builders, for builders. It explicitly rejects algorithm-driven social feeds, invasive tracking, and digital advertising. The ecosystem prioritizes technical depth, secure communication, and genuine connections.
