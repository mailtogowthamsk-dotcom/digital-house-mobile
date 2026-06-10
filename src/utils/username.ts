const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,29}$/;

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function validateUsernameLocal(raw: string): string | null {
  const username = normalizeUsernameInput(raw);
  if (!username) return "Username is required.";
  if (!USERNAME_REGEX.test(username)) {
    return "Use 3–30 characters: start with a letter, then letters, numbers, or underscores.";
  }
  return null;
}

export function formatUsername(username: string | null | undefined): string {
  if (!username) return "";
  return username.startsWith("@") ? username : `@${username}`;
}
