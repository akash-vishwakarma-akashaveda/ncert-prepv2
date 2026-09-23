import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = 'h-6 w-full' }) => (
  <div className={`skeleton-shimmer rounded-xl ${className}`} />
);

export const ClassGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="p-4 rounded-[14px] border-2 border-[#E3E5EC] bg-white space-y-3">
        <SkeletonBox className="h-6 w-16" />
        <SkeletonBox className="h-4 w-24" />
        <div className="flex gap-2 pt-2">
          <SkeletonBox className="h-5 w-12 rounded-full" />
          <SkeletonBox className="h-5 w-12 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export const ChapterListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="p-4 rounded-[14px] border-2 border-[#E3E5EC] bg-white flex items-center justify-between">
        <div className="space-y-2 flex-1 max-w-md">
          <SkeletonBox className="h-5 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
        <SkeletonBox className="h-9 w-24 rounded-xl" />
      </div>
    ))}
  </div>
);

export const PlayerSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="aspect-video w-full rounded-[22px] skeleton-shimmer" />
    <div className="space-y-2">
      <SkeletonBox className="h-7 w-3/4" />
      <SkeletonBox className="h-4 w-1/3" />
    </div>
  </div>
);
