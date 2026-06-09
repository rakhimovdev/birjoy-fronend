'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ad } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

interface AdCardProps {
  ad: Ad;
  className?: string;
  isFavorite?: boolean;
}

export function AdCard({ ad, className, isFavorite = false }: AdCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className={cn("overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50", className)}>
      <Link href={`/ads/${ad.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <Image
          src={ad.images[0]}
          alt={ad.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          data-ai-hint="classified ad product"
        />
        {ad.isFeatured && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground font-bold">
            FEATURED
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors",
            isFavorite ? "text-red-500" : "text-muted-foreground"
          )}
          onClick={(e) => {
            e.preventDefault();
            // Toggle favorite logic
          }}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
        </Button>
      </Link>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xl font-bold text-primary">${ad.price.toLocaleString()}</span>
        </div>
        <Link href={`/ads/${ad.id}`} className="block mb-3">
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {ad.title}
          </h3>
        </Link>
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{ad.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{mounted ? `${formatDistanceToNow(new Date(ad.createdAt))} ago` : 'Loading...'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
