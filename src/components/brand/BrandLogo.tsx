'use client';

import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showTagline?: boolean;
  tagline?: string;
};

const sizeStyles = {
  sm: {
    gap: 'gap-2.5',
    mark: 'h-10 w-10',
    title: 'text-[2rem]',
    tagline: 'text-[0.58rem] tracking-[0.34em]',
    line: 'w-5',
  },
  md: {
    gap: 'gap-3',
    mark: 'h-12 w-12',
    title: 'text-[2.45rem]',
    tagline: 'text-[0.65rem] tracking-[0.38em]',
    line: 'w-8',
  },
  lg: {
    gap: 'gap-4',
    mark: 'h-16 w-16',
    title: 'text-[3.4rem]',
    tagline: 'text-xs tracking-[0.42em]',
    line: 'w-10',
  },
  hero: {
    gap: 'gap-5',
    mark: 'h-24 w-24',
    title: 'text-[4.8rem]',
    tagline: 'text-sm tracking-[0.52em]',
    line: 'w-14',
  },
} as const;

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 188 188"
      role="img"
      aria-label="BirJoy mark"
      className={cn('shrink-0 drop-shadow-[0_16px_26px_rgba(15,95,255,0.18)]', className)}
    >
      <defs>
        <linearGradient id="birjoy-blue" x1="40" y1="20" x2="150" y2="176" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1C78FF" />
          <stop offset="1" stopColor="#0B48D6" />
        </linearGradient>
        <linearGradient id="birjoy-orange" x1="110" y1="22" x2="178" y2="176" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF8A1F" />
          <stop offset="1" stopColor="#FF6500" />
        </linearGradient>
      </defs>

      <path
        fill="url(#birjoy-blue)"
        d="M57 16h20c11 0 20 9 20 20v43c13-13 30-20 49-20 21 0 41 8 56 22v33c0 33-27 60-60 60h-11c-33 0-60-27-60-60V16h-14Zm41 95c0 18 15 33 33 33s33-15 33-33-15-33-33-33-33 15-33 33Z"
      />
      <circle cx="131" cy="111" r="23" fill="#FFF9F1" />
      <path
        fill="url(#birjoy-orange)"
        d="M142 57h24v65c0 29-24 52-53 52h-26l22-27h3c16 0 30-13 30-30V57Z"
      />
      <circle cx="154" cy="34" r="13" fill="url(#birjoy-orange)" />
    </svg>
  );
}

export function BrandLogo({
  className,
  markClassName,
  size = 'md',
  showTagline = false,
  tagline = 'Hammasi bir joyda',
}: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn('inline-flex items-center', styles.gap, className)}>
      <BrandMark className={cn(styles.mark, markClassName)} />

      <div className="flex flex-col justify-center leading-none">
        <div className={cn('font-headline font-extrabold tracking-tight', styles.title)}>
          <span className="text-[#071C55]">Bir</span>
          <span className="text-[#FF730A]">Joy</span>
        </div>

        {showTagline ? (
          <div className="mt-2 flex items-center gap-3 text-[#20305F]/78">
            <span className={cn('h-px rounded-full bg-[#AEB8CE]', styles.line)} />
            <span className={cn('font-body uppercase', styles.tagline)}>{tagline}</span>
            <span className={cn('h-px rounded-full bg-[#AEB8CE]', styles.line)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
