interface SkeletonProps {
  className?: string;
}

/** Bloc animé de chargement. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`shimmer-bg rounded ${className}`} />;
}

/** Squelette de la liste, sur la mise en page des lignes Gmail. */
export function ListSkeleton() {
  return (
    <ul className="py-1" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="flex items-start gap-3 rounded-r-[16px] px-4 py-2.5">
          <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="mt-0.5 h-5 w-5 shrink-0" />
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
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2 pt-4">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
