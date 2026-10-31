import React from 'react';
import { AVATARS, AvatarItem } from '../data/avatars';
import { X, Check } from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  selectedId,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-[#0c331d]/95 border-2 border-[#ffd54f] rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-[#ffd54f]">انتخاب عکس پروفایل</h3>
            <p className="text-xs text-gray-300">یک آواتار بانمک برای کاراکتر خودت انتخاب کن:</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10 Avatars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto my-4 py-1 pr-1 scrollbar-none">
          {AVATARS.map((item: AvatarItem) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all relative ${
                  isSelected
                    ? 'border-[#ffd54f] bg-[#ffd54f]/20 scale-102 shadow-lg ring-2 ring-yellow-400/50'
                    : 'border-white/15 bg-black/30 hover:border-white/40 hover:bg-black/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-[#ffd54f] text-[#241a00] rounded-full flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-16 h-16 rounded-full overflow-hidden shadow-md mb-2 p-0.5">
                  <item.svg className="w-full h-full" />
                </div>
                <span className="text-xs font-bold text-white text-center">{item.name}</span>
                <span className="text-[10px] text-[#ffd54f] opacity-80">{item.tag}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#ffd54f] hover:bg-[#ffe082] text-[#241a00] font-black rounded-xl text-sm transition shadow"
        >
          تأیید انتخاب
        </button>
      </div>
    </div>
  );
};
