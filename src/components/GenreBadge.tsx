import { cn } from '@/lib/utils';

const genreStyles: Record<string, string> = {
  Adventure: 'bg-[hsl(var(--genre-adventure)/0.15)] text-[hsl(var(--genre-adventure))] border-[hsl(var(--genre-adventure)/0.25)]',
  Fantasy: 'bg-[hsl(var(--genre-fantasy)/0.15)] text-[hsl(var(--genre-fantasy))] border-[hsl(var(--genre-fantasy)/0.25)]',
  Animals: 'bg-[hsl(var(--genre-animals)/0.15)] text-[hsl(var(--genre-animals))] border-[hsl(var(--genre-animals)/0.25)]',
  Action: 'bg-[hsl(var(--genre-action)/0.15)] text-[hsl(var(--genre-action))] border-[hsl(var(--genre-action)/0.25)]',
  Mystery: 'bg-[hsl(var(--genre-mystery)/0.15)] text-[hsl(var(--genre-mystery))] border-[hsl(var(--genre-mystery)/0.25)]',
  'Sci-Fi': 'bg-[hsl(var(--genre-sci-fi)/0.15)] text-[hsl(var(--genre-sci-fi))] border-[hsl(var(--genre-sci-fi)/0.25)]',
  Classic: 'bg-[hsl(var(--genre-classic)/0.15)] text-[hsl(var(--genre-classic))] border-[hsl(var(--genre-classic)/0.25)]',
};

interface GenreBadgeProps {
  genre: string;
  className?: string;
}

const GenreBadge = ({ genre, className }: GenreBadgeProps) => {
  const style = genreStyles[genre] ?? 'bg-secondary text-secondary-foreground border-transparent';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        style,
        className
      )}
    >
      {genre}
    </span>
  );
};

export default GenreBadge;
