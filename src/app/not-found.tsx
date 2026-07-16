import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="surface-card section-shell w-full max-w-2xl rounded-[1.85rem] text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <span className="section-kicker">404</span>
          <h1 className="section-title">Sahifa topilmadi</h1>
          <p className="section-caption">
            Eʼlon o‘chirilgan bo‘lishi yoki havola eskirgan bo‘lishi mumkin. Marketplace
            sahifasiga qaytib qidiruvni davom ettiring.
          </p>
          <Link
            href="/uy-joy"
            className="inline-flex min-h-11 items-center justify-center rounded-[1.1rem] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Eʼlonlarga qaytish
          </Link>
        </div>
      </section>
    </main>
  );
}
