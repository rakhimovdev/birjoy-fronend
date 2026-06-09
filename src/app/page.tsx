
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryBar } from '@/components/ads/CategoryBar';
import { AdCard } from '@/components/ads/AdCard';
import { MOCK_ADS, CURRENT_USER } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Smartphone, Download } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const featuredAds = MOCK_ADS.filter(ad => ad.isFeatured);
  const latestAds = MOCK_ADS.filter(ad => !ad.isFeatured);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CategoryBar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full h-[400px] flex items-center overflow-hidden">
          {PlaceHolderImages[0] && (
            <Image
              src={PlaceHolderImages[0].imageUrl}
              alt="Marketplace Hero"
              fill
              className="object-cover brightness-50"
              priority
              data-ai-hint="online marketplace banner"
            />
          )}
          <div className="container mx-auto px-4 relative z-10 text-white max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight">
              Find Everything You Need at <span className="text-accent">MarketNest</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-light">
              The most reliable marketplace in Uzbekistan. Buy, sell, and discover amazing deals in your neighborhood.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8">
                Start Selling
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20">
                Explore Categories
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Ads */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-accent fill-accent" />
                <h2 className="text-2xl font-bold tracking-tight">Featured Listings</h2>
              </div>
              <Button variant="ghost" className="text-primary font-semibold gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredAds.map((ad) => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  isFavorite={CURRENT_USER.favorites.includes(ad.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Download App Section */}
        <section className="py-20 bg-muted/50 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold">
                  <Smartphone className="h-4 w-4" />
                  MOBILE APP AVAILABLE
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  MarketNest in Your Pocket. <br />
                  <span className="text-primary">Download Now.</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Get the best deals first! Download our app to get instant push notifications, 
                  chat with sellers in real-time, and manage your listings from anywhere.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-16 px-8 rounded-2xl flex items-center gap-4 transition-all hover:scale-105">
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] uppercase font-bold opacity-60">Download on the</span>
                      <span className="text-xl font-bold">App Store</span>
                    </div>
                  </Button>
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-16 px-8 rounded-2xl flex items-center gap-4 transition-all hover:scale-105">
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] uppercase font-bold opacity-60">Get it on</span>
                      <span className="text-xl font-bold">Google Play</span>
                    </div>
                  </Button>
                </div>
              </div>
              <div className="flex-1 relative w-full max-w-md aspect-[4/5]">
                {PlaceHolderImages[6] && (
                  <div className="relative w-full h-full transform lg:rotate-6 hover:rotate-0 transition-transform duration-700">
                    <Image
                      src={PlaceHolderImages[6].imageUrl}
                      alt="MarketNest App Interface"
                      fill
                      className="object-contain"
                      data-ai-hint="smartphone interface app"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Latest Ads */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Recent Postings</h2>
              <Button variant="ghost" className="text-primary font-semibold gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {latestAds.map((ad) => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  isFavorite={CURRENT_USER.favorites.includes(ad.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Stats / Trust Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-4xl font-bold mb-2">1M+</h3>
                <p className="text-white/70">Active Users</p>
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-2">500k+</h3>
                <p className="text-white/70">Ads Posted Monthly</p>
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-2">100+</h3>
                <p className="text-white/70">Cities Supported</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <span className="text-xl font-bold tracking-tight text-primary mb-4 block">MarketNest</span>
              <p className="text-sm text-muted-foreground">
                The most trusted classifieds platform in Uzbekistan. Buy and sell with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Electronics</li>
                <li>Vehicles</li>
                <li>Real Estate</li>
                <li>Jobs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Safety Rules</li>
                <li>Terms of Service</li>
                <li>Contact Us</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">MarketNest</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About Us</li>
                <li>Mobile Apps</li>
                <li>Business Solutions</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 MarketNest. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
