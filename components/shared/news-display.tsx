'use client';

import { useEffect, useState } from "react";

interface NewsArticle {
  headline: string;
  url: string;
  source: string;
  timestamp: string;
}

const NewsDisplay = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    async function fetchNews() {
      const response = await fetch('/api/news');
      const jsonData = await response.json();
      setNews(jsonData.news);
    }
    fetchNews();
  }, []);

  return (
    <div className="w-full max-w-6xl p-5 border rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-5">Latest News</h2>
      <div className="space-y-4">
        {news.map((article, index) => (
          <div key={index} className="border-b pb-2">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold hover:underline">
              {article.headline}
            </a>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span>{article.source}</span> - <span>{article.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsDisplay;
