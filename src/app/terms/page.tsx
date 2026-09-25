import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';

const lastUpdated = 'September 25, 2026';

const sections = [
  {
    title: "1. Agreement",
    body:
      "By creating an account or using the BirJoy website or the BirJoy apps for iOS and Android, you agree to these Terms of Use and to our Privacy Policy. If you do not agree, do not use BirJoy.",
  },
  {
    title: "2. Who Can Use BirJoy",
    body:
      "You must be old enough to enter into a binding agreement under the law where you live. You are responsible for the accuracy of the information in your account and for everything done with it.",
  },
  {
    title: "3. No Tolerance for Objectionable Content or Abusive Users",
    body:
      "BirJoy has zero tolerance for objectionable content and abusive behaviour. You must not post listings, photos or messages that are illegal, fraudulent, sexually explicit, hateful, threatening, harassing, violent, or that infringe someone else's rights, and you must not use chat to spam, scam or abuse other users. We remove such content and suspend or permanently remove the accounts responsible.",
  },
  {
    title: "4. Listings",
    body:
      "You may only list goods, property, vehicles, food and services you are entitled to offer, with honest descriptions, prices and photos. Prohibited items include weapons, drugs, counterfeit goods, stolen property and anything else whose sale is illegal in Uzbekistan. Listings are checked by automated and human moderation and may be rejected or removed.",
  },
  {
    title: "5. Chat",
    body:
      "Chat exists so buyers and sellers can agree on a deal. Keep it respectful and on topic. Never send money in advance to someone you have not met or verified.",
  },
  {
    title: "6. Reporting and Blocking",
    body:
      "You can report a listing from its page, report a conversation from its menu or by long-pressing a message, and block a user from any conversation. BirJoy reviews reports within 24 hours and acts on them, including removing content and the accounts that posted it.",
  },
  {
    title: "7. Deals Between Users",
    body:
      "BirJoy is a marketplace: sales are made directly between users. BirJoy is not a party to them, does not handle payments, and does not guarantee the quality, safety or legality of anything listed.",
  },
  {
    title: "8. Ending Your Use",
    body:
      "You can delete your account at any time from the profile page in the app or through the account deletion page. We may suspend or end access for anyone who breaks these terms.",
  },
  {
    title: "9. Liability",
    body:
      "BirJoy is provided as is. To the extent the law allows, BirJoy is not liable for losses arising from deals between users or from content posted by users.",
  },
  {
    title: "10. Changes",
    body:
      "We may update these terms. When we do, we change the date above; continuing to use BirJoy means you accept the updated terms.",
  },
  {
    title: "11. Contact",
    body:
      "Questions about these terms: phone +998 33 258 04 04 or Telegram @bir_joyuz.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_46%,_#ff730a_110%)] p-5 text-white shadow-[0_28px_70px_rgba(7,28,85,0.18)] sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                <FileText className="h-4 w-4" />
                BirJoy Terms of Use
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight min-[481px]:text-4xl md:text-5xl">
                The rules for using the BirJoy marketplace
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
                These terms cover the BirJoy website and the BirJoy apps for iOS and Android.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-sm backdrop-blur">
              <p className="font-semibold">Last updated</p>
              <p className="mt-1 text-white/80">{lastUpdated}</p>
            </div>
          </div>
        </section>

        <section className="surface-card mt-8 rounded-[2rem] p-5 sm:p-8 md:p-10">
          <div className="mb-8 flex items-center gap-3 text-foreground">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em]">
              What you agree to by using BirJoy
            </p>
          </div>

          <div className="space-y-8">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 min-[481px]:flex-row min-[481px]:flex-wrap">
          <Button asChild variant="outline" className="w-full gap-2 min-[481px]:w-auto">
            <Link href="/privacy-policy">
              Privacy policy
            </Link>
          </Button>
          <Button asChild className="w-full gap-2 min-[481px]:w-auto">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to BirJoy
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
