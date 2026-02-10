# YouTube Comments with Gemini

<p align="center">
  <img src="src/icons/icon128.png" alt="YouTube Comments with Gemini" width="128" height="128">
</p>

<p align="center">
  <strong>A Chrome extension that analyzes YouTube video comments with Gemini AI to reveal true viewer sentiment and insights</strong>
</p>

<p align="center">
  English ・ <a href="README.md">日本語</a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Vite-6-purple.svg" alt="Vite">
  <img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest V3">
</p>

---

## Overview

"YouTube Comments with Gemini" is a Chrome extension that automatically analyzes YouTube video comments using Google Gemini AI, providing sentiment analysis, summaries, and deep-dive insights. It supports both regular videos and YouTube Shorts.

Instantly analyze thousands of comments to reveal viewer sentiment and trending topics. No API key setup required for end users — simply sign in with your Google account and use credits.

## Key Features

### AI Analysis

- **Overall Summary** — AI-generated natural language summary of comment trends
- **Sentiment Analysis** — Positive / Neutral / Negative ratios displayed as a pie chart
- **Topic Extraction** — Automatically identifies frequently discussed topics
- **Deep Dive Analysis** — Gemini selects representative comments for each sentiment category with reasoning
- **Hidden Gems** — Discovers valuable comments with low like counts
- **Character Mode** — Yu-chan (elite detective persona) rewrites summaries in her voice; Geminny-chan (AI fairy) provides deep-dive commentary (switches to sharp-tongued sarcasm mode for negative analysis)

### Comment Viewer

- **YouTube-style Thread View** — Browse parent comments and replies in thread format
- **Sorting** — Sort by popularity, likes, or date posted
- **Search** — Real-time search by comment text or author name
- **Relative Time Display** — Natural time formats like "3 days ago", "2 months ago"
- **Profile Images** — Displays commenter profile pictures

### Supported Content

- **Regular Videos** — YouTube watch pages (`/watch?v=...`)
- **YouTube Shorts** — Short-form videos (`/shorts/...`)
- **URL Paste** — Paste any YouTube URL in the side panel or popup to start analysis
- **Up to 10,000 Comments** — Fetch and analyze large volumes of comments

### User Interface

- **Side Panel** — Displays results on the right side of the browser (main interface)
- **Popup** — Click the extension icon for authentication and quick analysis
- **Content Script** — Automatically injects a Yu-chan icon analysis button into YouTube comment headers (3 face expressions + quotes rotate randomly)
- **Open in New Window** — Pop out the analysis results into a standalone window with full state preservation
- **Settings** — Accordion-style settings UI within the side panel

### Customization

- **Multilingual** — Japanese / English toggle (entire UI + Gemini analysis results)
- **Themes** — 3 background modes: Light / Dark Blue / Black
- **Font Size** — 5 levels from 13px to 18px
- **Analysis History** — Save up to 30 past analysis results for later review
- **Import/Export Settings** — Backup and restore settings in JSON format
- **Social Sharing** — Share via X / Instagram / URL copy (available in both side panel and popup)

### Authentication & Credits

- **Google Account Auth** — Secure OAuth via Chrome Identity API
- **Credit-based Usage** — 2 credits per analysis
- **Server-side API Key Management** — No API key setup required for users
- **Credit Purchase & Subscriptions** — Available from the settings page
- **Credit Batch System** — Subscription credits have a 90-day expiry (FIFO consumption); one-time purchases and initial free credits never expire
- **Expiry Warnings** — Settings page shows warnings when credits expire within 30 or 7 days

## Tech Stack

### Frontend (Chrome Extension)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI Components |
| TypeScript | 5.6 | Type-safe Development |
| Tailwind CSS | 3.4 | Styling |
| Zustand | 5.0 | State Management |
| Vite | 6.0 | Build Tool |
| Lucide React | 0.460 | Icon Library |
| @formkit/auto-animate | - | Animations |
| Chrome Extension | Manifest V3 | Extension Platform |

### Backend (API Server)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.18 | HTTP Server |
| @google/generative-ai | 0.21 | Gemini AI Analysis |
| YouTube Data API | v3 | Comment Fetching |
| google-auth-library | 9.4 | OAuth Authentication |
| jsonwebtoken | 9.0 | Session Management |
| bcrypt | 5.1 | Password Hashing |
| cors | 2.8 | CORS Support |
| dotenv | 16.3 | Environment Variables |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension (Frontend)                        │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐     │
│  │  Popup    │  │ SidePanel │  │ ContentScript│     │
│  │  (Auth)   │  │ (Results) │  │  (Button)    │     │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘     │
│        │              │               │             │
│        └──────────┬───┘───────────────┘             │
│                   │                                 │
│  ┌────────────────┴─────────────────┐               │
│  │      Background Service Worker   │               │
│  │  (Message relay & SidePanel open)│               │
│  └────────────────┬─────────────────┘               │
└───────────────────┼─────────────────────────────────┘
                    │ HTTPS (api.keigoly.jp)
┌───────────────────┼─────────────────────────────────┐
│  Express API Server (Backend)                       │
│                   │                                 │
│  ┌────────────────┴─────────────────┐               │
│  │          API Endpoints           │               │
│  │  /api/auth/google  /api/analyze  │               │
│  │  /api/auth/verify  /api/video    │               │
│  │  /api/user/credits /api/billing  │               │
│  └──┬──────────┬──────────┬─────────┘               │
│     │          │          │                         │
│  ┌──┴───┐  ┌──┴────┐  ┌──┴──────┐                  │
│  │Google│  │YouTube│  │ Gemini  │                   │
│  │OAuth │  │API v3 │  │  API    │                   │
│  └──────┘  └───────┘  └─────────┘                   │
└─────────────────────────────────────────────────────┘
```

### Analysis Flow

```
1. User initiates analysis
2. Frontend → POST /api/analyze (videoId, language)
3. Server: Auth check → Credit check → Cost limit check
4. Server: Fetch comments via YouTube API (up to 2,000)
5. Server: Flatten comment threads (parent + replies)
6. Server: AI analysis via Gemini API
7. Server: Deduct credits → Log usage
8. Response: Analysis result + comments → Frontend
9. Display results in side panel across 3 tabs
```

## Directory Structure

```
YouTube Comment Analyzer/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── Popup.tsx             # Popup UI
│   │   ├── SidePanel.tsx         # Side panel UI (main screen)
│   │   ├── ResultDashboard.tsx   # Analysis result dashboard
│   │   ├── LoadingView.tsx       # Loading/progress display
│   │   ├── SettingsView.tsx      # Settings (accordion-style)
│   │   ├── Auth.tsx              # Google auth UI
│   │   └── tabs/                 # Result tab components
│   │       ├── SummaryTab.tsx    # Summary, sentiment, topics
│   │       ├── DeepDiveTab.tsx   # Gemini deep dive analysis
│   │       └── CommentsTab.tsx   # Comment list (thread view)
│   ├── store/                    # Zustand state stores
│   │   ├── analysisStore.ts      # Analysis state (progress, result, error)
│   │   ├── designStore.ts        # Design settings (theme, font)
│   │   └── characterStore.ts     # Character mode (with conversion cache)
│   ├── services/                 # Frontend services
│   │   ├── apiServer.ts          # Backend API client
│   │   └── historyStorage.ts     # Analysis history (localStorage)
│   ├── i18n/                     # Internationalization
│   │   ├── translations.ts       # Translation dictionary (ja/en, 200+ keys)
│   │   └── useTranslation.ts     # useTranslation() hook
│   ├── utils/                    # Utility functions
│   │   └── youtube.ts            # YouTube URL parsing & video ID extraction
│   ├── constants/                # Constants (API endpoints, etc.)
│   ├── content/                  # Content script
│   │   └── content.ts            # Injects analysis button on YouTube
│   ├── icons/                    # Icon resources
│   ├── background.js             # Service Worker
│   ├── manifest.json             # Chrome extension manifest (V3)
│   └── styles.css                # Tailwind + global styles
├── server/                       # Backend API server
│   ├── index.js                  # Express main server
│   ├── services/                 # Server service layer
│   │   ├── geminiService.js      # Gemini AI analysis (auto model selection, character rewriting)
│   │   ├── youtubeService.js     # YouTube API integration (comment fetching)
│   │   ├── extFetcherService.js  # Alternative comment fetching
│   │   └── costManager.js        # API cost management
│   ├── .env.example              # Environment variable template
│   └── package.json              # Backend dependencies
├── dist/                         # Build output (load as Chrome extension)
├── vite.config.ts                # Vite build config
├── tailwind.config.js            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config (strict)
└── package.json                  # Frontend dependencies
```

## Setup

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Google Cloud Console** account (for API keys)
- **Chrome** browser

### 1. Clone the Repository

```bash
git clone https://github.com/keigoly/youtube-comment-gemini.git
cd youtube-comment-gemini
```

### 2. Frontend Setup

```bash
npm install
```

### 3. Backend Setup

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the required values.

```bash
cp server/.env.example server/.env
```

```env
# === Required ===
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret

# === Optional ===
NODE_ENV=development                 # development | production
USE_ALTERNATIVE_FETCH=false           # Enable alternative method for comment fetching
ALTERNATIVE_FETCH_FALLBACK=false     # Fallback to alternative method on YouTube API failure
MONTHLY_COST_LIMIT=1000              # Monthly API cost limit (JPY)
DEVELOPER_COMMISSION_RATE=0.30       # Developer commission rate
```

### 5. Obtain API Keys

#### Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Credentials" > "Create OAuth 2.0 Client ID"
4. Application type: Select "Chrome App"
5. Set the Client ID as `GOOGLE_CLIENT_ID`

#### YouTube Data API Key

1. Enable "YouTube Data API v3" in Google Cloud Console
2. Go to "Credentials" > "Create API Key"
3. Set it as `YOUTUBE_API_KEY`

#### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Create API Key" to generate a key
3. Set it as `GEMINI_API_KEY`

### 6. Build and Run

```bash
# Build the frontend
npm run build

# Start the backend (in a separate terminal)
cd server
npm run dev
```

### 7. Install as Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

## Usage

### Basic Analysis Flow

1. **Sign in with Google** — Via popup or side panel
2. **Open a YouTube video** — Regular video or Shorts
3. **Start analysis** — Using any of these methods:
   - Click the rainbow button in the comment header
   - Click the analysis button in the side panel
   - Paste a URL and click the analysis button
4. **View results** — Results are displayed in the side panel across 3 tabs

### Result Tabs

| Tab | Content |
|-----|---------|
| **Summary** | Overall summary, sentiment pie chart, main topics |
| **Deep Dive** | Representative comments selected by Gemini (positive/neutral/negative) with reasoning |
| **Comments** | All comments in thread format with search and sorting |

### Working with Results

- **Save** — Save to history from the menu (up to 20 entries)
- **Copy** — Copy the summary to clipboard
- **Export** — Download all data as JSON
- **History** — Re-view past analyses from the settings page

## Credit System

| Item | Value |
|------|-------|
| Cost per analysis | 2 credits |
| Initial credits (development) | 999 credits |
| Initial credits (production) | 100 credits |
| Max credits | 9,999 credits |
| Credit expiration | Never |

### Purchase Plans

| Plan | Credits | Price |
|------|---------|-------|
| 100 Credits | 100 | ¥500 |
| 500 Credits | 500 | ¥2,000 (20% off) |
| Monthly Sub | 1,000/month | ¥3,000/month |

## AI Analysis Models

Gemini API models are automatically selected in the following priority:

| Priority | Model | Characteristics |
|----------|-------|-----------------|
| 1 (Recommended) | gemini-2.5-flash-lite | Most cost-efficient |
| 2 | gemini-2.5-flash | Fallback on rate limits |
| 3 | gemini-2.0-flash | Final fallback |

The system automatically switches to the next model on rate limits (429) or service errors (503).

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/google` | Google OAuth authentication | None |
| GET | `/api/auth/verify` | Session verification | Bearer Token |
| GET | `/api/user/credits` | Get credit balance | Bearer Token |
| GET | `/api/video/info` | Video info (title, comment count) | None |
| POST | `/api/analyze` | Comment analysis (main feature) | Bearer Token |
| POST | `/api/billing/purchase` | Purchase credits (legacy) | Bearer Token |
| POST | `/api/billing/create-checkout-session` | Create Stripe checkout session | Bearer Token |
| POST | `/api/billing/webhook` | Stripe webhook receiver | Stripe Signature |
| POST | `/api/character/rewrite` | Character mode rewrite | Bearer Token |
| GET | `/health` | Health check | None |

## Production Deployment

### Infrastructure

```
User (Chrome Extension)
    │
    │ HTTPS
    ▼
┌─────────────────────────────┐
│  Cloudflare DNS             │
│  api.keigoly.jp → A Record  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  AWS Lightsail (ap-northeast-1)         │
│  Ubuntu / 512MB RAM / 2 vCPU            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy)            │  │
│  │  Let's Encrypt SSL Certificate    │  │
│  │  :443 → localhost:3000            │  │
│  └──────────────┬────────────────────┘  │
│                 │                       │
│  ┌──────────────┴────────────────────┐  │
│  │  Node.js / Express (PM2 managed)  │  │
│  │  PORT=3000                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Server Stack

| Component | Details |
|-----------|---------|
| Cloud | AWS Lightsail (Tokyo region) |
| OS | Ubuntu |
| Web Server | Nginx (reverse proxy + SSL termination) |
| SSL Certificate | Let's Encrypt (auto-renewal) |
| Process Manager | PM2 |
| Domain | api.keigoly.jp |
| DNS | Cloudflare (DNS only) |

### Deployment Steps

#### 1. Server Setup

```bash
# Install Nginx & Certbot
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx
sudo nano /etc/nginx/sites-available/urayomi
```

```nginx
server {
    listen 80;
    server_name api.keigoly.jp;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable & obtain SSL certificate
sudo ln -s /etc/nginx/sites-available/urayomi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d api.keigoly.jp
```

#### 2. Start Application

```bash
cd ~/THE-REAL-TALK-Powerd-by-Gemini/server
npm install
pm2 start index.js --name urayomi-server
pm2 save
pm2 startup
```

#### 3. Production Environment Variables

Set the following in `server/.env`:

```env
PORT=3000
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
DEVELOPER_COMMISSION_RATE=0.30
ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_jwt_secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_30=price_xxxxx
STRIPE_PRICE_60=price_xxxxx
STRIPE_PRICE_150=price_xxxxx
STRIPE_PRICE_LITE=price_xxxxx
STRIPE_PRICE_STANDARD=price_xxxxx
```

### Stripe Payment Integration

The production environment supports credit purchases and subscriptions via Stripe.

#### Payment Flow

```
1. User selects a plan from the settings page
2. Frontend → POST /api/billing/create-checkout-session
3. Server: Creates a Stripe Checkout Session
4. User: Redirected to Stripe-hosted payment page
5. Payment complete → Stripe Webhook → POST /api/billing/webhook
6. Server: Verify signature → Grant credits → Record revenue
7. Frontend: Polls for credit updates
```

#### Stripe Webhook Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks
2. Endpoint URL: `https://api.keigoly.jp/api/billing/webhook`
3. Events to listen for: `checkout.session.completed`
4. Set the signing secret as `STRIPE_WEBHOOK_SECRET` on the server

#### Firewall Rules (AWS Lightsail)

| Application | Protocol | Port |
|-------------|----------|------|
| SSH | TCP | 22 |
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |
| Custom | TCP | 3000 |

## Development

### Development Mode

```bash
# Frontend (watch mode build)
npm run build:watch

# Backend (hot reload)
cd server
npm run dev
```

### Build Commands

```bash
# TypeScript type check + production build
npm run build

# Preview
npm run preview
```

### Adding Translations

When adding new UI text:

1. Add both `ja` and `en` keys in `src/i18n/translations.ts`
2. Call `const { t } = useTranslation()` in the component
3. Replace hardcoded strings with `t('key.name')`
4. For server-side messages, use the `language` parameter for conditional text

## Troubleshooting

### Cannot connect to server

→ Make sure the backend server is running:
```bash
cd server && npm run dev
```
→ Verify `VITE_API_BASE_URL` is set to `http://localhost:3000` in `.env`

### Insufficient credits

→ Purchase credits from "Credit Management" in the settings page.

### Gemini API errors

→ Verify `GEMINI_API_KEY` is correctly set
→ Check that the key is active in [Google AI Studio](https://aistudio.google.com/)
→ Rate-limited requests will automatically fall back to alternative models

### Cannot fetch comments

→ Verify `YOUTUBE_API_KEY` is valid and YouTube Data API v3 is enabled
→ Comments cannot be fetched from videos with comments disabled
→ Live stream chats are not available as comments

### Extension not working

→ Ensure the `dist` folder has the latest build
→ Reload the extension in `chrome://extensions`
→ Check for error messages in the console (F12)

## License

MIT License

## Author

**keigoly**

- Web: [keigoly.jp](https://keigoly.jp/)
- GitHub: [keigoly](https://github.com/keigoly)

## Links

- [README (Japanese)](README.md)
- [Privacy Policy (Japanese)](PRIVACY.md)
- [Privacy Policy (English)](PRIVACY_EN.md)
- [Report a Bug](https://docs.google.com/forms/d/e/1FAIpQLSeUlF5s7vgcG0RrISNrAwLKhMQTvJpndH8e31Z_WHF081McEA/viewform)
- [Source Code](https://github.com/keigoly/youtube-comment-gemini)
