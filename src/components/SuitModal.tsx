import React from 'react';
import { Suit, SUIT_INFO } from '../types';

interface SuitModalProps {
  isOpen: boolean;
  onSelect: (suit: Suit) => void;
  canDeclareTakKard?: boolean;
  onDeclareTakKard?: () => void;
}

export const SuitModal: React.FC<SuitModalProps> = ({
  isOpen,
  onSelect,
  canDeclareTakKard,
  onDeclareTakKard,
}) => {
  if (!isOpen) return null;

  const validSuits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-fade-in">
      <div className="w-full max-w-sm bg-[#0c331d]/95 border-2 border-[#ffd54f] rounded-3xl p-5 text-white text-center shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <h3 className="text-lg font-bold text-[#ffd54f] mb-2">خال حکم را تعیین کنید</h3>
        <p className="text-xs text-gray-300 mb-5">
          شما سرباز یا جوکر انداخته‌اید. مایلید دور بعدی با چه خالی ادامه یابد؟
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {validSuits.map((s) => {
            const info = SUIT_INFO[s];
            return (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className={`py-3 px-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-lg font-black transition active:scale-95 shadow-md ${
                  info.isRed
                    ? 'bg-rose-950/60 border-red-500/50 text-red-400 hover:bg-rose-900/60'
                    : 'bg-slate-900/70 border-slate-500/50 text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className="text-2xl">{info.symbol}</span>
                <span>{info.title}</span>
              </button>
            );
          })}
        </div>

        {canDeclareTakKard && (
          <button
            onClick={onDeclareTakKard}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-md animate-pulse"
          >
            اعلام تک کارت!
          </button>
        )}
      </div>
    </div>
  );
};
