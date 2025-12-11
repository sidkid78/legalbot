# LawyerBot - Quick Setup Guide

A streamlined AI-powered legal analysis tool using Google Gemini 2.5 Flash.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create `.env.local`:
```bash
# Required - Get from https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - For case law search
COURTLISTENER_API_KEY=your_courtlistener_key_here
```

### 3. Run the Application
```bash
npm run dev
```

Visit `http://localhost:3000`

## 📁 Key Features

✅ **No Authentication Required** - Direct access for personal use  
✅ **JSON-Based Storage** - No database setup needed  
✅ **Google Gemini AI** - Latest 2.5 Flash model  
✅ **Family Law Support** - All 9 legal domains including Family Law  
✅ **Case Law Integration** - CourtListener & Harvard CAP (optional)  
✅ **Smart Detection** - Auto-detects domain, jurisdiction, urgency  
✅ **Markdown Responses** - Beautifully formatted legal analysis  

## 📂 Data Storage

All data is stored locally in:
```
frontend/data/legal_workflow.json
```

This file contains:
- Legal queries
- AI responses
- Processing history

## 🎯 Usage

### Simple Legal Query
1. Go to `/legal` for quick testing
2. Enter your legal question
3. Get instant AI analysis with citations

### Full Dashboard
1. Go to `/dashboard` to see all queries
2. View statistics and history
3. Access detailed legal analyses

## 🔧 Supported Legal Domains

1. **Contract Law** - Agreements, breaches, enforcement
2. **Corporate Law** - Business transactions, compliance
3. **Litigation** - Court proceedings, disputes
4. **Intellectual Property** - Patents, trademarks, copyrights
5. **Employment Law** - Labor disputes, workplace issues
6. **Real Estate Law** - Property transactions, zoning
7. **Tax Law** - Tax compliance, planning
8. **Regulatory Compliance** - Industry regulations
9. **Family Law** - Custody, divorce, support (NEW!)

## 🌍 Supported Jurisdictions

- Federal
- State
- International
- Administrative
- Appellate
- District

## ⚡ Urgency Levels

- **Emergency** - Immediate action required
- **Urgent** - 24-48 hours
- **High** - Within a week
- **Medium** - Within a month
- **Low** - No immediate timeline

## 📊 What You Get

Each analysis includes:
- ✅ Jurisdictional analysis
- ✅ Applicable law identification
- ✅ Risk assessment (Critical → Minimal)
- ✅ Legal citations (if case law API configured)
- ✅ Actionable recommendations
- ✅ Next steps with timelines
- ✅ Billing estimates
- ✅ Legal disclaimers

## 🔐 Privacy

- **No user accounts** - Personal use only
- **Local storage** - Data stays on your machine
- **No external servers** - Except Google Gemini API
- **Confidential** - All queries marked privileged

## 🛠️ Optional: Case Law Search

To enable real case law search:

1. Get API key from https://www.courtlistener.com/
2. Add to `.env.local`:
   ```bash
   COURTLISTENER_API_KEY=your_key_here
   ```
3. Gemini will automatically search case databases

## 📝 Example Queries

```
"Review breach of contract implications for non-delivery of goods under UCC Article 2. New York State. High urgency."

"Analyze potential patent infringement claim for software product. Federal jurisdiction. Need defense strategy."

"Emergency custody motion needed due to domestic violence. State court. Immediate filing required."
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use different port
PORT=3001 npm run dev
```

### Missing API Key
- Error: "Google GenAI API key is required"
- Solution: Add `GEMINI_API_KEY` to `.env.local`

### Build Errors
```bash
# Clean install
rm -rf node_modules .next
npm install
npm run dev
```

## 📚 Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **AI**: Google Gemini 2.5 Flash
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Storage**: JSON file-based
- **Markdown**: react-markdown

## 🎓 Learn More

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [CourtListener API](https://www.courtlistener.com/help/api/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Note**: This is a personal legal analysis tool. Always consult with a licensed attorney for official legal advice.

