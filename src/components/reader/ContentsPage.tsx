import { motion } from 'framer-motion';
import { BookOpen, ChevronRight } from 'lucide-react';

interface TocEntry { title: string; pageIndex: number; }

interface ContentsPageProps {
  book: any;
  toc: TocEntry[];
  onJumpToPage: (index: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

// Parse "CHAPTER I. A Scandal in Bohemia" → { num: "I.", title: "A Scandal in Bohemia" }
function parseHeading(heading: string): { num: string; title: string } {
  // "CHAPTER I." or "CHAPTER 3. Title"
  const m1 = heading.match(/^(?:CHAPTER|Chapter|SECTION|Section|PART|Part)\s+([IVXLCDM]+|[0-9]+)\.?\s*(.*)?$/);
  if (m1) return { num: m1[1] + '.', title: m1[2]?.trim() || '' };
  // "I. A Scandal in Bohemia"
  const m2 = heading.match(/^([IVXLCDM]{1,7})\.\s+(.*)/);
  if (m2) return { num: m2[1] + '.', title: m2[2].trim() };
  return { num: '', title: heading };
}

const ContentsPage = ({
  book, toc, onJumpToPage, hasMore, onLoadMore, loadingMore,
}: ContentsPageProps) => {
  return (
    <div className="w-full h-dvh flex-shrink-0 snap-start flex flex-col bg-background overflow-hidden">
      {/* Book header */}
      <div className="flex flex-col items-center pt-6 pb-4 px-6 flex-shrink-0">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${book.coverColor} flex items-center justify-center text-2xl shadow-md mb-2`}
        >
          {book.coverEmoji}
        </div>
        <h1 className="font-display text-xl font-bold text-foreground text-center leading-tight line-clamp-2">
          {book.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Contents</p>
      </div>

      <div className="h-px bg-border mx-6 flex-shrink-0" />

      {/* Chapter list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {toc.map((entry, i) => {
          const { num, title } = parseHeading(entry.title);
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => onJumpToPage(entry.pageIndex)}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted/50 active:bg-muted text-left transition-colors group border-b border-border/30 last:border-0"
            >
              {num && (
                <span className="text-xs font-bold text-muted-foreground w-7 flex-shrink-0 font-mono tabular-nums">
                  {num}
                </span>
              )}
              <span className="flex-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {title || entry.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
            </motion.button>
          );
        })}

        {/* "More chapters" entry if book was truncated */}
        {hasMore && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: toc.length * 0.03 + 0.1 }}
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-primary/10 active:bg-primary/20 text-left transition-colors mt-1 border border-dashed border-primary/30"
          >
            <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-primary">
              {loadingMore ? 'Loading next section…' : 'More chapters → Load Part 2'}
            </span>
            {!loadingMore && <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </motion.button>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center py-3 flex-shrink-0">
        <p className="text-xs text-muted-foreground">Tap a chapter to jump · Swipe up to read</p>
      </div>
    </div>
  );
};

export default ContentsPage;
