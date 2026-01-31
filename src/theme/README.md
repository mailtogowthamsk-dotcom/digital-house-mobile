# Digital House – Premium Theme

Centralized theme for a **clean, neat, modern, trust-oriented** social app.

## Design rules

- **No cluttered screens** – proper spacing & padding
- **Consistent color theme** – use `colors` from this theme
- **Clear typography** – use `typography` for hierarchy
- **Sensitive data** – use `colors.sensitive`, `colors.sensitiveBg`; show lock icons and "Protected" where data is masked
- **Status indicators** – use `colors.statusPending`, `statusApproved`, `statusRejected` (or `StatusBadge` component)
- **Friendly copy** – use `messages` for empty states, errors, success, confirmations

## Exports

- `colors` – brand, surfaces, text, status, sensitive
- `typography` – hero, h1–h3, body, caption, label, button
- `spacing`, `radius` – layout scale
- `messages` – empty, error, success, confirm, sensitive
- `theme` – single object with all of the above

## UX principles

- Important actions should be obvious (primary CTAs)
- Sensitive data should look protected (lock icons, Protected badge)
- Confirmation dialogs for critical actions (e.g. logout)
- Clear status indicators (pending, approved, rejected)
