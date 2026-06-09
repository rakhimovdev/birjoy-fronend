'use client';

import { CATEGORIES } from '@/lib/mock-data';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export function CategoryBar() {
  return (
    <div className="w-full bg-white border-b overflow-x-auto scrollbar-hide">
      <div className="container mx-auto px-4 py-4 flex gap-8 justify-center min-w-max">
        {CATEGORIES.map((cat) => {
          const Icon = (Icons as any)[cat.icon] as LucideIcon;
          return (
            <button
              key={cat.id}
              className="flex flex-col items-center gap-2 group min-w-[80px]"
            >
              <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                {Icon && <Icon className="h-6 w-6" />}
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
