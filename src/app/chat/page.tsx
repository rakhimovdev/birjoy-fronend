'use client';

import { Suspense, useState } from 'react';
import { Clock3, MessageCircleMore, Phone, Search, ShieldCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';

type Conversation = {
  id: string;
  seller: string;
  avatar?: string;
  listing: string;
  location: string;
  status: string;
  lastSeen: string;
  messages: Array<{
    id: string;
    author: 'seller' | 'buyer';
    text: string;
    time: string;
  }>;
};

function getChatCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      title: 'Чаты и отклики',
      description: 'Следите за переговорами по объявлениям с комфортным интерфейсом для телефонов и планшетов.',
      searchPlaceholder: 'Поиск по объявлениям или продавцам',
      sellerLabel: 'Продавец',
      listingLabel: 'Объявление',
      quickCall: 'Позвонить',
      safetyLabel: 'Безопасная переписка',
      safetyDescription: 'Не отправляйте предоплату до личной проверки товара и условий сделки.',
      composerPlaceholder: 'Введите сообщение',
      sendLabel: 'Отправить',
      online: 'Онлайн',
      empty: 'Выберите диалог, чтобы продолжить общение.',
    };
  }

  if (locale === 'en') {
    return {
      title: 'Chats and inquiries',
      description: 'Track listing conversations with a layout tuned for phones and tablets.',
      searchPlaceholder: 'Search listings or sellers',
      sellerLabel: 'Seller',
      listingLabel: 'Listing',
      quickCall: 'Call',
      safetyLabel: 'Safe messaging',
      safetyDescription: 'Avoid deposits until you have verified the item and the deal in person.',
      composerPlaceholder: 'Type your message',
      sendLabel: 'Send',
      online: 'Online',
      empty: 'Select a conversation to continue.',
    };
  }

  return {
    title: 'Chatlar va so‘rovlar',
    description: 'Telefon va planshetlarga mos interfeys orqali xaridor-sotuvchi suhbatlarini qulay boshqaring.',
    searchPlaceholder: 'Eʼlon yoki sotuvchi bo‘yicha qidiring',
    sellerLabel: 'Sotuvchi',
    listingLabel: 'Eʼlon',
    quickCall: 'Qo‘ng‘iroq',
    safetyLabel: 'Xavfsiz yozishma',
    safetyDescription: 'Mahsulot va shartlarni ko‘rmasdan turib oldindan to‘lov yubormang.',
    composerPlaceholder: 'Xabar yozing',
    sendLabel: 'Yuborish',
    online: 'Onlayn',
    empty: 'Davom etish uchun suhbatni tanlang.',
  };
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
  const copy = getChatCopy(locale);
  const conversations: Conversation[] = [
    {
      id: 'chat-1',
      seller: 'Aziza M.',
      avatar: user?.avatar,
      listing: locale === 'ru' ? 'iPhone 15 Pro, 256GB' : locale === 'en' ? 'iPhone 15 Pro, 256GB' : 'iPhone 15 Pro, 256GB',
      location: locale === 'ru' ? 'Ташкент, Миробод' : locale === 'en' ? 'Tashkent, Mirabad' : 'Toshkent, Mirobod',
      status: copy.online,
      lastSeen: '2 min',
      messages: [
        {
          id: 'm-1',
          author: 'seller',
          text: locale === 'ru'
            ? 'Здравствуйте! Телефон в идеальном состоянии, коробка и чек на месте.'
            : locale === 'en'
              ? 'Hi! The phone is in excellent condition and comes with the original box.'
              : 'Salom! Telefon ideal holatda, qutisi va cheki bor.',
          time: '09:12',
        },
        {
          id: 'm-2',
          author: 'buyer',
          text: locale === 'ru'
            ? 'Отлично. Можно ли сегодня посмотреть после 18:00?'
            : locale === 'en'
              ? 'Great. Could I see it today after 6 PM?'
              : 'Zo‘r. Bugun 18:00 dan keyin ko‘rsam bo‘ladimi?',
          time: '09:18',
        },
        {
          id: 'm-3',
          author: 'seller',
          text: locale === 'ru'
            ? 'Да, напишите за полчаса и я отправлю точку.'
            : locale === 'en'
              ? 'Yes, message me 30 minutes before and I will send the location.'
              : 'Ha, yarim soat oldin yozsangiz manzilni yuboraman.',
          time: '09:21',
        },
      ],
    },
    {
      id: 'chat-2',
      seller: 'Bekzod K.',
      listing: locale === 'ru' ? 'Стиральная машина LG' : locale === 'en' ? 'LG Washing Machine' : 'LG kir yuvish mashinasi',
      location: locale === 'ru' ? 'Самарканд' : locale === 'en' ? 'Samarkand' : 'Samarqand',
      status: locale === 'ru' ? 'Ответ ожидается' : locale === 'en' ? 'Waiting for reply' : 'Javob kutilmoqda',
      lastSeen: '47 min',
      messages: [
        {
          id: 'm-4',
          author: 'buyer',
          text: locale === 'ru'
            ? 'Добрый день, какой год выпуска и есть ли доставка?'
            : locale === 'en'
              ? 'Good afternoon, what year is it and do you offer delivery?'
              : 'Assalomu alaykum, qaysi yilgi va yetkazib berish bormi?',
          time: 'Yesterday',
        },
      ],
    },
  ];
  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? null);
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];

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
                />
              </div>

              <div className="page-stack">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === selectedConversation?.id;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`flex w-full items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-colors ${isActive
                        ? 'border-primary/15 bg-primary/8 shadow-sm'
                        : 'border-border/70 bg-white/72 hover:bg-primary/5'
                        }`}
                    >
                      <Avatar className="h-12 w-12 border border-primary/10">
                        <AvatarImage src={conversation.avatar} alt={conversation.seller} />
                        <AvatarFallback>{conversation.seller.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{conversation.seller}</p>
                            <p className="list-clamp-2 text-sm text-muted-foreground">
                              {conversation.listing}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">
                            {conversation.lastSeen}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {conversation.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{conversation.location}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="surface-card rounded-[1.75rem] p-4 sm:p-5">
              {selectedConversation ? (
                <div className="page-stack">
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-white/76 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border border-primary/10">
                        <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.seller} />
                        <AvatarFallback>{selectedConversation.seller.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold">{selectedConversation.seller}</p>
                        <p className="text-sm text-muted-foreground">
                          {copy.listingLabel}: {selectedConversation.listing}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {selectedConversation.lastSeen}
                          </span>
                          <span>{selectedConversation.location}</span>
                        </div>
                      </div>
                    </div>
                    <Button className="min-h-12 rounded-2xl gap-2">
                      <Phone className="h-4 w-4" />
                      {copy.quickCall}
                    </Button>
                  </div>

                  <div className="page-stack rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,_rgba(239,245,255,0.55),_rgba(255,255,255,0.9))] p-4 sm:p-5">
                    {selectedConversation.messages.map((message) => {
                      const fromBuyer = message.author === 'buyer';

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[90%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 shadow-sm ${fromBuyer
                            ? 'ml-auto bg-primary text-primary-foreground'
                            : 'bg-white text-foreground'
                            }`}
                        >
                          <p>{message.text}</p>
                          <p className={`mt-2 text-[11px] ${fromBuyer ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {message.time}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-[1.5rem] border border-border/70 bg-white/82 p-4">
                    <div className="mb-4 flex items-start gap-3 rounded-[1.25rem] bg-muted/40 p-4 text-sm text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">{copy.safetyLabel}</p>
                        <p className="mt-1">{copy.safetyDescription}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input className="h-12 rounded-2xl" placeholder={copy.composerPlaceholder} />
                      <Button className="h-12 rounded-2xl px-6">{copy.sendLabel}</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[24rem] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-white/76 text-center">
                  <div>
                    <MessageCircleMore className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-semibold text-foreground">{copy.empty}</p>
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
