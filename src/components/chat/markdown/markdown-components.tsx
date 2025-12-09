"use client";

import React from "react";
import Image from "next/image";
import katex from "katex";

// Enhanced markdown components that handle both math and biomedical content
export const markdownComponents = {
  img: ({ src, alt, ...props }: any) => {
    // Don't render image if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }

    // Validate URL for regular images - must be absolute URL or start with /
    try {
      // Check if it's a valid absolute URL
      new URL(src);
    } catch {
      // Check if it starts with / (valid relative path for Next.js)
      if (!src.startsWith('/') && !src.startsWith('csv:') && !src.match(/^\/api\/(charts|csvs)\//)) {
        return (
          <span className="text-xs text-muted-foreground italic">
            [Image: {alt || src}]
          </span>
        );
      }
    }

    return <Image src={src} alt={alt || ""} width={500} height={300} {...props} />;
  },
  iframe: ({ src, ...props }: any) => {
    // Don't render iframe if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }
    return <iframe src={src} {...props} />;
  },
  math: ({ children }: any) => {
    // Render math content using KaTeX
    const mathContent =
      typeof children === "string" ? children : children?.toString() || "";

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return (
        <span
          dangerouslySetInnerHTML={{ __html: html }}
          className="katex-math"
        />
      );
    } catch (error) {
      return (
        <code className="math-fallback bg-muted px-1 rounded">
          {mathContent}
        </code>
      );
    }
  },
  // Handle academic XML tags commonly found in Wiley content
  note: ({ children }: any) => (
    <div className="bg-info/10 border-l-4 border-info pl-4 py-2 my-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-info font-medium">Note:</span>
        <div>{children}</div>
      </div>
    </div>
  ),
  t: ({ children }: any) => (
    <span className="font-mono text-sm bg-muted px-1 rounded">
      {children}
    </span>
  ),
  f: ({ children }: any) => (
    <span className="italic">{children}</span>
  ),
  // Handle other common academic tags
  ref: ({ children }: any) => (
    <span className="text-info text-sm">
      [{children}]
    </span>
  ),
  caption: ({ children }: any) => (
    <div className="text-sm text-muted-foreground italic text-center my-2">
      {children}
    </div>
  ),
  figure: ({ children }: any) => (
    <div className="my-4 p-2 border border-border rounded">
      {children}
    </div>
  ),
  // Fix paragraph wrapping for block elements (charts) to avoid hydration errors
  p: ({ children, ...props }: any) => {
    // Check if this paragraph contains any React component (like charts)
    const hasBlockContent = React.Children.toArray(children).some((child: any) => {
      return React.isValidElement(child) && typeof child.type !== 'string';
    });

    // If paragraph contains block content (like charts), render as div to avoid hydration errors
    if (hasBlockContent) {
      return <div {...props}>{children}</div>;
    }

    return <p {...props}>{children}</p>;
  },
};
