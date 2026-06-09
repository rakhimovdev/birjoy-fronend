'use client';

import Link from 'next/link';
import { Search, PlusCircle, User, Heart, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CURRENT_USER } from '@/lib/mock-data';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">Market<span className="text-accent">Nest</span></span>
          </Link>
          <div className="hidden md:flex relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search for anything..." 
              className="pl-10 bg-muted/50 focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/ads/create" className="hidden sm:flex">
            <Button className="gap-2 font-semibold">
              <PlusCircle className="h-4 w-4" />
              Post Ad
            </Button>
          </Link>

          <Link href="/profile?tab=favorites" className="hidden md:flex p-2 text-muted-foreground hover:text-primary transition-colors">
            <Heart className="h-6 w-6" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarImage src={CURRENT_USER.photoUrl} alt={CURRENT_USER.name} />
                  <AvatarFallback>{CURRENT_USER.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{CURRENT_USER.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{CURRENT_USER.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile?tab=ads" className="cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>My Ads</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile?tab=favorites" className="cursor-pointer">
                  <Heart className="mr-2 h-4 w-4" />
                  <span>Favorites</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
