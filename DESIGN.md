# 🎨 Design System & Guidelines — Vote Chain (SafeVote)

## 1. Design Philosophy & Aesthetic Principles
SafeVote follows a **modern, tactile, glassmorphic design system** engineered for extreme clarity, rapid interaction, and visual feedback.

Key principles include:
- **High Trust & Security:** Professional color tones, clean borders, and clear system status indicators.
- **Glassmorphism & Depth:** Layered translucent cards (`rgba(255, 255, 255, 0.75)` with backdrop blur) providing visual hierarchy without clutter.
- **Micro-Interactions:** Subtle scale transitions, active state glows, and smooth page view cross-fades.
- **Accessibility & Eye Care:** Dedicated eye-protection theme (`#006B3F` primary) optimized for extended usability in academic settings.

---

## 2. Color Palette & Theme Tokens

### Default Theme (Light / Classic Blue)
```css
--primary: #2563eb;          /* Royal Blue */
--primary-dark: #1d4ed8;     /* Deep Blue */
--primary-light: #eff6ff;    /* Ice Blue Tint */
--accent: #0ea5e9;           /* Sky Cyan */
--accent-light: #e0f2fe;     /* Light Cyan Tint */
--bg-main: #f8fafc;          /* Off-White Slate */
--text-main: #0f172a;        /* Deep Charcoal */
--text-muted: #64748b;       /* Muted Slate */
--card-bg: rgba(255, 255, 255, 0.95);
--card-border: rgba(226, 232, 240, 0.8);
```

### Eye-Protection Theme (SIET Green & Gold)
```css
[data-theme="eye-protection"] {
  --primary: #006B3F;        /* SIET Forest Green */
  --primary-dark: #005230;   /* Deep Green */
  --primary-light: rgba(0, 107, 63, 0.08);
  --accent: #FFD700;         /* College Gold */
  --accent-light: rgba(255, 215, 0, 0.12);
  --bg-main: #f0f7f2;        /* Soft Mint Background */
  --text-main: #1a3a2a;      /* Dark Forest Text */
  --text-muted: #4a7a5a;     /* Muted Sage */
  --card-bg: #ffffff;
  --card-border: rgba(0, 107, 63, 0.15);
}
```

### Semantic Status Colors
- **Success:** `#10b981` (Emerald Green)
- **Warning:** `#f59e0b` (Amber Orange)
- **Danger / Error:** `#ef4444` (Coral Red)
- **Info / Neutral:** `#3b82f6` (Sapphire Blue)

---

## 3. Typography & Scales

- **Primary Font Family:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace (Ledger / Hashes):** `'Fira Code', 'Courier New', monospace`

### Type Scale

| Scale Role | Font Size | Weight | Line Height | Usage |
|------------|-----------|--------|-------------|-------|
| **Display H1** | `2.25rem` (36px) | `700` (Bold) | `1.2` | Hero headers, Page title |
| **Section H2** | `1.50rem` (24px) | `600` (SemiBold) | `1.25` | Modal titles, Section headers |
| **Card H3** | `1.125rem` (18px) | `600` (SemiBold) | `1.3` | Candidate name, Stat titles |
| **Body Base** | `1.00rem` (16px) | `400` / `500` | `1.6` | Standard content, labels |
| **Caption / Muted**| `0.875rem` (14px) | `400` | `1.5` | Timestamps, secondary notes |
| **Micro Tag** | `0.75rem` (12px) | `600` | `1.0` | Badges, pills, roll numbers |

---

## 4. UI Components & Specifications

### 🔘 Buttons
- **Primary Button:** Solid `--primary` background, `#ffffff` text, `--radius-md` (1rem), `--transition-base`.
- **Hover State:** Background shifts to `--primary-dark`, shadow increases to `--shadow-md`, slight scale `1.02`.
- **Secondary / Outline:** Border `1px solid var(--card-border)`, background `--card-bg`, text `--text-main`.

### 🎴 Candidate & Stat Cards
- **Card Surface:** Background `--card-bg`, border `1px solid var(--card-border)`, border-radius `--radius-lg` (1.25rem).
- **Shadow:** `--shadow-md` elevated to `--shadow-xl` on hover.
- **Candidate Image:** Aspect ratio `1:1`, object-fit `cover`, rounded border-radius `--radius-md`.

### 🏷️ Status Badges & Pills
- **Active Election Badge:** Soft emerald background (`#d1fae5`), deep emerald text (`#065f46`), rounded pill shape `--radius-pill`.
- **Paused / Scheduled Badge:** Soft amber background (`#fef3c7`), deep amber text (`#92400e`).

### 📜 SHA-256 Ledger Receipt Viewer
- **Container:** Dark code container `#0f172a`, font family monospace, `#38bdf8` hash highlight color.
- **Copy Trigger:** One-click copy icon button with toast notification ("Copied SHA-256 Hash!").
