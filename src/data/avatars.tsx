import React from 'react';

export interface AvatarItem {
  id: string;
  name: string;
  tag: string;
  bgColor: string;
  ringColor: string;
  svg: (props: { className?: string }) => React.JSX.Element;
}

export const AVATARS: AvatarItem[] = [
  {
    id: 'avatar_1',
    name: 'شیر باحال',
    tag: 'عینک دودی',
    bgColor: '#f59e0b',
    ringColor: '#fbbf24',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_lion" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="g_mane" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" fill="url(#g_lion)" />
        {/* Mane */}
        <circle cx="50" cy="50" r="38" fill="url(#g_mane)" />
        {/* Mane tufts */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((ang, i) => (
          <circle
            key={i}
            cx={50 + 34 * Math.cos((ang * Math.PI) / 180)}
            cy={50 + 34 * Math.sin((ang * Math.PI) / 180)}
            r="10"
            fill="url(#g_mane)"
          />
        ))}
        {/* Face */}
        <circle cx="50" cy="52" r="28" fill="#fde68a" />
        {/* Ears */}
        <circle cx="30" cy="28" r="8" fill="#b45309" />
        <circle cx="30" cy="28" r="5" fill="#fde68a" />
        <circle cx="70" cy="28" r="8" fill="#b45309" />
        <circle cx="70" cy="28" r="5" fill="#fde68a" />
        {/* Cool Sunglasses */}
        <rect x="25" y="42" width="22" height="13" rx="4" fill="#18181b" />
        <rect x="53" y="42" width="22" height="13" rx="4" fill="#18181b" />
        <rect x="45" y="46" width="10" height="4" fill="#27272a" />
        {/* Glasses shine */}
        <path d="M28 45 L36 45 L30 52 L28 52 Z" fill="#ffffff" opacity="0.6" />
        <path d="M56 45 L64 45 L58 52 L56 52 Z" fill="#ffffff" opacity="0.6" />
        {/* Nose & Smile */}
        <polygon points="46,58 54,58 50,63" fill="#92400e" />
        <path d="M44 65 Q50 71 56 65" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="34" cy="62" r="4" fill="#f87171" opacity="0.5" />
        <circle cx="66" cy="62" r="4" fill="#f87171" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'avatar_2',
    name: 'پیشی ملوس',
    tag: 'پاپیون قرمز',
    bgColor: '#ec4899',
    ringColor: '#f472b6',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_cat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_cat)" />
        {/* Cat Ears */}
        <polygon points="26,16 16,42 42,34" fill="#fdf2f8" />
        <polygon points="26,20 20,38 38,32" fill="#f43f5e" />
        <polygon points="74,16 84,42 58,34" fill="#fdf2f8" />
        <polygon points="74,20 80,38 62,32" fill="#f43f5e" />
        {/* Face */}
        <circle cx="50" cy="52" r="32" fill="#fff1f2" />
        {/* Big Cute Eyes */}
        <circle cx="38" cy="48" r="6" fill="#1e1b4b" />
        <circle cx="36" cy="46" r="2.2" fill="#ffffff" />
        <circle cx="40" cy="50" r="1.2" fill="#ffffff" />
        <circle cx="62" cy="48" r="6" fill="#1e1b4b" />
        <circle cx="60" cy="46" r="2.2" fill="#ffffff" />
        <circle cx="64" cy="50" r="1.2" fill="#ffffff" />
        {/* Nose & Cute Mouth */}
        <polygon points="48,56 52,56 50,59" fill="#f43f5e" />
        <path d="M45 61 Q48 64 50 61 Q52 64 55 61" fill="none" stroke="#881337" strokeWidth="2" strokeLinecap="round" />
        {/* Whiskers */}
        <line x1="22" y1="54" x2="33" y2="56" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="60" x2="33" y2="59" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
        <line x1="78" y1="54" x2="67" y2="56" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
        <line x1="79" y1="60" x2="67" y2="59" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
        {/* Red Bowtie */}
        <polygon points="42,78 32,73 32,83" fill="#e11d48" />
        <polygon points="58,78 68,73 68,83" fill="#e11d48" />
        <circle cx="50" cy="78" r="4.5" fill="#be123c" />
      </svg>
    ),
  },
  {
    id: 'avatar_3',
    name: 'پاندای شاد',
    tag: 'کلاه تولد',
    bgColor: '#10b981',
    ringColor: '#34d399',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_panda" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_panda)" />
        {/* Black Ears */}
        <circle cx="28" cy="28" r="11" fill="#18181b" />
        <circle cx="72" cy="28" r="11" fill="#18181b" />
        {/* Face */}
        <circle cx="50" cy="56" r="32" fill="#ffffff" />
        {/* Black Eye Patches */}
        <ellipse cx="38" cy="52" rx="7.5" ry="9.5" fill="#18181b" transform="rotate(-15 38 52)" />
        <ellipse cx="62" cy="52" rx="7.5" ry="9.5" fill="#18181b" transform="rotate(15 62 52)" />
        {/* Shiny Eyes */}
        <circle cx="39" cy="51" r="3" fill="#ffffff" />
        <circle cx="61" cy="51" r="3" fill="#ffffff" />
        {/* Nose & Smile */}
        <ellipse cx="50" cy="63" rx="4.5" ry="3" fill="#18181b" />
        <path d="M43 69 Q50 76 57 69" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="30" cy="65" r="4" fill="#f87171" opacity="0.6" />
        <circle cx="70" cy="65" r="4" fill="#f87171" opacity="0.6" />
        {/* Party Hat */}
        <polygon points="50,6 38,30 62,30" fill="#f59e0b" />
        <circle cx="50" cy="5" r="3.5" fill="#ef4444" />
        <line x1="42" y1="20" x2="58" y2="20" stroke="#ef4444" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'avatar_4',
    name: 'روباه باهوش',
    tag: 'عینک گرد',
    bgColor: '#ea580c',
    ringColor: '#fb923c',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_fox" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_fox)" />
        {/* Big Fox Ears */}
        <polygon points="26,12 14,40 40,32" fill="#c2410c" />
        <polygon points="26,17 18,36 36,30" fill="#ffffff" />
        <polygon points="74,12 86,40 60,32" fill="#c2410c" />
        <polygon points="74,17 82,36 64,30" fill="#ffffff" />
        {/* Face */}
        <ellipse cx="50" cy="54" rx="30" ry="26" fill="#ea580c" />
        {/* White cheeks */}
        <path d="M22 56 Q36 68 50 64 Q64 68 78 56 Q66 78 50 78 Q34 78 22 56 Z" fill="#ffffff" />
        {/* Smart Round Glasses */}
        <circle cx="37" cy="50" r="9" fill="none" stroke="#18181b" strokeWidth="2.5" />
        <circle cx="63" cy="50" r="9" fill="none" stroke="#18181b" strokeWidth="2.5" />
        <line x1="46" y1="50" x2="54" y2="50" stroke="#18181b" strokeWidth="2.5" />
        {/* Smart Eyes */}
        <circle cx="37" cy="50" r="3.5" fill="#18181b" />
        <circle cx="36" cy="48.5" r="1.2" fill="#ffffff" />
        <circle cx="63" cy="50" r="3.5" fill="#18181b" />
        <circle cx="62" cy="48.5" r="1.2" fill="#ffffff" />
        {/* Nose */}
        <circle cx="50" cy="65" r="3.5" fill="#18181b" />
        <path d="M47 70 Q50 73 53 70" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'avatar_5',
    name: 'میمون شیطون',
    tag: 'هدفون گیمینگ',
    bgColor: '#8b5cf6',
    ringColor: '#a78bfa',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_monkey" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_monkey)" />
        {/* Ears */}
        <circle cx="19" cy="50" r="12" fill="#78350f" />
        <circle cx="19" cy="50" r="7" fill="#fed7aa" />
        <circle cx="81" cy="50" r="12" fill="#78350f" />
        <circle cx="81" cy="50" r="7" fill="#fed7aa" />
        {/* Head */}
        <circle cx="50" cy="50" r="30" fill="#78350f" />
        {/* Face heart shape */}
        <circle cx="41" cy="46" r="13" fill="#fed7aa" />
        <circle cx="59" cy="46" r="13" fill="#fed7aa" />
        <ellipse cx="50" cy="60" rx="18" ry="14" fill="#fed7aa" />
        {/* Cheeky Eyes */}
        <ellipse cx="42" cy="46" rx="3.5" ry="5" fill="#18181b" />
        <circle cx="41" cy="44" r="1.5" fill="#ffffff" />
        <ellipse cx="58" cy="46" rx="3.5" ry="5" fill="#18181b" />
        <circle cx="57" cy="44" r="1.5" fill="#ffffff" />
        {/* Nose & Big Grin */}
        <circle cx="47" cy="57" r="1.5" fill="#78350f" />
        <circle cx="53" cy="57" r="1.5" fill="#78350f" />
        <path d="M40 64 Q50 76 60 64" fill="#ef4444" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        {/* Gaming Headphones */}
        <path d="M22 48 A28 28 0 0 1 78 48" fill="none" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" />
        <rect x="14" y="44" width="9" height="18" rx="4" fill="#22d3ee" />
        <rect x="77" y="44" width="9" height="18" rx="4" fill="#22d3ee" />
      </svg>
    ),
  },
  {
    id: 'avatar_6',
    name: 'خرگوش زرنگ',
    tag: 'لپ گلی',
    bgColor: '#06b6d4',
    ringColor: '#67e8f9',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_bunny" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_bunny)" />
        {/* Tall Bunny Ears */}
        <ellipse cx="36" cy="22" rx="7" ry="19" fill="#ffffff" transform="rotate(-10 36 22)" />
        <ellipse cx="36" cy="22" rx="4" ry="14" fill="#f472b6" transform="rotate(-10 36 22)" />
        <ellipse cx="64" cy="22" rx="7" ry="19" fill="#ffffff" transform="rotate(10 64 22)" />
        <ellipse cx="64" cy="22" rx="4" ry="14" fill="#f472b6" transform="rotate(10 64 22)" />
        {/* Face */}
        <circle cx="50" cy="58" r="28" fill="#ffffff" />
        {/* Big Sparkle Eyes */}
        <circle cx="40" cy="53" r="5" fill="#18181b" />
        <circle cx="38" cy="51" r="2" fill="#ffffff" />
        <circle cx="60" cy="53" r="5" fill="#18181b" />
        <circle cx="58" cy="51" r="2" fill="#ffffff" />
        {/* Nose & Cute Bunny Teeth */}
        <polygon points="48,61 52,61 50,64" fill="#ec4899" />
        <path d="M46 66 Q50 69 54 66" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        <rect x="48" y="66" width="4" height="4" rx="1" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
        {/* Rosy Cheeks */}
        <circle cx="32" cy="63" r="4.5" fill="#f472b6" opacity="0.6" />
        <circle cx="68" cy="63" r="4.5" fill="#f472b6" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'avatar_7',
    name: 'خرس مهربون',
    tag: 'کلاه کپ',
    bgColor: '#b45309',
    ringColor: '#d97706',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_bear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_bear)" />
        {/* Bear Ears */}
        <circle cx="28" cy="26" r="10" fill="#78350f" />
        <circle cx="28" cy="26" r="5.5" fill="#fde68a" />
        <circle cx="72" cy="26" r="10" fill="#78350f" />
        <circle cx="72" cy="26" r="5.5" fill="#fde68a" />
        {/* Face */}
        <circle cx="50" cy="54" r="30" fill="#78350f" />
        {/* Snout */}
        <ellipse cx="50" cy="62" rx="15" ry="12" fill="#fde68a" />
        <ellipse cx="50" cy="58" rx="6" ry="4" fill="#18181b" />
        <path d="M44 64 Q50 71 56 64" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Warm Eyes */}
        <circle cx="39" cy="46" r="3.5" fill="#18181b" />
        <circle cx="38" cy="44.5" r="1.2" fill="#ffffff" />
        <circle cx="61" cy="46" r="3.5" fill="#18181b" />
        <circle cx="60" cy="44.5" r="1.2" fill="#ffffff" />
        {/* Cool Baseball Cap */}
        <path d="M30 32 Q50 20 70 32 Z" fill="#2563eb" />
        <ellipse cx="68" cy="32" rx="14" ry="4" fill="#1d4ed8" transform="rotate(-12 68 32)" />
        <circle cx="50" cy="23" r="2.5" fill="#fbbf24" />
      </svg>
    ),
  },
  {
    id: 'avatar_8',
    name: 'هاپوی بامزه',
    tag: 'خنده‌رو',
    bgColor: '#3b82f6',
    ringColor: '#60a5fa',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_dog" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_dog)" />
        {/* Floppy Dog Ears */}
        <ellipse cx="22" cy="44" rx="8" ry="18" fill="#d97706" transform="rotate(25 22 44)" />
        <ellipse cx="78" cy="44" rx="8" ry="18" fill="#d97706" transform="rotate(-25 78 44)" />
        {/* Face */}
        <circle cx="50" cy="52" r="30" fill="#fef3c7" />
        {/* Eye Patch */}
        <circle cx="63" cy="46" r="11" fill="#d97706" />
        {/* Happy Eyes */}
        <circle cx="38" cy="46" r="4" fill="#18181b" />
        <circle cx="37" cy="44" r="1.5" fill="#ffffff" />
        <circle cx="63" cy="46" r="4" fill="#18181b" />
        <circle cx="62" cy="44" r="1.5" fill="#ffffff" />
        {/* Nose */}
        <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#18181b" />
        {/* Tongue Out Smile */}
        <path d="M42 61 Q50 67 58 61" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="50" cy="69" rx="4.5" ry="7" fill="#f43f5e" />
        <line x1="50" y1="64" x2="50" y2="70" stroke="#be123c" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'avatar_9',
    name: 'جغد دانا',
    tag: 'کلاه خلبانی',
    bgColor: '#4f46e5',
    ringColor: '#818cf8',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_owl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_owl)" />
        {/* Owl Ear Tufts */}
        <polygon points="26,18 36,36 20,38" fill="#4338ca" />
        <polygon points="74,18 80,38 64,36" fill="#4338ca" />
        {/* Body & Head */}
        <ellipse cx="50" cy="54" rx="30" ry="28" fill="#4338ca" />
        {/* Belly */}
        <ellipse cx="50" cy="68" rx="18" ry="14" fill="#e0e7ff" />
        {/* Big Owl Eyes */}
        <circle cx="36" cy="48" r="11" fill="#fde047" stroke="#18181b" strokeWidth="2" />
        <circle cx="36" cy="48" r="5" fill="#18181b" />
        <circle cx="34" cy="46" r="1.8" fill="#ffffff" />
        <circle cx="64" cy="48" r="11" fill="#fde047" stroke="#18181b" strokeWidth="2" />
        <circle cx="64" cy="48" r="5" fill="#18181b" />
        <circle cx="62" cy="46" r="1.8" fill="#ffffff" />
        {/* Beak */}
        <polygon points="46,54 54,54 50,62" fill="#f97316" />
        {/* Aviator Goggles Strap */}
        <path d="M18 36 L82 36" stroke="#92400e" strokeWidth="3.5" />
        <circle cx="36" cy="34" r="8" fill="#7dd3fc" stroke="#78350f" strokeWidth="2.5" />
        <circle cx="64" cy="34" r="8" fill="#7dd3fc" stroke="#78350f" strokeWidth="2.5" />
        <line x1="44" y1="34" x2="56" y2="34" stroke="#78350f" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'avatar_10',
    name: 'ببر خفن',
    tag: 'پرانرژی',
    bgColor: '#ef4444',
    ringColor: '#f87171',
    svg: ({ className = 'w-full h-full' }) => (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="g_tiger" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#g_tiger)" />
        {/* Tiger Ears */}
        <circle cx="26" cy="24" r="9" fill="#ea580c" />
        <circle cx="26" cy="24" r="5" fill="#ffffff" />
        <circle cx="74" cy="24" r="9" fill="#ea580c" />
        <circle cx="74" cy="24" r="5" fill="#ffffff" />
        {/* Face */}
        <circle cx="50" cy="52" r="30" fill="#f97316" />
        {/* Forehead Stripes */}
        <polygon points="50,26 47,36 53,36" fill="#18181b" />
        <polygon points="40,30 36,36 43,36" fill="#18181b" />
        <polygon points="60,30 57,36 64,36" fill="#18181b" />
        {/* Cheek Stripes */}
        <polygon points="22,46 30,48 24,52" fill="#18181b" />
        <polygon points="78,46 70,48 76,52" fill="#18181b" />
        {/* White Muzzle */}
        <ellipse cx="44" cy="62" rx="9" ry="7" fill="#ffffff" />
        <ellipse cx="56" cy="62" rx="9" ry="7" fill="#ffffff" />
        {/* Fierce/Cute Eyes */}
        <polygon points="32,46 44,48 34,51" fill="#18181b" />
        <circle cx="38" cy="48" r="2.2" fill="#ffffff" />
        <polygon points="68,46 56,48 66,51" fill="#18181b" />
        <circle cx="62" cy="48" r="2.2" fill="#ffffff" />
        {/* Nose & Smile */}
        <polygon points="47,56 53,56 50,60" fill="#f43f5e" />
        <path d="M44 65 Q50 71 56 65" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="48,65 50,68 52,65" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
      </svg>
    ),
  },
];

export function getAvatar(id?: string): AvatarItem {
  if (!id) return AVATARS[0];
  const found = AVATARS.find((a) => a.id === id);
  return found || AVATARS[0];
}
