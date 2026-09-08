/**
 * Discuss Unified Verification System
 * 
 * Firebase Realtime Database user/profile verification state remains the canonical source of truth.
 * Dexie may cache it. An in-memory verified-user registry must never permanently override
 * newer RTDB state or cause stale verification.
 */

// In-memory cache with timestamps: Map<userId, { verified: boolean, updatedAt: number }>
const verifiedRegistry = new Map();
const listeners = new Set();
const REGISTRY_TTL_MS = 5 * 60 * 1000; // 5 minute TTL to prevent permanent stale override

export const notifyVerificationListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_) {}
  });
};

export const subscribeToVerificationChanges = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * Register verification status confirmed from RTDB or Dexie cache.
 * RTDB state is canonical and overrides any previous in-memory state.
 */
export const registerVerifiedUser = (userId, verified = true) => {
  if (!userId) return;
  const isVerified = verified === true || verified === 'true';
  const existing = verifiedRegistry.get(userId);
  const changed = !existing || existing.verified !== isVerified;

  verifiedRegistry.set(userId, {
    verified: isVerified,
    updatedAt: Date.now(),
  });

  if (changed) {
    notifyVerificationListeners();
  }
};

/**
 * Clear the in-memory cache (e.g. on logout or for testing)
 */
export const clearVerifiedRegistry = () => {
  verifiedRegistry.clear();
  notifyVerificationListeners();
};

export const isUserIdVerified = (userId) => {
  if (!userId) return false;
  const entry = verifiedRegistry.get(userId);
  if (!entry) return false;
  if (Date.now() - entry.updatedAt > REGISTRY_TTL_MS) {
    verifiedRegistry.delete(userId);
    return false;
  }
  return entry.verified;
};

/**
 * Normalizes verification status from any user object, post, comment, reply, or author record.
 * 
 * Hierarchy of truth:
 * 1. Explicit RTDB / profile verification flags on the entity itself are CANONICAL.
 * 2. If entity is a full user/profile object and verified is NOT true, it overrides and cleans any stale cache.
 * 3. Fall back to cached verifiedRegistry only for lightweight entity stubs where verification field is omitted.
 */
export const isUserVerified = (entity) => {
  if (!entity) return false;

  const entityId = entity.id || entity.userId || entity.author_id || entity.authorId || entity.uid;

  // 1. Check explicit false flags (RTDB canonical unverified)
  const hasExplicitFalse =
    entity.verified === false ||
    entity.verified === 'false' ||
    entity.author_verified === false ||
    entity.author_verified === 'false' ||
    entity.authorVerified === false ||
    entity.authorVerified === 'false' ||
    entity.isVerified === false ||
    entity.isVerified === 'false' ||
    entity.is_verified === false ||
    entity.is_verified === 'false';

  if (hasExplicitFalse) {
    if (entityId) {
      verifiedRegistry.set(entityId, { verified: false, updatedAt: Date.now() });
    }
    return false;
  }

  // 2. Check explicit true flags (RTDB canonical verified)
  const hasExplicitTrue =
    entity.verified === true ||
    entity.verified === 'true' ||
    entity.author_verified === true ||
    entity.author_verified === 'true' ||
    entity.authorVerified === true ||
    entity.authorVerified === 'true' ||
    entity.isVerified === true ||
    entity.isVerified === 'true' ||
    entity.is_verified === true ||
    entity.is_verified === 'true';

  if (hasExplicitTrue) {
    if (entityId) {
      verifiedRegistry.set(entityId, { verified: true, updatedAt: Date.now() });
    }
    return true;
  }

  // 3. If the entity is an authoritative user/profile record (from RTDB `users/{uid}` or Dexie cache)
  // that contains user profile fields (like email, username, bio, or photo_url) and verified is NOT true,
  // then RTDB canonical state is UNVERIFIED. An in-memory cache must NEVER override newer RTDB state.
  const isAuthoritativeUserProfile =
    (entity.email !== undefined || entity.bio !== undefined || entity.auth_provider !== undefined) &&
    (entity.username !== undefined || entity.fullName !== undefined);

  if (isAuthoritativeUserProfile) {
    if (entityId) {
      verifiedRegistry.set(entityId, { verified: false, updatedAt: Date.now() });
    }
    return false;
  }

  // 4. Nested user or author object
  if (entity.author && typeof entity.author === 'object') {
    if (isUserVerified(entity.author)) return true;
  }
  if (entity.user && typeof entity.user === 'object') {
    if (isUserVerified(entity.user)) return true;
  }

  // 5. Fallback to cached registry for stubs (e.g. bare ID or partial notifications)
  if (entityId) {
    const entry = verifiedRegistry.get(entityId);
    if (entry && Date.now() - entry.updatedAt <= REGISTRY_TTL_MS) {
      return entry.verified;
    }
  }

  return false;
};
