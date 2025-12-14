# Bio

> **Enterprise-grade biomedical research behind a chat interface** - Access PubMed, clinical trials, FDA drug labels, and run complex Python analyses through natural language. Powered by specialized biomedical data APIs.

🚀 **[Try the live demo](https://bio.valyu.ai)**

![Bio](public/valyu.png)

## Why Bio?

Traditional biomedical research is fragmented across dozens of databases and platforms. Bio changes everything by providing:

- **🔬 Comprehensive Medical Data** - PubMed articles, ClinicalTrials.gov data, FDA drug labels, and more
- **🔍 One Unified Search** - Powered by Valyu's specialized biomedical data API
- **🐍 Advanced Analytics** - Execute Python code in secure E2B sandboxes with persistent sessions for statistical analysis, pharmacokinetic modeling, and custom calculations
- **📊 Interactive Visualizations** - Beautiful charts and dashboards for clinical data
- **🌐 Real-Time Intelligence** - Web search integration for breaking medical news
- **🎯 Natural Language** - Just ask questions like you would to a colleague

## Key Features

### 🔥 Powerful Biomedical Tools

- **PubMed & ArXiv Search** - Access to millions of scientific papers and biomedical research
- **Clinical Trials Database** - Search ClinicalTrials.gov for active and completed trials
- **FDA Drug Labels** - Access comprehensive drug information from DailyMed
- **Drug Information** - Detailed medication data, warnings, and contraindications
- **Interactive Charts** - Visualize clinical data, drug efficacy, patient outcomes
- **Python Code Execution** - Run pharmacokinetic calculations, statistical analyses, and ML models

### 🛠️ Advanced Tool Calling

- **Python Code Execution** - Run complex biomedical calculations, statistical tests, and data analysis
- **Interactive Charts** - Create publication-ready visualizations of clinical data
- **Multi-Source Research** - Automatically aggregates data from multiple biomedical sources
- **Export & Share** - Download results, share analyses, and collaborate

## 🚀 Quick Start

### Two Modes: Production vs Development

Bio supports two distinct operating modes:

**🌐 Production Mode** (Default)
- Uses Supabase for authentication and database
- OpenAI/Vercel AI Gateway for LLM
- Rate limiting (5 queries/day for free tier)
- Billing and usage tracking via Polar
- Full authentication required

**💻 Development Mode** (Recommended for Local Development)
- **No Supabase required** - Uses local SQLite database
- **No authentication needed** - Auto-login as dev user
- **Unlimited queries** - No rate limits
- **No billing/tracking** - Polar integration disabled
- **Works offline** - Complete local development

### Prerequisites

**For Production Mode:**
- Node.js 18+
- npm or yarn
- OpenAI API key
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- E2B API key (for code execution)
- Supabase account and project
- Polar account (for billing)

**For Development Mode (Recommended for getting started):**
- Node.js 18+
- npm or yarn
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- E2B API key (for code execution)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yorkeccak/bio.git
   cd bio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   **For Development Mode (Easy Setup):**
   ```env
   # Enable Development Mode (No Supabase, No Auth, No Billing)
   NEXT_PUBLIC_APP_MODE=development

   # Valyu API Configuration (Required)
   VALYU_API_KEY=your-valyu-api-key

   # E2B Configuration (Required for Python execution)
   E2B_API_KEY=your-e2b-api-key

   # OpenAI Configuration (Required)
   OPENAI_API_KEY=your-openai-api-key
   ```

   **For Production Mode:**
   ```env
   # OpenAI Configuration (Required)
   OPENAI_API_KEY=your-openai-api-key

   # Valyu API Configuration (Required)
   VALYU_API_KEY=your-valyu-api-key

   # E2B Configuration (Required)
   E2B_API_KEY=your-e2b-api-key

   # Supabase Configuration (Required)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Polar Billing (Required)
   POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
   POLAR_UNLIMITED_PRODUCT_ID=your-product-id

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

   - **Development Mode**: You'll be automatically logged in as `dev@localhost`
   - **Production Mode**: You'll need to sign up/sign in

## 🏠 Development Mode Guide

### What is Development Mode?

Development mode provides a complete local development environment without any external dependencies beyond the core APIs (Valyu, E2B). It's perfect for:

- **Local Development** - No Supabase setup required
- **Offline Work** - All data stored locally in SQLite
- **Testing Features** - Unlimited queries without billing
- **Privacy** - Your data stays local in development mode
- **Quick Prototyping** - No authentication or rate limits

### How It Works

When `NEXT_PUBLIC_APP_MODE=development`:

1. **Local SQLite Database** (`/.local-data/dev.db`)
   - Automatically created on first run
   - Stores chat sessions, messages, charts, and CSVs
   - Full schema matching production Supabase tables
   - Easy to inspect with `sqlite3 .local-data/dev.db`

2. **Mock Authentication**
   - Auto-login as dev user (`dev@localhost`)
   - No sign-up/sign-in required
   - Unlimited tier access with all features

3. **No Rate Limits**
   - Unlimited chat queries
   - No usage tracking
   - No billing integration

### Development Mode Features

✅ **Full Chat History**
- All conversations saved to local SQLite
- Persists across restarts
- View/delete old sessions

✅ **Charts & Visualizations**
- Created charts saved locally
- Retrievable via markdown syntax
- Rendered from local database

✅ **CSV Data Tables**
- Generated CSVs stored in SQLite
- Inline table rendering
- Full data persistence

✅ **No Hidden Costs**
- No Supabase database costs
- No authentication service costs

### Managing Local Database

**View Database:**
```bash
sqlite3 .local-data/dev.db
# Then run SQL queries
SELECT * FROM chat_sessions;
SELECT * FROM charts;
```

**Reset Database:**
```bash
rm -rf .local-data/
# Database recreated on next app start
```

**Backup Database:**
```bash
cp -r .local-data/ .local-data-backup/
```

### Switching Between Modes

**Development → Production:**
1. Remove/comment `NEXT_PUBLIC_APP_MODE=development`
2. Add all Supabase and Polar environment variables
3. Restart server

**Production → Development:**
1. Add `NEXT_PUBLIC_APP_MODE=development`
2. Restart server
3. Local database automatically created

**Note:** Your production Supabase data and local SQLite data are completely separate. Switching modes doesn't migrate data.

### Troubleshooting Development Mode

**Sidebar won't open on homepage:**
- Fixed! Sidebar now respects dock setting even on homepage

**Database errors:**
- Delete and recreate: `rm -rf .local-data/`
- Check file permissions in `.local-data/` directory

**Auth errors:**
- Verify `NEXT_PUBLIC_APP_MODE=development` is set
- Clear browser localStorage and cache
- Restart dev server

## Production Deployment Guide

This guide walks you through setting up Bio for production with full authentication, billing, and database functionality.

### 1. Get API Keys

#### Valyu API (Required)

Valyu provides specialized biomedical data - PubMed articles, clinical trials, FDA drug labels, and more. Without this API key, the app cannot access biomedical data.

1. Go to [platform.valyu.ai](https://platform.valyu.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key (starts with `valyu_`)

#### OpenAI API (Required)

Used for AI chat responses, natural language understanding, and function calling.

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API keys
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### E2B API (Required)

Used for secure Python code execution with persistent sessions, enabling data analysis, visualizations, and statistical calculations.

1. Go to [e2b.dev](https://e2b.dev)
2. Sign up for an account
3. Get your API key from the dashboard
4. Copy the key

### 2. Set Up Supabase Database

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned (2-3 minutes)
4. Go to Project Settings → API
5. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it

#### Set Up Row Level Security

1. In the SQL Editor, create another new query
2. Copy the contents of [`supabase/policies.sql`](supabase/policies.sql) and run it

#### Configure Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider (enabled by default)
3. **Optional:** Enable OAuth providers (Google, GitHub, etc.)
   - For Google: Add OAuth credentials from Google Cloud Console
   - For GitHub: Add OAuth app credentials from GitHub Settings

4. Go to **Authentication** → **URL Configuration**
5. Add your site URL and redirect URLs:
   - Site URL: `https://yourdomain.com` (or `http://localhost:3000` for testing)
   - Redirect URLs: `https://yourdomain.com/auth/callback`

### 3. Set Up Polar Billing (Optional)

Polar provides subscription billing and payments.

1. Go to [polar.sh](https://polar.sh)
2. Create an account
3. Create your products:
   - **Pay Per Use** plan (e.g., $9.99/month)
   - **Unlimited** plan (e.g., $49.99/month)
4. Copy the Product IDs
5. Go to Settings → Webhooks
6. Create a webhook:
   - URL: `https://yourdomain.com/api/webhooks/polar`
   - Events: Select all `customer.*` and `subscription.*` events
7. Copy the webhook secret

**If you don't want billing:**
- Skip this section
- Remove billing UI from the codebase
- All users will have unlimited access

### 4. Configure Environment Variables

Create `.env.local` in your project root:

```env
# App Configuration
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Valyu API (Required - powers all biomedical data)
# Get yours at: https://platform.valyu.ai
VALYU_API_KEY=valyu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# E2B Configuration (Code Execution)
E2B_API_KEY=your-e2b-api-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Polar Billing (Optional - remove if not using billing)
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
POLAR_UNLIMITED_PRODUCT_ID=prod_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Deploy to Production

#### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy!

**Important Vercel Settings:**
- Framework Preset: Next.js
- Node.js Version: 18.x or higher
- Build Command: `npm run build`
- Output Directory: `.next`

#### Other Deployment Options

- **Netlify**: Similar to Vercel
- **Railway**: Good for full-stack apps
- **Self-hosted**: Use Docker with PM2 or similar

### 6. Post-Deployment Setup

1. **Test Authentication:**
   - Visit your site
   - Try signing up with email
   - Check that user appears in Supabase Users table

2. **Test Polar Webhooks:**
   - Subscribe to a plan
   - Check Supabase users table for `subscription_tier` update
   - Check Polar dashboard for webhook delivery

3. **Test Biomedical Data:**
   - Ask a question like "What are recent clinical trials for melanoma?"
   - Verify Valyu API is returning data
   - Check that charts and CSVs are saving to database

### 7. Troubleshooting

**Authentication Issues:**
- Verify Supabase URL and keys are correct
- Check redirect URLs in Supabase dashboard
- Clear browser cookies/localStorage and try again

**Database Errors:**
- Verify all tables were created successfully
- Check RLS policies are enabled
- Review Supabase logs for detailed errors

**Billing Not Working:**
- Verify Polar webhook secret is correct
- Check Polar dashboard for webhook delivery status
- Review app logs for webhook processing errors

**No Biomedical Data:**
- Verify Valyu API key is set correctly in environment variables
- Check Valyu dashboard for API usage/errors
- Test API key with a curl request to Valyu

**Rate Limiting:**
- Check `user_rate_limits` table in Supabase
- Verify user's subscription tier is set correctly
- Review rate limit logic in `/api/rate-limit`

### 8. Security Best Practices

**Do:**
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never expose client-side)
- Use environment variables for all secrets
- Enable RLS on all Supabase tables
- Regularly rotate API keys
- Use HTTPS in production
- Enable Supabase Auth rate limiting

**Don't:**
- Commit `.env.local` to git (add to `.gitignore`)
- Expose service role keys in client-side code
- Disable RLS policies
- Use the same API keys for dev and production

### 9. Monitoring & Maintenance

**Supabase:**
- Monitor database usage in Supabase dashboard
- Set up database backups (automatic in paid plan)
- Review auth logs for suspicious activity

**Polar:**
- Monitor subscription metrics
- Handle failed payments
- Review webhook logs

**Application:**
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor API usage (Valyu, OpenAI, E2B)
- Set up uptime monitoring (UptimeRobot, Better Uptime)

## 💡 Example Queries

Try these powerful queries to see what Bio can do:

- "What are the latest clinical trials for CAR-T therapy in melanoma?"
- "Find recent PubMed papers on CRISPR gene editing safety"
- "Calculate the half-life of warfarin based on these concentrations"
- "Search for drug interactions between metformin and lisinopril"
- "Analyze Phase 3 clinical trial data for immunotherapy drugs"
- "Create a chart comparing efficacy rates of different COVID-19 vaccines"

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 with function calling
- **Data**: Valyu API for comprehensive biomedical data
- **Code Execution**: E2B sandboxes for secure Python execution with persistent sessions
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK

## 🔒 Security

- Secure API key management
- Sandboxed code execution via E2B
- No storage of sensitive medical data
- HTTPS encryption for all API calls
- HIPAA-compliant architecture (when self-hosted)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Valyu](https://platform.valyu.ai) - The unified biomedical data API
- Powered by [E2B](https://e2b.dev) - Secure code execution with persistent sessions
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with ❤️ for biomedical researchers
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a> •
  <a href="https://github.com/yorkeccak/bio">GitHub</a>
</p>
