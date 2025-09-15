# Bio.

> **We put a biomedical research assistant behind a chat interface and open-sourced it** - Access clinical trials data, FDA drug labels, PubMed literature, and pharmaceutical intelligence through natural language. The backend? 1 search API.

🚀 **[Try the live demo at bio.valyu.network](https://bio.valyu.network)**

![Bio by Valyu](public/valyu.png)

## Why Bio?

Traditional biomedical research is fragmented across dozens of databases and platforms. Bio changes everything by providing:

- **🧬 Clinical-Grade Data** - ClinicalTrials.gov data, FDA drug labels, PubMed literature, and pharmaceutical company intelligence
- **🔍 One Unified Search** - Powered by Valyu's comprehensive biomedical data API
- **🐍 Advanced Analytics** - Execute Python code in secure Daytona sandboxes for data analysis, statistical modeling, and visualization
- **📊 Interactive Visualizations** - Beautiful charts for clinical data, drug efficacy comparisons, and research trends
- **🌐 Real-Time Intelligence** - Web search integration for breaking medical news and research updates
- **🏠 Local AI Models** - Run with Ollama for unlimited, private queries using your own hardware
- **🎯 Natural Language** - Just ask questions like you would to a colleague

## Key Features

### 🔥 Powerful Biomedical Tools

- **Clinical Trials Search** - Search and analyze trials from ClinicalTrials.gov with detailed phase, enrollment, and outcome data
- **Drug Information** - FDA drug labels with contraindications, side effects, and interaction warnings from DailyMed
- **Biomedical Literature** - Access PubMed, ArXiv, and academic journals for peer-reviewed research
- **Pharma Intelligence** - Analyze pharmaceutical companies through SEC filings, earnings, and market data
- **Academic Research** - Access to Wiley finance/business/accounting corpus for healthcare economics research
- **Comprehensive Search** - Cross-reference clinical trials, drug labels, and literature in one query

### 🛠️ Advanced Tool Calling

- **Python Code Execution** - Run complex financial models, ML algorithms, and custom analyses
- **Interactive Charts** - Create publication-ready visualizations
- **Multi-Source Research** - Automatically aggregates data from multiple sources
- **Export & Share** - Download results, share analyses, and collaborate

## 🚀 Quick Start

### Prerequisites

**For Cloud Usage:**
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Valyu API key (get one at [platform.valyu.network](https://platform.valyu.network))
- Daytona API key (for code execution)

**For Local AI Models:**
- All of the above, plus:
- [Ollama](https://ollama.com) installed and running
- At least one model installed (qwen2.5:7b recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yorkeccak/finance.git
   cd finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   
   # Valyu API Configuration
   VALYU_API_KEY=your-valyu-api-key
   
   # Daytona Configuration (for Python execution)
   DAYTONA_API_KEY=your-daytona-api-key
   DAYTONA_API_URL=https://api.daytona.io  # Optional
   DAYTONA_TARGET=latest  # Optional
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your deployment URL in production
   
   # Ollama Configuration (Optional - for local models)
   # By default, Ollama support is DISABLED for production mode
   # To enable Ollama support, uncomment the line below:
   # APP_MODE=development  # Enable local model support
   OLLAMA_BASE_URL=http://localhost:11434  # Default Ollama URL
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Check your configuration (optional)**
   ```bash
   npm run check-config
   ```
   This will show you whether Ollama support is enabled or disabled.

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### 🏠 Local Model Setup (Optional)

**Note**: By default, Ollama support is **disabled** for production mode. The app will use OpenAI/Vercel AI Gateway with rate limiting (5 queries/day).

For unlimited, private queries using your own hardware:

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.com
   ```

2. **Start Ollama service**
   ```bash
   ollama serve
   ```

3. **Install recommended models**
   ```bash
   # Best for tool calling (recommended)
   ollama pull qwen2.5:7b
   
   # Alternative options
   ollama pull qwen2.5:14b    # Better but slower
   ollama pull llama3.1:7b    # Good general performance
   ```

4. **Switch to local model**
   
   Click the "Local Models" indicator in the top-right corner of the app to select your model.

**Model Recommendations:**
- **Qwen2.5:7B+** - Excellent for tool calling and financial analysis
- **Llama 3.1:7B+** - Good general performance with tools
- **Avoid smaller models** - Many struggle with complex function calling

## 💡 Example Queries

Try these powerful queries to see what Finance can do:

- "Build a Monte Carlo simulation to predict Tesla's stock price in 6 months"
- "Analyze GameStop's latest 10-K filing and extract key financial metrics"
- "Research how Trump's latest statements affect Elon Musk's companies"
- "Create an interactive dashboard comparing the 'Magnificent 7' stocks"
- "Do an in-depth report on COVID-19's effect on Pfizer with insider trading data"
- "Analyze PepsiCo's recent SEC filings and calculate key financial ratios"

**With Local Models (Ollama):**
- Run unlimited queries without API costs
- Keep all your financial analysis completely private
- Perfect for sensitive research and proprietary strategies

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 with function calling + Ollama for local models
- **Data**: Valyu API for comprehensive financial data
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK
- **Local Models**: Ollama integration for private, unlimited queries

## 🔒 Security

- Secure API key management
- Sandboxed code execution via Daytona
- No storage of sensitive financial data
- HTTPS encryption for all API calls

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Valyu](https://platform.valyu.network) - The unified financial data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with ❤️ by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-network">LinkedIn</a> •
  <a href="https://github.com/yorkeccak/finance">GitHub</a>
</p>
