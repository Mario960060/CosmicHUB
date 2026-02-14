import { Star, StarHalf } from 'lucide-react';

interface PriorityStarsProps {
  priority: number;
  size?: number;
}

export function PriorityStars({ priority, size = 16 }: PriorityStarsProps) {
  const fullStars = Math.floor(priority);
  const hasHalfStar = priority % 1 !== 0;

  return (
    <div className="flex items-center gap-0.5 text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={i} size={size} fill="currentColor" />
      ))}
      {hasHalfStar && (
        <StarHalf size={size} fill="currentColor" />
      )}
    </div>
  );
}
