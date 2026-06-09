'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES } from '@/lib/mock-data';
import { Wand2, ImagePlus, Loader2, Languages, ShieldCheck, AlertCircle } from 'lucide-react';
import { smartAdDescriptionTool } from '@/ai/flows/smart-ad-description-tool';
import { adTitleCategorySuggestion } from '@/ai/flows/ad-title-category-suggestion';
import { translateAdDescription } from '@/ai/flows/ad-description-translation';
import { automateAdContentModeration } from '@/ai/flows/automated-ad-content-moderation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CreateAdPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<{ flagged: boolean; reason: string } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    price: '',
    description: '',
    location: '',
  });

  const [keywords, setKeywords] = useState<string[]>([]);

  const handleSmartImprove = async () => {
    if (!formData.title || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please enter a title and category first to get AI suggestions.",
        variant: "destructive"
      });
      return;
    }

    setAiLoading(true);
    try {
      const result = await smartAdDescriptionTool({
        title: formData.title,
        category: formData.category,
        description: formData.description
      });
      
      setFormData(prev => ({ ...prev, description: result.suggestedDescriptionImprovements }));
      setKeywords(result.relevantKeywords);
      
      toast({
        title: "AI Suggestions Applied",
        description: "We've enhanced your description and added relevant keywords.",
      });
    } catch (error) {
      toast({
        title: "AI Error",
        description: "Could not generate suggestions at this time.",
        variant: "destructive"
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslateToUzbek = async () => {
    if (!formData.description) return;
    setAiLoading(true);
    try {
      const result = await translateAdDescription({
        description: formData.description,
        targetLanguage: "Uzbek"
      });
      setFormData(prev => ({ ...prev, description: `${prev.description}\n\n[UZ]: ${result.translatedDescription}` }));
    } catch (error) {
      toast({ title: "Translation Failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Automatic Moderation Check
      const mod = await automateAdContentModeration({
        title: formData.title,
        description: formData.description
      });

      if (mod.flagged) {
        setModerationResult(mod);
        toast({
          title: "Moderation Notice",
          description: "Your ad content needs revision before publishing.",
          variant: "destructive"
        });
      } else {
        setModerationResult(null);
        toast({
          title: "Ad Submitted!",
          description: "Your listing is now being processed and will be live shortly.",
        });
        // Redirect or clear form
      }
    } catch (error) {
      toast({ title: "Error submitting ad", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-primary">Post a New Ad</h1>
          <p className="text-muted-foreground">Fill in the details below to reach thousands of potential buyers.</p>
        </div>

        {moderationResult?.flagged && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Content Flagged</AlertTitle>
            <AlertDescription>
              Our automated system detected issues: {moderationResult.reason}. Please revise your title or description.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g. iPhone 15 Pro Max, Brand New" 
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        placeholder="0.00" 
                        value={formData.price}
                        onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle>Description</CardTitle>
                    <CardDescription>Tell buyers more about what you're selling</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 text-primary border-primary/20 hover:bg-primary/5"
                      onClick={handleSmartImprove}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Smart Improve
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={handleTranslateToUzbek}
                      disabled={aiLoading || !formData.description}
                    >
                      <Languages className="h-3 w-3" />
                      Add Uzbek
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Describe your item in detail..." 
                    className="min-h-[200px]"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-sm font-medium text-muted-foreground mr-2">Keywords:</span>
                      {keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input 
                    placeholder="e.g. Tashkent, Mirabad District" 
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                  <CardDescription>Add up to 10 photos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Add Photo</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <div className="sticky top-24 space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-bold gap-2" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Publish Listing
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By publishing, you agree to our Terms of Service and Safety Rules.
                </p>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}