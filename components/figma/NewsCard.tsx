import { NewsItem } from '../types';
import { getTimeAgo, getSentimentColor } from '../../lib/utils';
import { ExternalLink } from 'lucide-react';

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="bg-card border border-border rounded-lg p-4 hover:border-muted transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h4 className="flex-1 line-clamp-2">{news.title}</h4>
        {news.sentiment && (
          <span
            className={`text-xs px-2 py-1 rounded ${getSentimentColor(news.sentiment)} bg-current/10`}
            aria-label={`Sentiment: ${news.sentiment}`}
          >
            {news.sentiment}
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{news.summary}</p>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{news.source}</span>
          <span>•</span>
          <time dateTime={news.publishedAt}>{getTimeAgo(news.publishedAt)}</time>
        </div>
        
        {news.relatedSymbols && news.relatedSymbols.length > 0 && (
          <div className="flex gap-1">
            {news.relatedSymbols.slice(0, 3).map((symbol) => (
              <span
                key={symbol}
                className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs"
              >
                {symbol}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <a
        href={news.url}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Read more
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
      </a>
    </article>
  );
}
