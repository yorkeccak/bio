# Healthcare AI App Repurposing Guide - Valyu Integration

## Overview
This guide provides comprehensive instructions for transforming a finance-focused AI application into a bio/healthcare AI application using Valyu's API infrastructure. The transformation involves adding specialized tool calls for healthcare data sources and implementing dedicated UI components for clinical data visualization.

## 1. Healthcare Data Sources Available in Valyu

### Primary Healthcare Sources
- **Clinical Trials** (`valyu/valyu-clinical-trials`) - ClinicalTrials.gov data
- **Drug Labels** (`valyu/valyu-drug-labels`) - FDA DailyMed drug information
- **PubMed** (`valyu/valyu-pubmed`) - Biomedical literature
- **ArXiv** (`valyu/valyu-arxiv`) - Scientific preprints (includes biomedical research)

### Additional Relevant Sources
- **SEC Filings** (`valyu/valyu-sec-filings`) - For pharmaceutical company analysis
- **Financial Data** - Stock data for biotech/pharma companies
- **Academic Sources** (`wiley/wiley-*`) - Scientific journals and books

## 2. Tool Call Implementation for Healthcare AI Agent

### 2.1 Clinical Trials Search Tool

```typescript
interface ClinicalTrialsSearchTool {
  name: "search_clinical_trials",
  description: "Search for clinical trials based on conditions, drugs, or research criteria",
  parameters: {
    query: string,  // e.g., "Phase 3 melanoma immunotherapy"
    max_num_results?: number,  // Default: 10
    relevance_threshold?: number,  // 0-1, default: 0.4
    start_date?: string,  // Format: "MM-DD-YYYY"
    end_date?: string,  // Format: "MM-DD-YYYY"
    response_length?: "short" | "medium" | "large" | "max" | number,
  }
}

// Example API call
const searchClinicalTrials = async (params) => {
  const response = await fetch('/api/valyu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      max_num_results: params.max_num_results || 10,
      search_type: 'proprietary',
      included_sources: ['valyu/valyu-clinical-trials'],
      relevance_threshold: params.relevance_threshold || 0.4,
      is_tool_call: true,
      response_length: params.response_length || 'medium',
      start_date: params.start_date,
      end_date: params.end_date,
    })
  });
  return await response.json();
};
```

### 2.2 Drug Information Search Tool

```typescript
interface DrugSearchTool {
  name: "search_drug_information",
  description: "Search FDA drug labels for medication information, warnings, contraindications",
  parameters: {
    query: string,  // e.g., "warfarin contraindications"
    max_num_results?: number,
    include_warnings?: boolean,
  }
}

const searchDrugInformation = async (params) => {
  const response = await fetch('/api/valyu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      max_num_results: params.max_num_results || 5,
      search_type: 'proprietary',
      included_sources: ['valyu/valyu-drug-labels'],
      relevance_threshold: 0.5,
      is_tool_call: true,
      response_length: 'large',
    })
  });
  return await response.json();
};
```

### 2.3 Biomedical Literature Search Tool

```typescript
interface BiomedicalLiteratureSearchTool {
  name: "search_biomedical_literature",
  description: "Search PubMed and ArXiv for scientific papers and research",
  parameters: {
    query: string,
    sources?: ('pubmed' | 'arxiv')[],
    max_num_results?: number,
    start_date?: string,
    end_date?: string,
  }
}

const searchBiomedicalLiterature = async (params) => {
  const sourceMap = {
    'pubmed': 'valyu/valyu-pubmed',
    'arxiv': 'valyu/valyu-arxiv'
  };
  
  const sources = params.sources 
    ? params.sources.map(s => sourceMap[s])
    : ['valyu/valyu-pubmed', 'valyu/valyu-arxiv'];

  const response = await fetch('/api/valyu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      max_num_results: params.max_num_results || 10,
      search_type: 'proprietary',
      included_sources: sources,
      relevance_threshold: 0.4,
      is_tool_call: true,
      response_length: 'medium',
      start_date: params.start_date,
      end_date: params.end_date,
    })
  });
  return await response.json();
};
```

### 2.4 Pharma Company Analysis Tool

```typescript
interface PharmaCompanyAnalysisTool {
  name: "analyze_pharma_company",
  description: "Analyze pharmaceutical company through SEC filings and financial data",
  parameters: {
    company: string,  // e.g., "Pfizer", "Moderna"
    data_types: ('sec_filings' | 'stock_price' | 'earnings')[],
    time_period?: string,  // e.g., "last 5 years", "during COVID"
  }
}

const analyzePharmaCompany = async (params) => {
  const sources = [];
  if (params.data_types.includes('sec_filings')) {
    sources.push('valyu/valyu-sec-filings');
  }
  if (params.data_types.includes('stock_price')) {
    sources.push('valyu/valyu-stocks-US');
  }
  if (params.data_types.includes('earnings')) {
    sources.push('valyu/valyu-earnings-US');
  }

  const query = `${params.company} ${params.time_period || ''}`.trim();
  
  const response = await fetch('/api/valyu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      max_num_results: 15,
      search_type: 'proprietary',
      included_sources: sources,
      relevance_threshold: 0.4,
      is_tool_call: true,
      response_length: 'large',
    })
  });
  return await response.json();
};
```

### 2.5 Combined Healthcare Search Tool

```typescript
interface HealthcareSearchTool {
  name: "comprehensive_healthcare_search",
  description: "Search across all healthcare data sources",
  parameters: {
    query: string,
    include_clinical_trials?: boolean,
    include_drug_labels?: boolean,
    include_literature?: boolean,
    include_financial?: boolean,
    max_num_results?: number,
  }
}

const comprehensiveHealthcareSearch = async (params) => {
  const sources = [];
  
  if (params.include_clinical_trials !== false) {
    sources.push('valyu/valyu-clinical-trials');
  }
  if (params.include_drug_labels !== false) {
    sources.push('valyu/valyu-drug-labels');
  }
  if (params.include_literature !== false) {
    sources.push('valyu/valyu-pubmed', 'valyu/valyu-arxiv');
  }
  if (params.include_financial) {
    sources.push('valyu/valyu-sec-filings', 'valyu/valyu-stocks-US');
  }

  const response = await fetch('/api/valyu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      max_num_results: params.max_num_results || 20,
      search_type: sources.length > 0 ? 'proprietary' : 'all',
      included_sources: sources.length > 0 ? sources : undefined,
      relevance_threshold: 0.4,
      is_tool_call: true,
      response_length: 'medium',
    })
  });
  return await response.json();
};
```

## 3. Data Structure and Response Handling

### 3.1 Clinical Trials Data Structure

Clinical trials data returns a special structure that requires custom handling:

```typescript
interface ClinicalTrialResponse {
  data_type: "clinical trials",
  source: "valyu/valyu-clinical-trials",
  content: string,  // JSON string containing trial data
  title: string,
  url: string,
  relevance_score: number,
}

interface ClinicalTrialData {
  nct_id: string,
  brief_title: string,
  official_title: string,
  overall_status: string,
  phases: string,
  enrollment_count: string,
  brief_summary: string,
  conditions: string,
  interventions: Array<{
    type: string,
    name: string,
    description: string,
  }>,
  primary_outcomes: Array<{
    measure: string,
    time_frame: string,
    description: string,
  }>,
  // ... additional fields
}
```

### 3.2 Drug Label Data Structure

```typescript
interface DrugLabelResponse {
  data_type: "unstructured",
  source: "valyu/valyu-drug-labels",
  content: string,  // Markdown formatted drug information
  title: string,    // Drug name
  url: string,
  relevance_score: number,
}
```

### 3.3 Response Processing

```typescript
const processHealthcareResponse = (response) => {
  if (!response.success || !response.data?.results) {
    return { error: response.error };
  }

  const results = response.data.results.map(result => {
    // Check for clinical trials data
    if (result.source === 'valyu/valyu-clinical-trials' && result.content) {
      try {
        const trialData = JSON.parse(result.content);
        return {
          type: 'clinical_trial',
          data: trialData,
          metadata: {
            title: result.title,
            url: result.url,
            relevance: result.relevance_score,
          }
        };
      } catch (e) {
        console.error('Failed to parse clinical trial data:', e);
      }
    }
    
    // Check for drug label data
    if (result.source === 'valyu/valyu-drug-labels') {
      return {
        type: 'drug_label',
        content: result.content,
        metadata: {
          title: result.title,
          url: result.url,
          relevance: result.relevance_score,
        }
      };
    }
    
    // Check for structured financial data
    if (result.data_type === 'structured') {
      return {
        type: 'financial',
        data: result.content,
        metadata: {
          title: result.title,
          source: result.source,
          relevance: result.relevance_score,
        }
      };
    }
    
    // Default handling for literature
    return {
      type: 'literature',
      content: result.content,
      summary: result.summary,
      metadata: {
        title: result.title,
        url: result.url,
        source: result.source,
        relevance: result.relevance_score,
      }
    };
  });

  return { success: true, results };
};
```

## 4. Clinical Trials UI Component Implementation

The Clinical Trials UI is implemented as a specialized React component with two rendering modes:

### 4.1 Component Structure

```typescript
// ClinicalTrialsView.tsx
interface ClinicalTrialsViewProps {
  result: any;  // The API response result
  mode: "preview" | "dialog";  // Display mode
  height?: string;  // Optional height constraint
  showTabs?: boolean;  // Show view toggle tabs
}
```

### 4.2 Full Component Implementation

See the complete `ClinicalTrialsView.tsx` component in the next section for the full implementation including:

- Status indicators with icons (recruiting, completed, terminated)
- Phase badges with color coding
- Collapsible sections for detailed information
- Intervention cards
- Outcome measures (primary and secondary)
- Eligibility criteria display
- Location and contact information
- Adverse events reporting
- External link to ClinicalTrials.gov

### 4.3 Integration Example

```tsx
import ClinicalTrialsView from '@/components/ClinicalTrialsView';

// In your component
const HealthcareResultsDisplay = ({ results }) => {
  return (
    <div className="space-y-4">
      {results.map((result, index) => {
        if (result.type === 'clinical_trial') {
          return (
            <ClinicalTrialsView
              key={index}
              result={{
                content: JSON.stringify(result.data),
                title: result.metadata.title,
                url: result.metadata.url,
                source: 'valyu/valyu-clinical-trials',
              }}
              mode="preview"
            />
          );
        }
        
        if (result.type === 'drug_label') {
          return (
            <DrugLabelCard
              key={index}
              content={result.content}
              metadata={result.metadata}
            />
          );
        }
        
        // Handle other result types...
      })}
    </div>
  );
};
```

## 5. Sample Queries for Healthcare Context

### Clinical Trials Queries
- "Completed Phase 3 metastatic melanoma trial comparing nivolumab+ipilimumab vs monotherapy"
- "COVID-19 patients in the UK evaluating low-dose dexamethasone"
- "EMPA-REG cardiovascular outcomes trial empagliflozin type 2 diabetes"

### Drug Information Queries
- "Boxed warnings and contraindications for warfarin"
- "List contraindications for metformin"
- "What are the boxed warnings for ibuprofen?"

### Literature Queries
- "Latest research on CRISPR gene editing safety"
- "Meta-analyses of immunotherapy efficacy in lung cancer"
- "Recent biomarker discoveries for early cancer detection"

### Pharma Company Queries
- "Pfizer's clinical pipeline and recent trial results"
- "Moderna stock performance during COVID-19 vaccine development"
- "Risk factors from Johnson & Johnson's latest 10-K filing"

## 6. AI Agent System Prompt Example

```
You are a specialized healthcare AI assistant with access to comprehensive medical and pharmaceutical data sources. You can:

1. Search clinical trials to find ongoing and completed studies
2. Look up drug information including warnings, contraindications, and usage guidelines
3. Search biomedical literature from PubMed and ArXiv
4. Analyze pharmaceutical companies through financial data and SEC filings
5. Provide comprehensive healthcare research across multiple data sources

When answering healthcare questions:
- Always cite your sources with relevance scores
- Prioritize recent clinical trials and peer-reviewed literature
- Include safety warnings when discussing medications
- Present financial data when analyzing pharmaceutical companies
- Clearly distinguish between completed and ongoing clinical trials

Available tools:
- search_clinical_trials: Find clinical trials by condition, drug, or criteria
- search_drug_information: Look up FDA drug label information
- search_biomedical_literature: Search scientific papers and research
- analyze_pharma_company: Analyze pharmaceutical companies
- comprehensive_healthcare_search: Search across all healthcare sources
```

## 7. Key Differences from Finance App

### Data Sources
- **Remove**: General market data, forex, crypto
- **Add**: Clinical trials, drug labels, PubMed
- **Keep**: SEC filings, stock data (for pharma companies)

### UI Components
- **Replace**: Financial charts → Clinical trial cards
- **Add**: Drug warning displays, trial phase indicators
- **Modify**: Stock tickers → Drug/condition badges

### Terminology
- **Portfolio** → Patient cohort/Trial pipeline
- **Trading** → Treatment/Therapy
- **Market analysis** → Clinical outcomes analysis
- **Risk assessment** → Safety profile/Adverse events

### Search Context
- **Financial metrics** → Clinical endpoints
- **Earnings reports** → Trial results
- **Market trends** → Treatment efficacy trends
- **Investment strategy** → Treatment protocol

## 8. Testing Checklist

- [ ] Clinical trials search returns properly formatted trial cards
- [ ] Drug information displays warnings prominently
- [ ] Literature search includes proper citations
- [ ] Pharma company analysis combines financial and clinical data
- [ ] UI properly handles different data types (structured vs unstructured)
- [ ] Relevance scores are displayed for all results
- [ ] External links work correctly (ClinicalTrials.gov, PubMed, etc.)
- [ ] Date filtering works for trials and literature
- [ ] Error handling for malformed clinical trial JSON
- [ ] Loading states for all API calls

## 9. Performance Considerations

- Clinical trial data can be large - implement pagination
- Cache frequently searched drugs/conditions
- Use `response_length` parameter to control data size
- Consider implementing result filtering on frontend
- Batch API calls when searching multiple sources

## 10. Compliance and Safety Notes

- Always display drug warnings and contraindications prominently
- Include disclaimers that this is not medical advice
- Ensure clinical trial status is clearly visible
- Link to official sources (FDA, ClinicalTrials.gov)
- Consider implementing user consent for medical information display