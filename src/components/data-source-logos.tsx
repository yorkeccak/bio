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