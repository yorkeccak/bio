"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface NewsItem {
  title: string;
  url: string;
  image_url?: string | Record<string, string>;
  content: string;
  source: string;
  date?: string;
}

export function NewsCarousel() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [animationStartTime, setAnimationStartTime] = useState(Date.now());
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const motionRef = useRef<HTMLDivElement>(null);

  // Handle touch/mouse events for manual scrolling
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStart;
    setDragOffset(deltaX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setCurrentPosition((prev) => prev + dragOffset);
    setDragOffset(0);
  };

  // Calculate current position based on time elapsed
  const getCurrentPosition = () => {
    const now = Date.now();
    const elapsed = (now - animationStartTime) / 1000; // Convert to seconds
    const totalDuration = 60; // 60 seconds
    const progress = (elapsed % totalDuration) / totalDuration;

    return -200 * imageUrlPairs.length * progress;
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("/api/news");
        if (response.ok) {
          const data = await response.json();
          const newsItems = data.newsItems || [];

          // Filter to only include items with valid images
          const itemsWithImages = newsItems.filter((item: NewsItem) => {
            if (!item.image_url) return false;

            const imageUrl = item.image_url;
            if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
              return true;
            } else if (typeof imageUrl === "object" && imageUrl !== null) {
              const values = Object.values(imageUrl);
              return values.some(
                (val) => typeof val === "string" && val.startsWith("http")
              );
            }
            return false;
          });

          // If we have less than 5 items with images, try to fetch fresh news
          if (itemsWithImages.length < 5) {
            console.log("Not enough images, fetching fresh news...");
            const freshResponse = await fetch("/api/news?refresh=true");
            if (freshResponse.ok) {
              const freshData = await freshResponse.json();
              setNewsItems(freshData.newsItems || []);
            } else {
              setNewsItems(newsItems);
            }
          } else {
            setNewsItems(newsItems);
          }
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Function to validate if URL is a specific article
  const isValidArticle = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();

      // Additional client-side validation for article URLs
      const articlePatterns = [
        /\d{4}\/\d{2}\/\d{2}/, // Date pattern
        /\d{8}/, // 8-digit date
        /article/,
        /story/,
        /post/,
        /report/,
        /news\/\d{4}/, // news/2024 pattern
        /\/\d{4}\/\d{2}\//, // /2024/01/ pattern
      ];

      const aggregatorPatterns = [
        "/news/",
        "/headlines/",
        "/breaking/",
        "/latest/",
        "/category/",
        "/section/",
        "/topic/",
        "/tag/",
        "/search",
        "/results",
        "/archive",
        "/home",
        "/index",
        "/",
      ];

      // Simple validation - just exclude obvious non-articles
      const isNotLandingPage =
        !pathname.includes("category") &&
        !pathname.includes("section") &&
        !pathname.includes("tag") &&
        !pathname.includes("search") &&
        !pathname.includes("archive") &&
        pathname !== "/" &&
        pathname.length > 3;

      return isNotLandingPage;
    } catch {
      return false;
    }
  };

  // Function to generate images with their corresponding news URLs
  const generateImagesWithUrls = (
    newsData: NewsItem[]
  ): { image: string; url: string; title: string; source: string }[] => {
    const imageUrlPairs: {
      image: string;
      url: string;
      title: string;
      source: string;
    }[] = [];

    newsData.forEach((item) => {
      // Only process items with valid article URLs and valid images
      if (!isValidArticle(item.url) || !item.image_url) {
        return;
      }

      const imageUrl = item.image_url;
      let hasImage = false;

      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        imageUrlPairs.push({
          image: imageUrl,
          url: item.url,
          title: item.title,
          source: item.source,
        });
        hasImage = true;
      } else if (typeof imageUrl === "object" && imageUrl !== null) {
        const values = Object.values(imageUrl);
        values.forEach((val) => {
          if (typeof val === "string" && val.startsWith("http")) {
            imageUrlPairs.push({
              image: val,
              url: item.url,
              title: item.title,
              source: item.source,
            });
            hasImage = true;
          }
        });
      }
    });

    // Remove duplicates based on URL to ensure only one card per unique news
    const uniquePairs = imageUrlPairs.filter(
      (item, index, self) => index === self.findIndex((t) => t.url === item.url)
    );

    return uniquePairs;
  };

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

  const imageUrlPairs = generateImagesWithUrls(newsItems);

  if (imageUrlPairs.length === 0) {
    return (
      <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No news images available at the moment
        </p>
      </div>
    );
  }

  // Ensure we have enough items for smooth looping
  const minItemsForLoop = 5;
  if (imageUrlPairs.length < minItemsForLoop) {
    console.log(
      `Only ${imageUrlPairs.length} items available, may not loop smoothly`
    );
  }

  return (
    <div
      className="w-full h-24 overflow-hidden relative bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setAnimationStartTime(Date.now());
      }}
    >
      <motion.div
        ref={motionRef}
        className="flex h-full"
        animate={{
          x: isHovered ? currentPosition : -200 * imageUrlPairs.length,
        }}
        transition={{
          duration: isHovered ? 0 : 150,
          ease: "linear",
          repeat: isHovered ? 0 : Infinity,
          repeatType: "loop",
        }}
        onUpdate={(latest) => {
          if (!isHovered && typeof latest.x === "number") {
            setCurrentPosition(latest.x);
          }
        }}
      >
        {/* First set of items */}
        {imageUrlPairs.map((item, index) => (
          <motion.a
            key={`first-${index}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-36 h-24 mx-1 relative group cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-md">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                <p className="text-xs font-medium line-clamp-2 mb-0.5">
                  {item.title}
                </p>
                <p className="text-xs opacity-80">{item.source}</p>
              </div>
            </div>
          </motion.a>
        ))}
        {/* Duplicate set for seamless loop */}
        {imageUrlPairs.map((item, index) => (
          <motion.a
            key={`second-${index}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-36 h-24 mx-1 relative group cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-md">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                <p className="text-xs font-medium line-clamp-2 mb-0.5">
                  {item.title}
                </p>
                <p className="text-xs opacity-80">{item.source}</p>
              </div>
            </div>
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
