'use client';

import Link from 'next/link';
import { ArrowLeft, Phone, Send } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Navbar } from '@/components/layout/Navbar';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const { messages } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/30 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_46%,_#ff730a_110%)] py-12 text-white sm:py-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_28%)]" />
          <div className="relative z-10 container mx-auto grid items-center gap-8 px-4 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur">
                {messages.about.title}
              </div>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight min-[481px]:text-4xl md:text-5xl lg:text-6xl">
                {messages.about.description}
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-white/82 min-[481px]:text-lg md:text-xl">
                {messages.about.paragraphTwo}
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[481px]:flex-row min-[481px]:flex-wrap">
                <Button asChild size="lg" className="w-full gap-2 bg-accent px-6 font-bold text-accent-foreground shadow-[0_18px_36px_rgba(255,115,10,0.28)] hover:bg-accent/90 min-[481px]:w-auto sm:px-8">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" />
                    {messages.about.backHome}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/18 min-[481px]:w-auto">
                  <a href="https://t.me/bir_joyuz" target="_blank" rel="noreferrer">
                    {messages.about.telegramLabel}
                  </a>
                </Button>
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-[0_30px_80px_rgba(4,18,58,0.35)] backdrop-blur-2xl sm:p-8">
              <BrandLogo size="lg" className="justify-center" />
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                  {messages.about.valuesTitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {messages.about.valuesItems.map((value) => (
                    <span
                      key={value}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white/88"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container mx-auto grid gap-8 px-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <article className="surface-card rounded-[2rem] p-6 md:p-8 lg:p-10">
              <div className="space-y-6 text-base leading-8 text-muted-foreground md:text-lg">
                <p>{messages.about.paragraphOne}</p>
                <p>{messages.about.paragraphTwo}</p>
              </div>
            </article>

            <aside className="rounded-[2rem] border border-border/70 bg-secondary/55 p-6 shadow-[var(--surface-shadow)] md:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{messages.about.contactTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {messages.about.contactDescription}
              </p>

              <div className="mt-8 space-y-4">
                <a
                  href="tel:+998332580404"
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-4 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:bg-card"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{messages.about.phoneLabel}: +998 33 258 04 04</span>
                </a>
                <a
                  href="https://t.me/bir_joyuz"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-4 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:bg-card"
                >
                  <Send className="h-5 w-5 text-primary" />
                  <span>{messages.about.telegramLabel}: @bir_joyuz</span>
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
