import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';

const deletionItems = [
  'Your BirJoy profile and account access',
  'Listings published under your account',
  'Order records linked directly to your account or listings in the operational system',
  'Saved favorites associated with your account profile',
];

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fffaf2_0%,_#f7f9ff_48%,_#ffffff_100%)]">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-[#dbe4ff] bg-white p-8 shadow-[0_18px_50px_rgba(7,28,85,0.08)] md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-[#f8fbff] px-4 py-1.5 text-sm font-semibold text-[#071c55]">
            <Trash2 className="h-4 w-4" />
            BirJoy account deletion
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#071c55] md:text-5xl">
            Delete your BirJoy account and associated marketplace data
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#20305f] md:text-lg">
            BirJoy supports in-app account deletion. If you can sign in, the fastest path is to
            open your profile and tap <strong>Delete Account</strong>. If you cannot access the
            account, use the contact options below and request deletion from your registered phone
            number or email.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <article className="rounded-[1.75rem] border border-[#dbe4ff] bg-[#f8fbff] p-6">
              <h2 className="text-xl font-bold text-[#071c55]">What is deleted</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#20305f]">
                {deletionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.75rem] border border-[#dbe4ff] bg-white p-6">
              <div className="flex items-center gap-2 text-[#071c55]">
                <ShieldAlert className="h-5 w-5" />
                <h2 className="text-xl font-bold">Manual request channels</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#20305f]">
                <p>Phone: <a className="font-semibold text-[#0b48d6]" href="tel:+998332580404">+998 33 258 04 04</a></p>
                <p>Telegram: <a className="font-semibold text-[#0b48d6]" href="https://t.me/bir_joyuz" target="_blank" rel="noreferrer">@bir_joyuz</a></p>
                <p>
                  Recommended production addition: a monitored mailbox such as
                  <span className="font-semibold"> privacy@bir-joy.uz</span>.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild>
              <Link href="/profile">Open profile</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to BirJoy
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
