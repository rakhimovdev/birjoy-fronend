'use client';

import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Mail, Phone, MapPin, Package, Heart, Settings } from 'lucide-react';
import { CURRENT_USER, MOCK_ADS } from '@/lib/mock-data';
import { AdCard } from '@/components/ads/AdCard';

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'ads';

  const myAds = MOCK_ADS.filter(ad => ad.userId === CURRENT_USER.id);
  const favoriteAds = MOCK_ADS.filter(ad => CURRENT_USER.favorites.includes(ad.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar / User Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-8 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 border-4 border-primary/10">
                  <AvatarImage src={CURRENT_USER.photoUrl} alt={CURRENT_USER.name} />
                  <AvatarFallback>{CURRENT_USER.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{CURRENT_USER.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">Member since March 2024</p>
                <Badge variant="secondary" className="mb-6">Verified Seller</Badge>
                
                <div className="w-full space-y-3 text-sm text-left px-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{CURRENT_USER.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{CURRENT_USER.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{CURRENT_USER.location}</span>
                  </div>
                </div>
                
                <Button className="w-full mt-8 gap-2" variant="outline">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-1">
                <Button variant="ghost" className="w-full justify-start text-sm h-9 gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm h-9 gap-2 text-destructive hover:text-destructive">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content / Tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-white border">
                <TabsTrigger value="ads" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Package className="h-4 w-4" />
                  My Ads ({myAds.length})
                </TabsTrigger>
                <TabsTrigger value="favorites" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Heart className="h-4 w-4" />
                  Favorites ({favoriteAds.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ads">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myAds.length > 0 ? (
                    myAds.map(ad => (
                      <AdCard key={ad.id} ad={ad} isFavorite={CURRENT_USER.favorites.includes(ad.id)} />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-lg border">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-1">No ads yet</h3>
                      <p className="text-muted-foreground mb-6">Start selling items you no longer need.</p>
                      <Button asChild>
                        <a href="/ads/create">Post Your First Ad</a>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {favoriteAds.length > 0 ? (
                    favoriteAds.map(ad => (
                      <AdCard key={ad.id} ad={ad} isFavorite={true} />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-lg border">
                      <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-1">Your wishlist is empty</h3>
                      <p className="text-muted-foreground mb-6">Browse ads and save the ones you like.</p>
                      <Button asChild variant="outline">
                        <a href="/">Explore Market</a>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}