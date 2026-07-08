'use client';

import { Copy, MessageCircleMore, Send, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  buildAdSharePayload,
  canUseWebShare,
  copyTextToClipboard,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
} from '@/lib/ad-sharing';
import type { Language } from '@/lib/i18n';
import type { Ad } from '@/lib/types';
import { cn } from '@/lib/utils';

type AdShareActionsProps = {
  ad: Ad;
  locale: Language;
  showQuickAction?: boolean;
  preventNavigation?: boolean;
  menuAlign?: 'start' | 'center' | 'end';
  quickActionClassName?: string;
  menuButtonClassName?: string;
};

function getShareCopy(language: Language) {
  if (language === 'ru') {
    return {
      share: 'Поделиться',
      shareNative: 'Поделиться через устройство',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      copyLink: 'Копировать ссылку',
      copied: 'Link nusxalandi',
      errorTitle: 'Не удалось поделиться',
    };
  }

  if (language === 'en') {
    return {
      share: 'Share',
      shareNative: 'Share with device',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      copyLink: 'Copy link',
      copied: 'Link nusxalandi',
      errorTitle: 'Could not share listing',
    };
  }

  return {
    share: 'Ulashish',
    shareNative: 'Qurilma orqali ulashish',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    copyLink: 'Linkni nusxalash',
    copied: 'Link nusxalandi',
    errorTitle: 'Eʼlonni ulashib bo‘lmadi',
  };
}

export function AdShareActions({
  ad,
  locale,
  showQuickAction = false,
  preventNavigation = false,
  menuAlign = 'end',
  quickActionClassName,
  menuButtonClassName,
}: AdShareActionsProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const copy = getShareCopy(locale);
  const payload = useMemo(() => buildAdSharePayload(ad, locale), [ad, locale]);
  const supportsNativeShare = canUseWebShare(payload);
  const telegramShareUrl = useMemo(() => getTelegramShareUrl(ad, locale), [ad, locale]);
  const whatsappShareUrl = useMemo(() => getWhatsAppShareUrl(ad, locale), [ad, locale]);

  const maybeStopNavigation = (event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (!preventNavigation || !event) {
      return;
    }

    event.stopPropagation();
  };

  const handleCopyLink = async () => {
    try {
      await copyTextToClipboard(payload.url);
      toast({
        title: copy.copied,
      });
    } catch (error) {
      toast({
        title: copy.errorTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleQuickShare = async (event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    maybeStopNavigation(event);
    setIsSharing(true);

    try {
      if (supportsNativeShare && typeof navigator !== 'undefined') {
        await navigator.share(payload);
        return;
      }

      await handleCopyLink();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      toast({
        title: copy.errorTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full border border-border/60 bg-background/88 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-primary',
        showQuickAction ? 'h-11 w-11 rounded-2xl' : 'h-9 w-9 sm:h-10 sm:w-10',
        menuButtonClassName
      )}
      onClick={(event) => {
        maybeStopNavigation(event);
      }}
      aria-label={copy.share}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn('flex items-center gap-2', showQuickAction && 'w-full sm:w-auto')}>
      {showQuickAction ? (
        <Button
          type="button"
          variant="outline"
          className={cn('h-11 flex-1 rounded-2xl sm:flex-none', quickActionClassName)}
          onClick={(event) => void handleQuickShare(event)}
          disabled={isSharing}
        >
          <Share2 className="h-4 w-4" />
          {copy.share}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align={menuAlign} className="w-56 rounded-2xl p-1.5">
          {supportsNativeShare ? (
            <>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void handleQuickShare({
                    preventDefault: () => undefined,
                    stopPropagation: () => undefined,
                  });
                }}
              >
                <Share2 className="h-4 w-4" />
                {copy.shareNative}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuItem asChild>
            <a
              href={telegramShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                maybeStopNavigation(event);
              }}
            >
              <Send className="h-4 w-4" />
              {copy.telegram}
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                maybeStopNavigation(event);
              }}
            >
              <MessageCircleMore className="h-4 w-4" />
              {copy.whatsapp}
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleCopyLink();
            }}
          >
            <Copy className="h-4 w-4" />
            {copy.copyLink}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
