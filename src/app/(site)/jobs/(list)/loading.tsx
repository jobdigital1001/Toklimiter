import { JobCardSkeleton } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="container-page py-8 sm:py-12" aria-busy="true" aria-label="Loading jobs">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <div className="hidden space-y-3 lg:block">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-5 h-9 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
