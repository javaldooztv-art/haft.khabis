import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types';
import { getAvatar } from '../data/avatars';
import { Trophy, Award, X, RotateCcw } from 'lucide-react';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  isRoundOver: boolean;
  isGameOver: boolean;
  statusMessage: string;
  myId: string;
  onNextRound?: () => void;
  onRestartGame?: () => void;
}

const AVATAR_COLORS = ['#e57373', '#64b5f6', '#ba68c8', '#ffb74d', '#4db6ac', '#a1887f'];

export const ScoreModal: React.FC<ScoreModalProps> = ({
  isOpen,
  onClose,
  players,
  currentRound,
  totalRounds,
  isRoundOver,
  isGameOver,
  statusMessage,
  myId,
  onNextRound,
  onRestartGame,
}) => {
  useEffect(() => {
    if (isOpen && isGameOver) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen, isGameOver]);

  if (!isOpen) return null;

  // In Haft Khabis, lowest score is best!
  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const bestScore = sortedPlayers[0]?.totalScore ?? 0;
  const winners = sortedPlayers.filter((p) => p.totalScore === bestScore);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a2717]/95 border-2 border-[#ffd54f]/70 rounded-3xl p-6 text-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#ffd54f]" />
            <h3 className="text-lg font-extrabold text-[#ffd54f]">
              {isGameOver
                ? '🏆 نتیجه نهایی بازی'
                : `جدول امتیازات (دست ${currentRound} از ${totalRounds})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isGameOver && (
          <div className="my-3 py-3 px-4 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-yellow-400/40 rounded-2xl text-center">
            <span className="text-3xl block mb-1">🎉 👑 🎉</span>
            <div className="text-sm font-black text-amber-300 tracking-wider mb-1 animate-bounce">
              ✨ هووورا! بازی با موفقیت به پایان رسید ✨
            </div>
            <span className="font-black text-lg text-yellow-300">
              {winners.map((w) => w.name).join(' و ')}{' '}
              {winners.length > 1 ? 'برنده شدند!' : 'برنده شد!'}
            </span>
            <div className="text-xs text-yellow-100/80 mt-1">
              کمترین امتیاز مجموع در پایان بازی ({bestScore} امتیاز)
            </div>
          </div>
        )}

        {isRoundOver && !isGameOver && (
          <div className="my-2 py-2 px-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-center text-xs font-semibold text-emerald-300">
            {statusMessage}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
          {sortedPlayers.map((player, idx) => {
            const isMe = player.id === myId;
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-2xl transition border ${
                  isMe
                    ? 'bg-[#ffd54f]/15 border-[#ffd54f]/60'
                    : 'bg-black/30 border-white/10'
                }`}
              >
                <span className="text-xl w-6 text-center shrink-0">
                  {medals[idx] || `${idx + 1}.`}
                </span>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                  {(() => {
                    const av = getAvatar(player.avatarId);
                    return <av.svg className="w-full h-full" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate flex items-center gap-1.5">
                    {player.name}
                    {isMe && (
                      <span className="text-[10px] bg-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded-full font-normal">
                        شما
                      </span>
                    )}
                    {player.isBot && (
                      <span className="text-[10px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded-full font-normal">
                        ربات
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-300">
                    این دست: <span className="font-semibold text-amber-200">{player.lastRoundScore}</span> امتیاز
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xl font-extrabold text-[#ffd54f]">
                    {player.totalScore}
                  </div>
                  <div className="text-[10px] text-gray-400">مجموع</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-white/10 flex gap-2">
          {isGameOver ? (
            <button
              onClick={() => {
                onClose();
                onRestartGame?.();
              }}
              className="flex-1 py-3 bg-[#ffd54f] hover:bg-[#ffe082] text-[#251b00] font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              شروع دوباره بازی
            </button>
          ) : isRoundOver ? (
            <button
              onClick={() => {
                onClose();
                onNextRound?.();
              }}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition shadow-lg active:scale-95"
            >
              دست بعدی ({currentRound + 1} از {totalRounds}) ➜
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/15 hover:bg-white/20 text-white font-semibold rounded-2xl transition"
            >
              بستن و ادامه بازی
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
