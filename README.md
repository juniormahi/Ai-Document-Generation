# 🚀 MYDOCMAKER: THE ULTIMATE AI PRODUCTIVITY ENGINE -Updated

<div align="center">
  <img src="src/assets/logo.png" alt="MyDocMaker Logo" width="120" />
  
  **MYDOCMAKER** is an elite, all-in-one AI ecosystem designed to automate professional workflows. By leveraging the power of **Google Gemini API** and **ElevenLabs**, it empowers users to transform complex ideas into high-quality documents, data, and media in seconds.

  🔗 **LIVE PLATFORM**: [MYDOCMAKER.LOVABLE.APP](https://mydocmaker.lovable.app)

  [![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)](https://firebase.google.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
</div>

---

> [!CAUTION]
> ## 📢 PROJECT FUNDING STATUS
> **MYDOCMAKER** was developed as a high-performance SaaS prototype but was **NOT officially published/launched** to the public market due to a **LACK OF EXTERNAL FUNDING**.
> 
> I am now open-sourcing the codebase to showcase the technical architecture and the power of a unified AI workspace. I am actively seeking **collaborators** or **investors** to take MYDOCMAKER to the next level.

---

## 📸 SCREENSHOTS

### Dashboard
<img src="public/screenshots/dashboard.png" alt="Dashboard" width="100%" />

### AI Tools Overview
<img src="public/screenshots/tools-overview.png" alt="AI Tools" width="100%" />

### Document Generator
<img src="public/screenshots/document-generator.png" alt="Document Generator" width="100%" />

### Presentation Maker
<img src="public/screenshots/presentation-maker.png" alt="Presentation Maker" width="100%" />

### Spreadsheet Generator
<img src="public/screenshots/spreadsheet-maker.png" alt="Spreadsheet Generator" width="100%" />

### AI Image Generator
<img src="public/screenshots/image-generator.png" alt="Image Generator" width="100%" />

### AI Video Generator
<img src="public/screenshots/video-generator.png" alt="Video Generator" width="100%" />

### Chat with PDF
<img src="public/screenshots/chat-pdf.png" alt="Chat PDF" width="100%" />

---

## 🛠️ THE MYDOCMAKER AI TOOLSET

### 📄 PROFESSIONAL OFFICE SUITE

| Tool | Description |
|------|-------------|
| 📑 **AI Document Generator** | Powered by Gemini, it drafts complete, formatted documents from a single prompt |
| 📊 **AI PowerPoint Generator** | Builds structured slide decks with outlines and professional themes |
| 📈 **AI Spreadsheet Maker** | Generates functional Excel Sheets with automated headers and complex formulas |
| ✍️ **Word Editor** | A rich-text interface with a Gemini-powered Sidebar to rephrase or summarize text instantly |

### 🧠 INTELLIGENT ANALYSIS & WRITING

| Tool | Description |
|------|-------------|
| 📂 **Chat with PDF** | Advanced RAG tool to extract data or summarize uploaded PDF documents via Gemini's large context window |
| 📝 **AI Writer** | Generate SEO-friendly blogs, professional emails, and social media captions |
| 📖 **AI Story Generator** | A creative engine for high-quality fiction and narrative content |
| 📚 **AI Book Creator** | Specifically built for authors to create children's picture books with integrated visuals |

### 🎨 CREATIVE MEDIA ENGINE

| Tool | Description |
|------|-------------|
| 🎙️ **AI Voice Generator** | Integration with ElevenLabs for lifelike, high-fidelity human voices |
| 🎬 **AI Video Generator** | Transforms prompts into cinematic video clips for social media or products |
| 🖼️ **AI Image Generator** | Batch create high-resolution visuals in Realistic, Art, or 3D styles |

---

## 🏗️ TECH STACK & ARCHITECTURE

### Frontend
- **React 18.3** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** + **shadcn/ui** for modern UI components
- **Framer Motion** for smooth animations
- **TipTap** rich text editor
- **React Query** for data fetching

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **Firebase** (Authentication + Firestore + Storage)
- **Deno** runtime for serverless functions

### AI & APIs
| Service | Purpose |
|---------|---------|
| **Google Gemini API** | Text generation, document creation, PDF analysis, ebook generation |
| **ElevenLabs API** | AI voice synthesis and text-to-speech |
| **Stripe** | Subscription billing and payment processing |
| **Resend** | Transactional email delivery |

---

## ⚙️ INSTALLATION & SETUP GUIDE

### 1️⃣ Prerequisites

- **Node.js** v18.0 or higher
- **npm**, **yarn**, or **bun**
- A **Supabase** project (free tier available)
- A **Firebase** project (free tier available)

### 2️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/mydocmaker.git
cd mydocmaker

# Install dependencies
npm install
```

### 3️⃣ Environment Configuration

Copy the example environment file and configure your keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:

```env
# ═══════════════════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════
VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"

# ═══════════════════════════════════════════════════════════════════════
# FIREBASE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://your_project-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_firebase_app_id"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### 4️⃣ Configure Supabase Edge Function Secrets

In your Supabase Dashboard, navigate to **Project Settings > Edge Functions > Secrets** and add:

| Secret Name | Description | Get it from |
|-------------|-------------|-------------|
| `GEMINI_API_KEY` | Google Gemini API | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS | [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys) |
| `FIREBASE_API_KEY` | Firebase verification | [Firebase Console](https://console.firebase.google.com/) |
| `RESEND_API_KEY` | Email service | [Resend Dashboard](https://resend.com/api-keys) |
| `STRIPE_SECRET_KEY` | Payments (optional) | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | [Stripe Webhooks](https://dashboard.stripe.com/webhooks) |

### 5️⃣ Launch Development Server

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Deploy to Netlify

```bash
# Build the project
npm run build

# Deploy the dist folder to Netlify
```

### Option 3: Self-Host with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Option 4: Deploy to Lovable

Simply connect your GitHub repository to [Lovable](https://lovable.dev) and click **Publish**.

---

## 💡 CRITICAL SETUP TIPS

> **Gemini API Integration**: Most text and document tasks rely on Gemini. Ensure your API key has access to `gemini-2.0-flash` or `gemini-2.5-flash` for the best performance.

> **ElevenLabs Voices**: For the AI Voice Generator, you must copy the specific **Voice ID** from your ElevenLabs dashboard into the application settings.

> **Large File Handling**: When using **Chat with PDF**, ensure your server timeout is sufficient for Gemini to process large document embeddings.

> **Stripe Integration**: For payment processing, you need to create products/prices in Stripe and update the price IDs in `supabase/functions/create-checkout-session/index.ts`.

---

## 📁 PROJECT STRUCTURE

```
mydocmaker/
├── src/
│   ├── assets/            # Static assets (images, logos)
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── tools/         # Tool-specific components
│   │   └── word-editor/   # Rich text editor components
│   ├── contexts/          # React contexts (Auth, Theme)
│   ├── data/              # Static data and configurations
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client & types
│   ├── lib/               # Utility libraries
│   ├── pages/             # Route pages
│   │   └── tools/         # Individual AI tool pages
│   └── index.css          # Global styles & design tokens
├── supabase/
│   ├── functions/         # Edge functions (serverless backend)
│   │   ├── ai-chat/       # AI chat assistant
│   │   ├── generate-book/ # Ebook generation
│   │   ├── generate-document/ # Document generation
│   │   ├── generate-image/    # Image generation
│   │   ├── generate-presentation/ # PowerPoint generation
│   │   ├── generate-spreadsheet/  # Excel generation
│   │   ├── generate-video/    # Video generation
│   │   ├── generate-voiceover/ # Voice synthesis
│   │   └── chat-pdf/      # PDF analysis
│   └── config.toml        # Supabase configuration
├── public/
│   └── screenshots/       # Application screenshots
├── .env.example           # Environment template
├── requirements.txt       # Package dependencies list
├── CONTRIBUTING.md        # Contribution guidelines
├── tailwind.config.ts     # Tailwind configuration
└── vite.config.ts         # Vite configuration
```

---

## 📬 CONTACT & COLLABORATION

| | |
|---|---|
| **Developer** | Maheer Khan |
| **Email** | [maheerkhan3a@gmail.com](mailto:maheerkhan3a@gmail.com) |
| **Inquiries** | Open to Technical Roles, Project Partnerships, or Investment Discussions |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 LICENSE

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using React, Supabase, and AI</sub>
</div>
