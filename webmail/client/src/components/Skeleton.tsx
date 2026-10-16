interface SkeletonProps {
  className?: string;
}

/** Bloc animé de chargement. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`shimmer-bg rounded-md ${className}`} />
  );
}

/** Squelette de la liste des messages. */
export function ListSkeleton() {
  return (
    <ul className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="flex items-start gap-3 px-3 py-3.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Squelette du panneau de lecture. */
export function ReaderSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-hidden="true">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
