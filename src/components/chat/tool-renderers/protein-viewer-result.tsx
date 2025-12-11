"use client";

import { useState, useEffect, useRef, memo } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";

// Utility function to load PDBe Molstar scripts from CDN
const loadMolstarScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).PDBeMolstarPlugin) {
      resolve();
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pdbe-molstar@latest/build/pdbe-molstar.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdbe-molstar@latest/build/pdbe-molstar-component.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Molstar script'));
    document.head.appendChild(script);
  });
};

interface ProteinViewerResultProps {
  pdbId: string;
  proteinName: string;
  searchScore?: number;
  structureId?: string;
}

export const MemoizedProteinViewerResult = memo(function ProteinViewerResult({
  pdbId,
  proteinName,
  searchScore,
  structureId,
}: ProteinViewerResultProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement | null>(null);

  // Initialize viewer
  useEffect(() => {
    let mounted = true;

    const initViewer = async () => {
      try {
        // Load Molstar scripts
        await loadMolstarScript();

        if (!mounted) return;

        // Wait for custom elements to be defined
        await customElements.whenDefined('pdbe-molstar');

        if (!mounted || !containerRef.current) return;

        // Create viewer element
        const viewer = document.createElement('pdbe-molstar');
        viewer.setAttribute('molecule-id', pdbId.toLowerCase());
        viewer.setAttribute('hide-controls', 'true');
        viewer.setAttribute('landscape', 'true');
        viewer.setAttribute('bg-color-r', '255');
        viewer.setAttribute('bg-color-g', '255');
        viewer.setAttribute('bg-color-b', '255');

        // Clear container and append viewer
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(viewer);
        viewerRef.current = viewer;

        // Wait a moment for viewer to initialize
        setTimeout(() => {
          if (mounted) setLoading(false);
        }, 2000);

      } catch (err) {
        console.error('Failed to initialize protein viewer:', err);
        if (mounted) {
          setError('Failed to load protein structure viewer');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
      // Cleanup viewer element
      if (viewerRef.current) {
        viewerRef.current.remove();
        viewerRef.current = null;
      }
    };
  }, [pdbId]);

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{error}</span>
        </div>
        <p className="text-xs text-red-600 mt-2">
          Try viewing on{' '}
          <a
            href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-red-500"
          >
            RCSB PDB ↗
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Protein Viewer */}
      <div className="relative h-[550px] border border-gray-200 rounded-lg overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <span className="text-sm text-gray-600">
                Loading {proteinName}...
              </span>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

        {/* Overlay - Bottom Right */}
        {!loading && (
          <div className="absolute bottom-4 right-4 z-20">
            {/* PDB ID and Protein Name */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-gray-900">
                {pdbId.toUpperCase()}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-700">{proteinName}</span>
            </div>

            {/* External Links */}
            <div className="flex gap-2">
              <a
                href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                RCSB PDB
              </a>
              <a
                href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${pdbId.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                PDBe
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if pdbId changes
  return prevProps.pdbId === nextProps.pdbId;
});

MemoizedProteinViewerResult.displayName = 'MemoizedProteinViewerResult';
