import React from 'react';
import { X, Flame, Shield, Shuffle, Sparkles, FastForward, UserMinus, AlertTriangle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: <Flame className="w-5 h-5 text-red-500" />,
      title: 'کارت ۷ (هفت خبیث)',
      desc: 'هر بار که انداخته شود، نفر بعدی باید ۷ بیندازد یا ۲ کارت جریمه بردارد. این جریمه جمع می‌شود (۲، ۴، ۶، ۸ و...). پایان بردن با ۷ امتیاز منفی ۷۰- دارد!',
    },
    {
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      title: 'شاه (دفاع در برابر ۷)',
      desc: 'اگر شاه هم‌خال کارت ۷ زمینه انداخته شود، تمام جریمه‌ی جمع‌شده مستقیماً به شروع‌کننده‌ی زنجیره ۷ برمی‌گردد!',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      title: 'سرباز (تغییر خال / وحشی)',
      desc: 'روی هر کارتی قابل انداختن است و بازیکن خال بعدی را تعیین می‌کند. اگر دست با سرباز تمام شود، امتیازات بقیه دو برابر محاسبه می‌شود!',
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-purple-400" />,
      title: 'جوکر (جریمه همگانی)',
      desc: 'روی هر کارتی می‌نشیند. تمام بازیکنان دیگر ۱ کارت جریمه از بانک می‌کشند و خال جدید انتخاب می‌شود.',
    },
    {
      icon: <UserMinus className="w-5 h-5 text-emerald-400" />,
      title: 'کارت ۲ (اهدای جریمه)',
      desc: 'بازیکن می‌تواند به دلخواه ۱ کارت از دست خود را به عنوان جریمه به هر بازیکنی که می‌خواهد بدهد.',
    },
    {
      icon: <FastForward className="w-5 h-5 text-orange-400" />,
      title: 'کارت ۸ (جایزه نوبت)',
      desc: 'انداختن ۸ به بازیکن نوبت دوباره می‌دهد. می‌تواند ۸ دیگر بیندازد یا کارت جایزه بر اساس خال ۸ جاری بیندازد.',
    },
    {
      icon: <Shuffle className="w-5 h-5 text-cyan-400" />,
      title: 'کارت ۱۰ (معکوس کردن جهت)',
      desc: 'جهت گردش بازی را بین ساعتگرد و پادساعتگرد عوض می‌کند.',
    },
    {
      icon: <FastForward className="w-5 h-5 text-pink-400" />,
      title: 'تک / آس (بلوک کردن)',
      desc: 'نوبت نفر بعدی می‌سوزد و نوبت به نفر بعد از او می‌رسد.',
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      title: 'قانون تک کارت & تک نگفت',
      desc: 'وقتی دست شما ۱ کارت شد باید فوراً «اعلام تک کارت» را بزنید. اگر نگویید، بعد از ۲ ثانیه بقیه می‌توانند با زدن «تک نگفت 😁» به شما ۱ کارت جریمه دهند!',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-[#0c2f1c]/95 border-2 border-[#ffd54f]/60 rounded-2xl shadow-2xl p-6 text-white overflow-hidden flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#ffd54f]/30">
          <h2 className="text-xl font-bold text-[#ffd54f] flex items-center gap-2">
            <span>📜</span> راهنمای جامع قوانین هفت خبیث
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-sm leading-relaxed text-gray-200">
          <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-xs text-amber-200">
            <strong>هدف بازی:</strong> خالی کردن سریع‌تر دست از کارت‌ها. در پایان هر دست، مجموع ارزش کارت‌های باقی‌مانده در دست بازیکنان شمرده می‌شود؛ بازیکنی که در پایان دست‌ها کمترین امتیاز را داشته باشد برنده نهایی است!
          </div>

          {rules.map((r, i) => (
            <div key={i} className="flex gap-3 p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20 items-start">
              <div className="p-2 rounded-lg bg-black/40 shrink-0 mt-0.5">{r.icon}</div>
              <div>
                <h4 className="font-bold text-[#ffd54f] text-sm mb-1">{r.title}</h4>
                <p className="text-xs text-gray-300 leading-normal">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#ffd54f] hover:bg-[#ffe082] text-[#241a00] font-bold rounded-xl transition shadow-lg active:scale-95"
          >
            متوجه شدم، بزن بریم بازی!
          </button>
        </div>
      </div>
    </div>
  );
};
