'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Clock3, Loader2, MessageCircleMore, Phone, Search, ShieldCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createChatConversation, fetchChatConversationById, fetchChatConversations, sendChatMessage } from '@/lib/chat';
import { languageMeta } from '@/lib/i18n';
import type { ChatConversation, ChatConversationSummary } from '@/lib/types';

function getChatCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      title: 'Реальные чаты',
      description: 'Общайтесь с продавцами и покупателями напрямую внутри BirJoy.',
      searchPlaceholder: 'Поиск по объявлениям или пользователям',
      listingLabel: 'Объявление',
      quickCall: 'Позвонить',
      openListing: 'Открыть объявление',
      safetyLabel: 'Безопасная переписка',
      safetyDescription: 'Не отправляйте предоплату, пока лично не проверите товар и условия сделки.',
      composerPlaceholder: 'Введите сообщение',
      sendLabel: 'Отправить',
      empty: 'Выберите диалог, чтобы продолжить общение.',
      loading: 'Чаты загружаются...',
      loadingConversation: 'Диалог открывается...',
      noConversations: 'Пока нет ни одного чата.',
      noConversationDescription:
        'Откройте объявление и нажмите кнопку связи с продавцом, чтобы начать первый диалог.',
      noMatches: 'По этому запросу чатов не найдено.',
      sendErrorTitle: 'Сообщение не отправлено',
      loadErrorTitle: 'Не удалось загрузить чаты',
      emptyMessages: 'Диалог пока пуст. Отправьте первое сообщение.',
      noPreview: 'Пока нет сообщений',
      callUnavailable: 'Номер телефона недоступен',
      newConversation: 'Новый чат',
      you: 'Вы',
      retry: 'Повторить',
    };
  }

  if (locale === 'en') {
    return {
      title: 'Real chats',
      description: 'Talk to sellers and buyers directly inside BirJoy.',
      searchPlaceholder: 'Search listings or people',
      listingLabel: 'Listing',
      quickCall: 'Call',
      openListing: 'Open listing',
      safetyLabel: 'Safe messaging',
      safetyDescription: 'Do not send deposits until you have verified the item and the deal in person.',
      composerPlaceholder: 'Type your message',
      sendLabel: 'Send',
      empty: 'Select a conversation to continue.',
      loading: 'Loading chats...',
      loadingConversation: 'Opening conversation...',
      noConversations: 'No chats yet.',
      noConversationDescription:
        'Open a listing and use the seller contact button to start your first conversation.',
      noMatches: 'No chats matched your search.',
      sendErrorTitle: 'Message was not sent',
      loadErrorTitle: 'Chats could not be loaded',
      emptyMessages: 'This conversation is empty. Send the first message.',
      noPreview: 'No messages yet',
      callUnavailable: 'Phone number is unavailable',
      newConversation: 'New chat',
      you: 'You',
      retry: 'Try again',
    };
  }

  return {
    title: 'Haqiqiy chatlar',
    description: 'BirJoy ichida xaridor va sotuvchi bilan to‘g‘ridan-to‘g‘ri yozishing.',
    searchPlaceholder: 'Eʼlon yoki foydalanuvchi bo‘yicha qidiring',
    listingLabel: 'Eʼlon',
    quickCall: 'Qo‘ng‘iroq',
    openListing: 'Eʼlonni ochish',
    safetyLabel: 'Xavfsiz yozishma',
    safetyDescription: 'Mahsulot va kelishuvni tekshirmasdan turib oldindan to‘lov yubormang.',
    composerPlaceholder: 'Xabar yozing',
    sendLabel: 'Yuborish',
    empty: 'Davom etish uchun suhbatni tanlang.',
    loading: 'Chatlar yuklanmoqda...',
    loadingConversation: 'Suhbat ochilmoqda...',
    noConversations: 'Hali chatlar yo‘q.',
    noConversationDescription:
      'Birinchi suhbatni boshlash uchun eʼlon sahifasiga kirib sotuvchiga yozish tugmasini bosing.',
    noMatches: 'Bu qidiruv bo‘yicha chat topilmadi.',
    sendErrorTitle: 'Xabar yuborilmadi',
    loadErrorTitle: 'Chatlarni yuklab bo‘lmadi',
    emptyMessages: 'Bu suhbat hali bo‘sh. Birinchi xabarni yuboring.',
    noPreview: 'Hali xabar yo‘q',
    callUnavailable: 'Telefon raqami mavjud emas',
    newConversation: 'Yangi chat',
    you: 'Siz',
    retry: 'Qayta urinish',
  };
}

function getTimestampValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortConversationSummaries(conversations: ChatConversationSummary[]) {
  return [...conversations].sort(
    (left, right) => getTimestampValue(right.lastMessageAt) - getTimestampValue(left.lastMessageAt)
  );
}

function upsertConversationSummary(
  conversations: ChatConversationSummary[],
  conversation: ChatConversation | ChatConversationSummary
) {
  const nextSummary: ChatConversationSummary = {
    id: conversation.id,
    adId: conversation.adId,
    adTitle: conversation.adTitle,
    adPrice: conversation.adPrice,
    adImage: conversation.adImage,
    viewerRole: conversation.viewerRole,
    otherParticipant: conversation.otherParticipant,
    seller: conversation.seller,
    buyer: conversation.buyer,
    lastMessageText: conversation.lastMessageText,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };

  return sortConversationSummaries([
    nextSummary,
    ...conversations.filter((item) => item.id !== nextSummary.id),
  ]);
}

function formatConversationTime(value: string, locale: 'uz' | 'ru' | 'en') {
  if (!value) {
    return '';
  }

  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: languageMeta[locale].dateLocale,
    });
  } catch {
    return '';
  }
}

function formatMessageTime(value: string, locale: 'uz' | 'ru' | 'en') {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(languageMeta[locale].numberLocale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const { user } = useAuth();
  const { locale, messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = getChatCopy(locale);
  const conversationParam = searchParams.get('conversation')?.trim() || '';
  const adIdParam = searchParams.get('adId')?.trim() || '';
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function loadChatIndex() {
      setIsLoadingList(true);

      try {
        let nextConversations = await fetchChatConversations();
        let createdConversation: ChatConversation | null = null;

        if (adIdParam) {
          createdConversation = await createChatConversation(adIdParam);
          nextConversations = upsertConversationSummary(nextConversations, createdConversation);
        }

        if (cancelled) {
          return;
        }

        setConversations(nextConversations);
        setError(null);

        if (createdConversation) {
          setSelectedConversation(createdConversation);
          setSelectedConversationId(createdConversation.id);
          router.replace(`/chat?conversation=${encodeURIComponent(createdConversation.id)}`, {
            scroll: false,
          });
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setConversations([]);
        setSelectedConversation(null);
        setSelectedConversationId(null);
        setError(loadError instanceof Error ? loadError.message : copy.noConversations);
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    }

    void loadChatIndex();

    return () => {
      cancelled = true;
    };
  }, [adIdParam, copy.noConversations, reloadKey, router, user?.id]);

  useEffect(() => {
    setSelectedConversationId((current) => {
      if (conversationParam) {
        return conversationParam;
      }

      if (current && conversations.some((conversation) => conversation.id === current)) {
        return current;
      }

      return conversations[0]?.id ?? null;
    });
  }, [conversationParam, conversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return;
    }

    const conversationId = selectedConversationId;
    let cancelled = false;

    async function loadSelectedConversation() {
      setIsLoadingConversation(true);

      try {
        const conversation = await fetchChatConversationById(conversationId);

        if (cancelled) {
          return;
        }

        setSelectedConversation(conversation);
        setConversations((current) => upsertConversationSummary(current, conversation));
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSelectedConversation(null);
        toast({
          title: copy.loadErrorTitle,
          description:
            loadError instanceof Error ? loadError.message : messages.auth.requestFailedDescription,
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) {
          setIsLoadingConversation(false);
        }
      }
    }

    void loadSelectedConversation();

    return () => {
      cancelled = true;
    };
  }, [copy.loadErrorTitle, messages.auth.requestFailedDescription, selectedConversationId, toast]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) => {
        const searchSource = [
          conversation.otherParticipant.name,
          conversation.adTitle,
          conversation.lastMessageText,
        ]
          .join(' ')
          .toLowerCase();

        return searchSource.includes(normalizedSearch);
      })
    : conversations;
  const selectedSummary =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const currentConversation = selectedConversation?.id === selectedConversationId
    ? selectedConversation
    : null;
  const conversationView = currentConversation || selectedSummary;

  const handleSelectConversation = (conversationId: string) => {
    setDraftMessage('');
    setSelectedConversation(null);
    setSelectedConversationId(conversationId);
    router.replace(`/chat?conversation=${encodeURIComponent(conversationId)}`, {
      scroll: false,
    });
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draftMessage.trim();

    if (!selectedConversationId || !text) {
      return;
    }

    setIsSendingMessage(true);

    try {
      const conversation = await sendChatMessage(selectedConversationId, text);
      setSelectedConversation(conversation);
      setConversations((current) => upsertConversationSummary(current, conversation));
      setDraftMessage('');
    } catch (sendError) {
      toast({
        title: copy.sendErrorTitle,
        description:
          sendError instanceof Error ? sendError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <section className="surface-card rounded-[1.75rem] px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary/70">
                  {messages.navbar.chat}
                </p>
                <h1 className="page-title mt-3 font-bold text-primary">{copy.title}</h1>
              </div>
              <p className="body-lead max-w-2xl text-muted-foreground">{copy.description}</p>
            </div>
          </section>

          <section className="chat-layout">
            <div className="surface-card rounded-[1.75rem] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-white/86 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  placeholder={copy.searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              {isLoadingList ? (
                <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-white/76 px-4 text-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {copy.loading}
                  </div>
                </div>
              ) : filteredConversations.length > 0 ? (
                <div className="page-stack">
                  {filteredConversations.map((conversation) => {
                    const isActive = conversation.id === conversationView?.id;
                    const lastActivity = conversation.lastMessageText || copy.noPreview;
                    const lastActivityTime =
                      formatConversationTime(conversation.lastMessageAt, locale) || copy.newConversation;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`flex w-full items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary/15 bg-primary/8 shadow-sm'
                            : 'border-border/70 bg-white/72 hover:bg-primary/5'
                        }`}
                      >
                        <Avatar className="h-12 w-12 border border-primary/10">
                          <AvatarImage
                            src={conversation.otherParticipant.avatar}
                            alt={conversation.otherParticipant.name}
                          />
                          <AvatarFallback>
                            {conversation.otherParticipant.name.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {conversation.otherParticipant.name || copy.newConversation}
                              </p>
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {conversation.adTitle}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">
                              {lastActivityTime}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                            {lastActivity}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-white/76 px-4 text-center">
                  <div>
                    <MessageCircleMore className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-semibold text-foreground">
                      {normalizedSearch ? copy.noMatches : copy.noConversations}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {normalizedSearch ? copy.searchPlaceholder : error || copy.noConversationDescription}
                    </p>
                    {error ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setReloadKey((current) => current + 1)}
                      >
                        {copy.retry}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="surface-card rounded-[1.75rem] p-4 sm:p-5">
              {conversationView ? (
                <div className="page-stack">
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-white/76 p-4 min-[481px]:flex-row min-[481px]:items-center min-[481px]:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border border-primary/10">
                        <AvatarImage
                          src={conversationView.otherParticipant.avatar}
                          alt={conversationView.otherParticipant.name}
                        />
                        <AvatarFallback>
                          {conversationView.otherParticipant.name.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold">
                          {conversationView.otherParticipant.name || copy.newConversation}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {copy.listingLabel}: {conversationView.adTitle}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatConversationTime(conversationView.lastMessageAt, locale) || copy.newConversation}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 min-[481px]:w-auto">
                      {conversationView.otherParticipant.phone ? (
                        <Button asChild className="min-h-12 rounded-2xl gap-2">
                          <a href={`tel:${conversationView.otherParticipant.phone}`}>
                            <Phone className="h-4 w-4" />
                            {copy.quickCall}
                          </a>
                        </Button>
                      ) : (
                        <Button className="min-h-12 rounded-2xl gap-2" disabled>
                          <Phone className="h-4 w-4" />
                          {copy.callUnavailable}
                        </Button>
                      )}
                      <Button asChild variant="outline" className="min-h-12 rounded-2xl">
                        <Link href={`/ads/${conversationView.adId}`}>{copy.openListing}</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="page-stack rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,_rgba(239,245,255,0.55),_rgba(255,255,255,0.9))] p-4 sm:p-5">
                    {isLoadingConversation ? (
                      <div className="flex min-h-[18rem] items-center justify-center text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {copy.loadingConversation}
                        </div>
                      </div>
                    ) : currentConversation && currentConversation.messages.length > 0 ? (
                      currentConversation.messages.map((message) => {
                        const fromViewer = message.senderId === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`max-w-[90%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                              fromViewer
                                ? 'ml-auto bg-primary text-primary-foreground'
                                : 'bg-white text-foreground'
                            }`}
                          >
                            <p>{message.text}</p>
                            <p
                              className={`mt-2 text-[11px] ${
                                fromViewer ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              }`}
                            >
                              {fromViewer ? copy.you : conversationView.otherParticipant.name}{' '}
                              · {formatMessageTime(message.createdAt, locale)}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex min-h-[18rem] items-center justify-center text-center">
                        <div>
                          <MessageCircleMore className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <p className="text-lg font-semibold text-foreground">{copy.emptyMessages}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.5rem] border border-border/70 bg-white/82 p-4">
                    <div className="mb-4 flex items-start gap-3 rounded-[1.25rem] bg-muted/40 p-4 text-sm text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">{copy.safetyLabel}</p>
                        <p className="mt-1">{copy.safetyDescription}</p>
                      </div>
                    </div>
                    <form onSubmit={(event) => void handleSendMessage(event)} className="flex flex-col gap-3">
                      <Textarea
                        className="min-h-[120px] rounded-[1.5rem]"
                        placeholder={copy.composerPlaceholder}
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        disabled={isSendingMessage}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          className="h-12 min-w-32 rounded-2xl px-6"
                          disabled={isSendingMessage || !draftMessage.trim() || !selectedConversationId}
                        >
                          {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {copy.sendLabel}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[24rem] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-white/76 text-center">
                  <div>
                    <MessageCircleMore className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-semibold text-foreground">{copy.empty}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{copy.noConversationDescription}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </ProtectedRoute>
    </MarketplaceShell>
  );
}
