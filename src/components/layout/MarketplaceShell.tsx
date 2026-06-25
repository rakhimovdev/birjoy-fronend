import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { MarketplaceBottomNav } from '@/components/layout/MarketplaceNavigation';

export function MarketplaceShell({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="marketplace-shell">
      <Navbar />
      <div className={cn('marketplace-content', contentClassName)}>
        {children}
      </div>
      <MarketplaceBottomNav />
    </div>
  );
}
