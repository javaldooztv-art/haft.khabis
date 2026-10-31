import React, { useState, useMemo } from 'react';
import { Card, Player, getCardImageSrc, sortHandCards } from '../types';

interface GivePenaltyModalProps {
  isOpen: boolean;
  myHand: Card[];
  otherPlayers: Player[];
  onConfirm: (cardId: string, targetPlayerId: string) => void;
  canDeclareTakKard?: boolean;
  onDeclareTakKard?: () => void;
}

export const GivePenaltyModal: React.FC<GivePenaltyModalProps> = ({
  isOpen,
  myHand,
  otherPlayers,
  onConfirm,
  canDeclareTakKard,
  onDeclareTakKard,
}) => {
  const sortedCards = useMemo(() => sortHandCards(myHand), [myHand]);
  const [selectedCardId, setSelectedCardId] = useState<string>(sortedCards[0]?.id || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(otherPlayers[0]?.id || '');

  if (!isOpen) return null;

  const currentCard = myHand.find((c) => c.id === selectedCardId) || myHand[0];
  const currentTarget = otherPlayers.find((p) => p.id === selectedPlayerId) || otherPlayers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-fade-in">
      <div className="w-full max-w-md bg-[#0c331d]/95 border-2 border-[#ffd54f] rounded-3xl p-5 text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] backdrop-blur-sm">
        <h3 className="text-lg font-bold text-[#ffd54f] mb-1">اهدای جریمه کارت ۲</h3>
        <p className="text-xs text-gray-300 mb-4">
          کارت ۲ انداخته‌اید! یک کارت از دست خود انتخاب کنید و به یکی از بازیکنان هدیه دهید:
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-emerald-300 mb-2">۱. کارت جریمه را انتخاب کنید:</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {sortedCards.map((c) => {
              const isSel = c.id === selectedCardId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCardId(c.id)}
                  className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-150 ${
                    isSel
                      ? 'scale-105 ring-4 ring-[#ffd54f] shadow-lg -translate-y-1'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getCardImageSrc(c)}
                    alt={c.rank}
                    className="w-14 h-20 object-contain rounded-lg shadow"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-emerald-300 mb-2">۲. بازیکن مقصد را انتخاب کنید:</div>
          <div className="grid grid-cols-2 gap-2">
            {otherPlayers.map((p) => {
              const isSel = p.id === selectedPlayerId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    isSel
                      ? 'bg-[#ffd54f]/20 border-[#ffd54f] text-yellow-300 shadow'
                      : 'bg-black/30 border-white/10 text-gray-300 hover:bg-black/40'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded">
                    {p.hand.length} کارت
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button
            onClick={() => {
              if (currentCard && currentTarget) {
                onConfirm(currentCard.id, currentTarget.id);
              }
            }}
            disabled={!currentCard || !currentTarget}
            className="w-full py-3 bg-[#ffd54f] hover:bg-[#ffe082] text-[#241a00] font-bold rounded-2xl transition shadow-lg active:scale-95 disabled:opacity-40"
          >
            ارسال کارت جریمه به {currentTarget?.name || 'حریف'}
          </button>

          {canDeclareTakKard && (
            <button
              onClick={onDeclareTakKard}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow animate-pulse"
            >
              اعلام تک کارت!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
