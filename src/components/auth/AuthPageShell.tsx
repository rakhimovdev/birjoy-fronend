import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/BrandLogo';

type AuthPageShellProps = {
  badge: string;
  title: string;
  description: string;
  highlights: readonly string[];
  footerText: string;
  footerActionLabel: string;
  footerActionHref: string;
  children: React.ReactNode;
};

export function AuthPageShell({
  badge,
  title,
  description,
  highlights,
  footerText,
  footerActionLabel,
  footerActionHref,
  children,
}: AuthPageShellProps) {
  return (
    <main className="relative overflow-hidden bg-transparent px-4 py-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-stretch gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:gap-8">
        <section className="surface-card hidden rounded-[2.2rem] p-6 backdrop-blur md:block lg:p-10">
          <BrandLogo size="lg" showTagline className="mb-8" />
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-[0_10px_22px_rgba(11,72,214,0.08)]">
            <ShieldCheck className="h-4 w-4" />
            {badge}
          </div>
          <h1 className="mt-6 font-headline text-4xl font-black tracking-tight text-foreground lg:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground lg:text-lg">{description}</p>
          <div className="mt-8 grid gap-4 text-sm text-muted-foreground">
            {highlights.map((highlight) => (
              <div key={highlight} className="rounded-[1.35rem] border border-border/70 bg-background/72 p-4 shadow-[0_12px_28px_rgba(7,28,85,0.05)]">
                {highlight}
              </div>
            ))}
          </div>
        </section>

        <Card className="surface-card rounded-[1.9rem]">
          <CardHeader className="space-y-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <div className="inline-flex w-fit items-center rounded-full border border-accent/20 bg-accent/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
              {badge}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</CardTitle>
            <CardDescription className="text-sm leading-7 sm:text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
            {children}
            <p className="text-center text-sm text-muted-foreground">
              {footerText}{' '}
              <Link
                href={footerActionHref}
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {footerActionLabel}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
