# Case Law Integration Guide

LawyerBot now integrates with **CourtListener** and **Harvard Caselaw Access Project (CAP)** to provide Gemini AI with access to real legal case databases.

## 🔑 Getting Your API Key

### CourtListener API Key
1. Visit [CourtListener](https://www.courtlistener.com/)
2. Create a free account or sign in
3. Go to your profile settings
4. Navigate to **API** section
5. Generate an API key

**Important:** The same CourtListener API key works for both:
- ✅ CourtListener API
- ✅ Harvard Caselaw Access Project (CAP)

## 📝 Setup

Add your API key to `.env.local`:

```bash
# CourtListener API Key (also works for Harvard CAP)
COURTLISTENER_API_KEY=your_api_key_here

# Your existing Gemini configuration
GEMINI_API_KEY=your_gemini_key_here
```

## 🚀 How It Works

### Automatic Function Calling (Coming Soon)
When you ask Gemini a legal question that requires case law, it will automatically:
1. Detect when precedents are needed
2. Call the `search_case_law` function
3. Query CourtListener and Harvard CAP
4. Integrate the results into its response

### Manual Usage
You can also use the case law service directly:

```typescript
import { getCaseLawService } from '@/lib/legal/caselaw-service';

const service = getCaseLawService();

// Search for cases
const results = await service.searchCaseLaw(
  'contract breach',
  'federal',
  '2020-01-01',
  '2024-01-01',
  5
);

// Format for AI consumption
const formatted = service.formatResultsForAI(results);
```

## 📊 Features

### CourtListener Integration
- ✅ Full-text case search
- ✅ Filter by jurisdiction
- ✅ Filter by date range
- ✅ Relevance-based ranking
- ✅ Direct links to full opinions

### Harvard CAP Integration
- ✅ Historical case database
- ✅ State and federal cases
- ✅ Citation lookup
- ✅ Case metadata

## 🎯 Example Queries

With case law integration, you can now ask:

```
"Find cases involving breach of contract in federal courts from 2020-2024"

"What precedents exist for employment discrimination in California?"

"Search for cases citing 42 U.S.C. § 1983 in the 9th Circuit"

"Find recent intellectual property cases involving software patents"
```

## 🔧 API Endpoints

### CourtListener
- Base URL: `https://www.courtlistener.com/api/rest/v3`
- Documentation: https://www.courtlistener.com/help/api/

### Harvard CAP
- Base URL: `https://api.case.law/v1`
- Documentation: https://case.law/api/

## 💡 Benefits

1. **Real Citations**: Get actual case names, citations, and court information
2. **Up-to-Date**: Access recent court opinions and precedents
3. **Comprehensive**: Search millions of cases across federal and state courts
4. **Verified Sources**: All results link back to official court opinions
5. **Context-Aware**: Results are filtered by jurisdiction and relevance

## ⚙️ Configuration

The case law service is configured in:
- **Service**: `frontend/src/lib/legal/caselaw-service.ts`
- **Integration**: `frontend/src/lib/legal/google-genai-client.ts`
- **Types**: Defined in the service file

## 🛠️ Development

To test the integration:

1. Set your `COURTLISTENER_API_KEY` in `.env.local`
2. Run the development server: `npm run dev`
3. Submit a legal query at `/legal`
4. Check the console for case law search results

## 📈 Rate Limits

### CourtListener
- Free tier: Reasonable usage limits
- Authenticated requests: Higher rate limits
- Consider upgrading for heavy usage

### Harvard CAP
- Open access: Generous limits
- No authentication required for basic access
- Optional authentication for higher limits

## 🔐 Security

- API keys are stored in environment variables
- Never commit `.env.local` to version control
- Keys are only used server-side (Next.js API routes)
- No client-side exposure of sensitive credentials

## 📚 Resources

- [CourtListener Documentation](https://www.courtlistener.com/help/api/)
- [Harvard CAP Documentation](https://case.law/api/)
- [CourtListener API Python Client](https://github.com/freelawproject/courtlistener)

## 🎉 Next Steps

1. ✅ Get your CourtListener API key
2. ✅ Add it to `.env.local`
3. ✅ Test with a legal query
4. 🚧 Wait for function calling implementation (or implement it yourself!)

---

**Note**: Function calling integration is prepared but not yet fully implemented. The case law service is ready and can be used directly in your code or integrated with Gemini's function calling feature.

