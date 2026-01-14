"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useTheme } from "next-themes";
import Image from "next/image";

const logos = [
  {
    name: "PubMed Literature",
    src: "/pubmed.svg",
    description: "Access PubMed biomedical literature",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for biomedical literature
response = valyu.search(
    "pembrolizumab efficacy in NSCLC",
    included_sources=["valyu/valyu-pubmed"]
    # or leave included_sources empty and we'll figure it out for you
)

# Access the results
for result in response.results:
    print(f"Title: {result.title}")
    print(f"Content: {result.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for biomedical literature
const response = await valyu.search({
    query: 'pembrolizumab efficacy in NSCLC',
    includedSources: ['valyu/valyu-pubmed'],
    // or leave included_sources empty and we'll figure it out for you
});

// Access the results
response.results.forEach(result => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "pembrolizumab efficacy in NSCLC",
    "included_sources": ["valyu/valyu-pubmed"] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "arXiv Papers",
    src: "/arxiv.svg",
    description: "Search academic papers from arXiv",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for academic papers
response = valyu.search(
    "transformer architecture attention mechanism",
    included_sources=["valyu/valyu-arxiv"] # or leave this empty and we'll figure it out for you
)

# Get paper details
for paper in response.results:
    print(f"Title: {paper.title}")
    print(f"Authors: {paper.metadata.get('authors', [])}")
    print(f"Abstract: {paper.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for academic papers
const response = await valyu.search({
    query: 'transformer architecture attention mechanism',
    includedSources: ['valyu/valyu-arxiv'], // or leave this empty and we'll figure it out for you
});

// Get paper details
response.results.forEach(paper => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "transformer architecture attention mechanism",
    "included_sources": ["valyu/valyu-arxiv"] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "Clinical Trials",
    src: "/clinicaltrials.svg",
    description: "Clinical trial data from ClinicalTrials.gov",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for clinical trials
response = valyu.search(
    "pembrolizumab NSCLC Phase 3 trials",
    included_sources=[
        "valyu/valyu-clinical-trials"
    ] # or leave this empty and we'll figure it out for you
)

# Extract clinical trial data
for trial in response.results:
    print(f"Trial ID: {trial.metadata.get('nct_id')}")
    print(f"Phase: {trial.metadata.get('phase')}")
    print(f"Status: {trial.metadata.get('status')}")
    print(f"Data: {trial.content}")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for clinical trials
const response = await valyu.search({
    query: 'pembrolizumab NSCLC Phase 3 trials',
    includedSources: [
        "valyu/valyu-clinical-trials"
    ], // or leave this empty and we'll figure it out for you
});

// Extract clinical trial data
response.results.forEach(trial => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "pembrolizumab NSCLC Phase 3 trials",
    "included_sources": [
        "valyu/valyu-clinical-trials"
    ] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "FDA Drug Labels",
    src: "/fda.svg",
    description: "FDA-approved drug information and labels",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for FDA drug information
response = valyu.search(
    "pembrolizumab FDA label dosing information",
    included_sources=[
        'valyu/valyu-fda-drug-labels'
    ] # or leave this empty and we'll figure it out for you
)

# Get drug information
for drug in response.results:
    print(f"Drug: {drug.metadata.get('drug_name')}")
    print(f"Indication: {drug.metadata.get('indication')}")
    print(f"Label Info: {drug.content}")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for FDA drug information
const response = await valyu.search({
    query: 'pembrolizumab FDA label dosing information',
    includedSources: [
        'valyu/valyu-fda-drug-labels'
    ], // or leave this empty and we'll figure it out for you
});

// Get drug information
response.results.forEach(drug => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "pembrolizumab FDA label dosing information",
    "included_sources": [
        "valyu/valyu-fda-drug-labels"
    ] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "Web Search",
    src: "/web.svg",
    description: "General web search with relevance scoring",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search across the web
response = valyu.search(
    "CRISPR gene therapy latest developments 2024"
)

# Get ranked results
for result in response.results:
    print(f"Title: {result.title}")
    print(f"URL: {result.metadata.get('url')}")
    print(f"Relevance: {result.metadata.get('relevance_score')}")
    print(f"Content: {result.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search across the web
const response = await valyu.search({
    query: 'CRISPR gene therapy latest developments 2024'
});

// Get ranked results
response.results.forEach(result => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "CRISPR gene therapy latest developments 2024"
  }'`,
      },
    ],
  },
  {
    name: "Wiley",
    src: "/wy.svg",
    description: "Academic research from Wiley publications",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search Wiley research publications
response = valyu.search(
    "immunotherapy mechanisms of action",
    included_sources=[
        "valyu/wiley-biomedical-books",
        "valyu/wiley-biomedical-papers"
    ] # or leave this empty and we'll pick the best sources for you
)

# Access research papers
for paper in response.results:
    print(f"Title: {paper.title}")
    print(f"Journal: {paper.metadata.get('journal')}")
    print(f"DOI: {paper.metadata.get('doi')}")
    print(f"Abstract: {paper.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search Wiley research publications
const response = await valyu.search({
    query: 'immunotherapy mechanisms of action',
    includedSources: [
        "valyu/wiley-biomedical-books",
        "valyu/wiley-biomedical-papers"
    ], // or leave this empty and we'll pick the best sources for you
});

// Access research papers
response.results.forEach(paper => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "immunotherapy mechanisms of action",
    "included_sources": [
        "valyu/wiley-biomedical-books",
        "valyu/wiley-biomedical-papers"
    ] # or leave this empty and we'll pick the best sources for you
  }'`,
      },
    ],
  },
  {
    name: "ChEMBL",
    src: "/web.svg",
    description: "Bioactive compounds and drug discovery data",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for bioactive compounds
response = valyu.search(
    "EGFR kinase inhibitors bioactivity",
    included_sources=["valyu/valyu-chembl"]
)

# Get compound details
for compound in response.results:
    print(f"Compound: {compound.title}")
    print(f"Target: {compound.metadata.get('target')}")
    print(f"Activity: {compound.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for bioactive compounds
const response = await valyu.search({
    query: 'EGFR kinase inhibitors bioactivity',
    includedSources: ['valyu/valyu-chembl'],
});

// Get compound details
response.results.forEach(compound => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "EGFR kinase inhibitors bioactivity",
    "included_sources": ["valyu/valyu-chembl"]
  }'`,
      },
    ],
  },
  {
    name: "DrugBank",
    src: "/web.svg",
    description: "Comprehensive drug database with pharmacology data",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for drug information
response = valyu.search(
    "metformin mechanism of action diabetes",
    included_sources=["valyu/valyu-drugbank"]
)

# Get drug details
for drug in response.results:
    print(f"Drug: {drug.title}")
    print(f"Mechanism: {drug.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for drug information
const response = await valyu.search({
    query: 'metformin mechanism of action diabetes',
    includedSources: ['valyu/valyu-drugbank'],
});

// Get drug details
response.results.forEach(drug => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "metformin mechanism of action diabetes",
    "included_sources": ["valyu/valyu-drugbank"]
  }'`,
      },
    ],
  },
  {
    name: "Open Targets",
    src: "/web.svg",
    description: "Drug target validation and disease associations",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for drug targets
response = valyu.search(
    "BRCA1 breast cancer genetic associations",
    included_sources=["valyu/valyu-open-targets"]
)

# Get target validation data
for target in response.results:
    print(f"Target: {target.title}")
    print(f"Disease: {target.metadata.get('disease')}")
    print(f"Evidence: {target.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for drug targets
const response = await valyu.search({
    query: 'BRCA1 breast cancer genetic associations',
    includedSources: ['valyu/valyu-open-targets'],
});

// Get target validation data
response.results.forEach(target => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "BRCA1 breast cancer genetic associations",
    "included_sources": ["valyu/valyu-open-targets"]
  }'`,
      },
    ],
  },
  {
    name: "NPI Registry",
    src: "/web.svg",
    description: "US healthcare provider directory",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for healthcare providers
response = valyu.search(
    "oncology specialists New York",
    included_sources=["valyu/valyu-npi-registry"]
)

# Get provider details
for provider in response.results:
    print(f"Provider: {provider.title}")
    print(f"Specialty: {provider.metadata.get('specialty')}")
    print(f"Location: {provider.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for healthcare providers
const response = await valyu.search({
    query: 'oncology specialists New York',
    includedSources: ['valyu/valyu-npi-registry'],
});

// Get provider details
response.results.forEach(provider => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "oncology specialists New York",
    "included_sources": ["valyu/valyu-npi-registry"]
  }'`,
      },
    ],
  },
  {
    name: "WHO ICD Codes",
    src: "/assets/banner/who.png",
    description: "International Classification of Diseases (ICD-10/11)",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for ICD codes
response = valyu.search(
    "diabetes mellitus type 2 ICD code",
    included_sources=["valyu/valyu-who-icd"]
)

# Get ICD code details
for code in response.results:
    print(f"Code: {code.title}")
    print(f"Description: {code.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for ICD codes
const response = await valyu.search({
    query: 'diabetes mellitus type 2 ICD code',
    includedSources: ['valyu/valyu-who-icd'],
});

// Get ICD code details
response.results.forEach(code => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "diabetes mellitus type 2 ICD code",
    "included_sources": ["valyu/valyu-who-icd"]
  }'`,
      },
    ],
  },
];

const DataSourceLogos = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const controls = useAnimation();
  const animationRef = useRef<any>(null);
  const currentPositionRef = useRef(0);
  const animationStartTimeRef = useRef(0);

  // All logos from assets/banner
  const allLogos = [
    { name: "PubMed", src: "/assets/banner/pubmed.png" },
    { name: "ClinicalTrials", src: "/assets/banner/clinicaltrials.png" },
    { name: "bioRxiv", src: "/assets/banner/biorxiv.png" },
    { name: "medRxiv", src: "/assets/banner/medrxiv.png" },
    { name: "arXiv", src: "/assets/banner/arxiv.png" },
    { name: "DailyMed", src: "/assets/banner/dailymed.png" },
    { name: "WHO", src: "/assets/banner/who.png" },
    { name: "Wikipedia", src: "/assets/banner/wikipedia.png" },
    { name: "USPTO", src: "/assets/banner/uspto.png" },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...allLogos, ...allLogos, ...allLogos];

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Start continuous animation
  useEffect(() => {
    const animate = async () => {
      currentPositionRef.current = 0;
      animationStartTimeRef.current = Date.now();

      await controls.start({
        x: [0, -100 * allLogos.length],
        transition: {
          // ↓↓↓ Decrease duration by 1.5x for 1.5x speed ↑↑↑
          duration: (allLogos.length * 3) / 1.5,
          ease: "linear",
          repeat: Infinity,
        }
      });
    };

    animate();
  }, [controls, allLogos.length]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);

    // Calculate current position based on elapsed time
    const elapsedTime = Date.now() - animationStartTimeRef.current;
    const totalDuration = ((allLogos.length * 3) / 1.5) * 1000; // Convert to ms
    const progress = (elapsedTime % totalDuration) / totalDuration;
    currentPositionRef.current = -100 * allLogos.length * progress;

    controls.stop();
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);

    // Get current position from ref
    const currentX = currentPositionRef.current;
    const targetX = -100 * allLogos.length;
    const remainingDistance = Math.abs(targetX - currentX);
    const totalDistance = 100 * allLogos.length;

    // Calculate remaining duration to maintain constant speed
    const totalDuration = (allLogos.length * 3) / 1.5;
    const remainingDuration = (remainingDistance / totalDistance) * totalDuration;

    // Update animation start time for next cycle
    animationStartTimeRef.current = Date.now();

    // Resume from current position with calculated duration
    controls.start({
      x: targetX,
      transition: {
        duration: remainingDuration,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }
    });
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="relative w-full overflow-hidden py-4">
      <motion.div
        className="flex gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.div
          className="flex gap-12 flex-shrink-0"
          animate={controls}
        >
          {duplicatedLogos.map((logo, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={`${logo.name}-${index}`}
                className="relative flex-shrink-0"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                animate={{
                  scale: isHovered ? 1.3 : 1,
                }}
                transition={{
                  scale: { duration: 0.3 }
                }}
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    fill
                    className="object-contain transition-all duration-500"
                    style={{
                      filter: isHovered
                        ? 'grayscale(0%)'
                        : isDark
                          ? 'grayscale(100%) opacity(0.3) brightness(2)'
                          : 'grayscale(100%) opacity(0.3)',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Gradient edges for infinite scroll effect */}
      <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-[#F5F5F5] dark:from-gray-950 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-[#F5F5F5] dark:from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
};

export default DataSourceLogos;