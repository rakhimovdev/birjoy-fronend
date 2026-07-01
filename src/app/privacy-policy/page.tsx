import Link from 'next/link';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';

const lastUpdated = 'June 22, 2026';

const sections = [
  {
    title: '1. Scope',
    body:
      'This Privacy Policy explains how BirJoy collects, uses, shares, stores, and deletes personal information when you use the BirJoy website, Android application, marketplace listings, messaging and order request flows, or customer support channels.',
  },
  {
    title: '2. Data We Collect',
    body:
      'We may collect your name, email address, phone number, approximate location or manually entered city/district, Google account identifier for Google sign-in, profile image, favorites, listings you publish, uploaded listing photos, moderation results, order requests, device diagnostics, crash and connectivity data needed to operate the Android application, and support messages you send to BirJoy.',
  },
  {
    title: '3. How We Use Data',
    body:
      'BirJoy uses your data to create and secure your account, publish and moderate listings, show location-aware marketplace results, process order requests, prevent abuse and fraud, improve app stability, respond to support inquiries, and comply with legal obligations.',
  },
  {
    title: '4. Google Sign-In',
    body:
      'If you choose Google sign-in, BirJoy receives the verified Google identity token and basic account profile data required to authenticate you. We do not collect your Google password.',
  },
  {
    title: '5. Photos, Camera, and Files',
    body:
      'On Android, BirJoy requests access to the camera or photo picker only when you intentionally add listing images. Uploaded photos are used only to create or edit your marketplace listing.',
  },
  {
    title: '6. Location Data',
    body:
      'BirJoy currently relies on user-entered location details for listing and account setup. If device location is introduced later, it will only be requested when clearly needed for a user-facing feature and the privacy policy will be updated accordingly.',
  },
  {
    title: '7. Sharing',
    body:
      'BirJoy shares listing data, seller display name, listing images, and contact details that you explicitly publish to marketplace viewers. We may also share data with hosting, database, analytics, authentication, security, and content moderation providers strictly to operate the service.',
  },
  {
    title: '8. Retention',
    body:
      'Account and listing data are retained while your account is active. If you delete your account, BirJoy deletes your profile, your listings, and orders linked to your account from the operational system, except where retention is required by law or for narrowly tailored fraud-prevention records.',
  },
  {
    title: '9. Your Controls',
    body:
      'You can update your profile information, manage favorites, publish or remove listings, and delete your account from the BirJoy profile page inside the app. If you cannot access your account, use the public account deletion page for manual assistance.',
  },
  {
    title: '10. Security',
    body:
      'BirJoy uses authentication tokens, access controls, transport encryption on production endpoints, and least-privilege Android permissions to reduce risk. No internet-connected system can be guaranteed 100% secure, so please protect your account credentials and contact BirJoy immediately if you suspect misuse.',
  },
  {
    title: '11. Children',
    body:
      'BirJoy is not intended for children under 13, and marketplace transactions should only be conducted by users legally able to enter into such arrangements under local law.',
  },
  {
    title: '12. Contact',
    body:
      'For privacy or data deletion questions, contact BirJoy via phone at +998 33 258 04 04 or Telegram at @bir_joyuz. If you use this page in production, replace or supplement these channels with a monitored privacy email such as privacy@bir-joy.uz.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fffaf2_0%,_#f7f9ff_48%,_#ffffff_100%)]">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_46%,_#ff730a_110%)] p-5 text-white shadow-[0_28px_70px_rgba(7,28,85,0.18)] sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                <LockKeyhole className="h-4 w-4" />
                BirJoy Privacy Policy
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight min-[481px]:text-4xl md:text-5xl">
                Privacy and data handling for the BirJoy marketplace
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
                This template is suitable for the live website and the Android application package
                `uz.birjoy.app`.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-sm backdrop-blur">
              <p className="font-semibold">Last updated</p>
              <p className="mt-1 text-white/80">{lastUpdated}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#dbe4ff] bg-white p-5 shadow-[0_18px_50px_rgba(7,28,85,0.08)] sm:p-8 md:p-10">
          <div className="mb-8 flex items-center gap-3 text-[#071c55]">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em]">
              Recommended public privacy URL for Play Console
            </p>
          </div>

          <div className="space-y-8">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-xl font-bold tracking-tight text-[#071c55]">{section.title}</h2>
                <p className="mt-3 text-base leading-8 text-[#20305f]">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 min-[481px]:flex-row min-[481px]:flex-wrap">
          <Button asChild variant="outline" className="w-full gap-2 min-[481px]:w-auto">
            <Link href="/account-deletion">
              Account deletion page
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
