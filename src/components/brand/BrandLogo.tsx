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
    gap: 'gap-2 sm:gap-2.5',
    mark: 'h-9 w-9 min-[481px]:h-10 min-[481px]:w-10',
    title: 'text-[1.72rem] min-[481px]:text-[1.9rem] sm:text-[2rem]',
    tagline: 'text-[0.58rem] tracking-[0.34em]',
    line: 'w-5',
  },
  md: {
    gap: 'gap-2.5 sm:gap-3',
    mark: 'h-10 w-10 sm:h-12 sm:w-12',
    title: 'text-[2.1rem] sm:text-[2.45rem]',
    tagline: 'text-[0.65rem] tracking-[0.38em]',
    line: 'w-6 sm:w-8',
  },
  lg: {
    gap: 'gap-3 sm:gap-4',
    mark: 'h-14 w-14 sm:h-16 sm:w-16',
    title: 'text-[2.8rem] sm:text-[3.4rem]',
    tagline: 'text-[0.72rem] sm:text-xs tracking-[0.36em] sm:tracking-[0.42em]',
    line: 'w-8 sm:w-10',
  },
  hero: {
    gap: 'gap-3 sm:gap-4 lg:gap-5',
    mark: 'h-16 w-16 min-[481px]:h-20 min-[481px]:w-20 lg:h-24 lg:w-24',
    title: 'text-[3rem] min-[481px]:text-[3.7rem] lg:text-[4.8rem]',
    tagline: 'text-[0.68rem] min-[481px]:text-xs lg:text-sm tracking-[0.34em] min-[481px]:tracking-[0.42em] lg:tracking-[0.52em]',
    line: 'w-8 min-[481px]:w-10 lg:w-14',
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
    <div className={cn('inline-flex shrink-0 flex-nowrap items-center', styles.gap, className)}>
      <BrandMark className={cn(styles.mark, markClassName)} />

      <div className="shrink-0 whitespace-nowrap flex flex-col justify-center leading-none">
        <div className={cn('whitespace-nowrap font-headline font-extrabold tracking-tight', styles.title)}>
          <span className="[color:var(--brand-wordmark-primary)]">Bir</span>
          <span className="text-[#FF730A]">Joy</span>
        </div>

        {showTagline ? (
          <div className="mt-2 flex items-center gap-2 sm:gap-3 [color:var(--brand-tagline-color)]">
            <span className={cn('h-px rounded-full [background:var(--brand-tagline-line)]', styles.line)} />
            <span className={cn('font-body uppercase', styles.tagline)}>{tagline}</span>
            <span className={cn('h-px rounded-full [background:var(--brand-tagline-line)]', styles.line)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
