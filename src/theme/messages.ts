/**
 * Friendly, clear copy for empty states, errors, and success.
 * Goal: Premium, safe, simple, trustworthy.
 */

export const messages = {
  // Empty states
  empty: {
    profileActivity: "Your posts, saved items, and likes will appear here.",
    feed: "When your community shares posts, announcements, or events, they'll show up here.",
    highlights: "No highlights right now.",
    generic: "Nothing here yet."
  },

  // Errors (friendly, actionable)
  error: {
    loadProfile: "We couldn't load your profile. Please try again.",
    loadFeed: "We couldn't load the feed. Pull down to try again.",
    generic: "Something went wrong. Please try again.",
    network: "Check your connection and try again."
  },

  // Success
  success: {
    profileUpdated: "Your profile has been updated.",
    saved: "Saved successfully."
  },

  // Critical actions (confirmations)
  confirm: {
    logoutTitle: "Log out?",
    logoutMessage: "You'll need to sign in again to access your account.",
    logoutConfirm: "Log out",
    logoutCancel: "Cancel"
  },

  // Sensitive data (trust)
  sensitive: {
    protected: "Protected",
    maskedHint: "Hidden for your privacy"
  }
};
