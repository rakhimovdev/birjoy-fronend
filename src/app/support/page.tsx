'use client';

import Link from 'next/link';
import { ArrowLeft, Clock, HelpCircle, Phone, Send, ShieldCheck, Trash2, Info } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';

const SUPPORT_PHONE = '+998332580404';
const SUPPORT_PHONE_LABEL = '+998 33 258 04 04';
const SUPPORT_TELEGRAM = 'https://t.me/bir_joyuz';
const SUPPORT_TELEGRAM_LABEL = '@bir_joyuz';

export default function SupportPage() {
  const { messages } = useI18n();
  const copy = messages.support;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/30 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_46%,_#ff730a_110%)] py-12 text-white sm:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_28%)]" />
          <div className="relative z-10 container mx-auto max-w-4xl px-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur">
              <HelpCircle className="h-4 w-4" />
              {copy.title}
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight min-[481px]:text-4xl md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/82 min-[481px]:text-lg">
              {copy.description}
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {copy.contactTitle}
          </h2>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/55 px-4 py-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            {copy.hours}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="surface-card group flex flex-col gap-2 rounded-[1.75rem] border border-border/70 p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold text-foreground">{copy.phoneTitle}</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{copy.phoneDescription}</p>
              <span className="mt-1 text-base font-semibold text-primary">{SUPPORT_PHONE_LABEL}</span>
            </a>

            <a
              href={SUPPORT_TELEGRAM}
              target="_blank"
              rel="noreferrer"
              className="surface-card group flex flex-col gap-2 rounded-[1.75rem] border border-border/70 p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Send className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold text-foreground">{copy.telegramTitle}</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{copy.telegramDescription}</p>
              <span className="mt-1 text-base font-semibold text-primary">{SUPPORT_TELEGRAM_LABEL}</span>
            </a>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{copy.responseNote}</p>
        </section>

        <section className="border-t border-border/60 bg-secondary/30">
          <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {copy.faqTitle}
            </h2>

            <div className="mt-6 space-y-4">
              {copy.faq.map((item) => (
                <article
                  key={item.question}
                  className="surface-card rounded-[1.75rem] border border-border/70 p-6"
                >
                  <h3 className="text-base font-bold text-foreground md:text-lg">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {copy.linksTitle}
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href="/privacy-policy"
              className="surface-card flex items-center gap-3 rounded-[1.5rem] border border-border/70 p-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              {copy.privacyLink}
            </Link>
            <Link
              href="/account-deletion"
              className="surface-card flex items-center gap-3 rounded-[1.5rem] border border-border/70 p-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <Trash2 className="h-5 w-5 shrink-0 text-primary" />
              {copy.deletionLink}
            </Link>
            <Link
              href="/about"
              className="surface-card flex items-center gap-3 rounded-[1.5rem] border border-border/70 p-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <Info className="h-5 w-5 shrink-0 text-primary" />
              {copy.aboutLink}
            </Link>
          </div>

          <Button asChild variant="outline" className="mt-8 w-full gap-2 min-[481px]:w-auto">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {copy.backHome}
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
