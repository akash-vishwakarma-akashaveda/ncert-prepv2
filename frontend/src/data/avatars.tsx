import React from 'react';

export interface CuteCharacter {
  id: string;
  name: string;
  title: string;
  badge: string;
  bg: string;
  border: string;
  textColor: string;
  svg: React.ReactNode;
}

export const CUTE_CHARACTERS: CuteCharacter[] = [
  {
    id: 'owl',
    name: 'Pip the Owl',
    title: 'The Study Buddy',
    badge: 'Wise',
    bg: '#F0E9FF',
    border: '#D7C7FC',
    textColor: '#6D3FE0',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Body */}
        <circle cx="50" cy="54" r="38" fill="#8B6CF0" />
        {/* Belly */}
        <ellipse cx="50" cy="62" rx="24" ry="22" fill="#EAE2FF" />
        {/* Belly feathers */}
        <path d="M42 56q4 4 8 0 M46 64q4 4 8 0" stroke="#C9B8FA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Eye circles */}
        <circle cx="38" cy="46" r="13" fill="#FFFFFF" />
        <circle cx="62" cy="46" r="13" fill="#FFFFFF" />
        {/* Pupils */}
        <circle cx="40" cy="47" r="6.5" fill="#1E2233" />
        <circle cx="60" cy="47" r="6.5" fill="#1E2233" />
        {/* Pupil shine */}
        <circle cx="42" cy="45" r="2.5" fill="#FFFFFF" />
        <circle cx="62" cy="45" r="2.5" fill="#FFFFFF" />
        {/* Rosy cheeks */}
        <circle cx="28" cy="58" r="4.5" fill="#FF9EB5" opacity="0.8" />
        <circle cx="72" cy="58" r="4.5" fill="#FF9EB5" opacity="0.8" />
        {/* Beak */}
        <polygon points="50,52 45,58 55,58" fill="#FFAA2B" stroke="#E68A00" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Graduation cap */}
        <polygon points="50,14 26,23 50,32 74,23" fill="#1E2233" />
        <rect x="40" y="27" width="20" height="6" rx="2" fill="#2C3350" />
        <circle cx="50" cy="23" r="2" fill="#FFC53D" />
        <path d="M50 23l18 8" stroke="#FFC53D" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="68" cy="31" r="2.5" fill="#FFC53D" />
      </svg>
    ),
  },
  {
    id: 'fox',
    name: 'Sparky the Fox',
    title: 'Clever Thinker',
    badge: 'Clever',
    bg: '#FFF0E6',
    border: '#FFD4BE',
    textColor: '#E0603F',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Ears */}
        <polygon points="26,45 15,16 42,32" fill="#E0603F" />
        <polygon points="28,40 21,22 39,32" fill="#FFF0E6" />
        <polygon points="74,45 85,16 58,32" fill="#E0603F" />
        <polygon points="72,40 79,22 61,32" fill="#FFF0E6" />
        {/* Face */}
        <circle cx="50" cy="56" r="34" fill="#E0603F" />
        {/* White muzzle cheeks */}
        <ellipse cx="36" cy="62" rx="16" ry="14" fill="#FFFFFF" />
        <ellipse cx="64" cy="62" rx="16" ry="14" fill="#FFFFFF" />
        {/* Eyes */}
        <circle cx="36" cy="50" r="5" fill="#1E2233" />
        <circle cx="64" cy="50" r="5" fill="#1E2233" />
        <circle cx="38" cy="48" r="1.8" fill="#FFFFFF" />
        <circle cx="66" cy="48" r="1.8" fill="#FFFFFF" />
        {/* Glasses */}
        <circle cx="36" cy="50" r="10" fill="none" stroke="#2C3350" strokeWidth="2.5" />
        <circle cx="64" cy="50" r="10" fill="none" stroke="#2C3350" strokeWidth="2.5" />
        <path d="M46 50h8" stroke="#2C3350" strokeWidth="2.5" strokeLinecap="round" />
        {/* Nose */}
        <polygon points="50,65 46,60 54,60" fill="#1E2233" />
        {/* Cheeks */}
        <circle cx="27" cy="60" r="4" fill="#FFA5A5" opacity="0.8" />
        <circle cx="73" cy="60" r="4" fill="#FFA5A5" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'panda',
    name: 'Bamby the Panda',
    title: 'Calm & Focused',
    badge: 'Calm',
    bg: '#E7F7F1',
    border: '#BFE7D9',
    textColor: '#0B7A67',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Ears */}
        <circle cx="24" cy="28" r="13" fill="#1E2233" />
        <circle cx="76" cy="28" r="13" fill="#1E2233" />
        <circle cx="24" cy="28" r="6" fill="#3D455F" />
        <circle cx="76" cy="28" r="6" fill="#3D455F" />
        {/* Head */}
        <circle cx="50" cy="56" r="36" fill="#FFFFFF" />
        {/* Eye patches */}
        <ellipse cx="35" cy="52" rx="10" ry="12" fill="#1E2233" transform="rotate(-15 35 52)" />
        <ellipse cx="65" cy="52" rx="10" ry="12" fill="#1E2233" transform="rotate(15 65 52)" />
        {/* Eyes */}
        <circle cx="36" cy="51" r="4" fill="#FFFFFF" />
        <circle cx="64" cy="51" r="4" fill="#FFFFFF" />
        <circle cx="37" cy="51" r="2" fill="#1E2233" />
        <circle cx="65" cy="51" r="2" fill="#1E2233" />
        {/* Nose & Mouth */}
        <ellipse cx="50" cy="64" rx="5" ry="3.5" fill="#1E2233" />
        <path d="M47 69q3 3 6 0" stroke="#1E2233" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Rosy cheeks */}
        <circle cx="26" cy="63" r="4.5" fill="#FFB2C3" opacity="0.8" />
        <circle cx="74" cy="63" r="4.5" fill="#FFB2C3" opacity="0.8" />
        {/* Little green bamboo leaf on head */}
        <path d="M50 20c8-4 12 4 12 4s-4 8-12 4z" fill="#12A594" />
        <path d="M50 20c-8-4-12 4-12 4s4 8 12 4z" fill="#0B7A67" />
      </svg>
    ),
  },
  {
    id: 'cat',
    name: 'Milo the Cat',
    title: 'Curious Problem Solver',
    badge: 'Curious',
    bg: '#FFF8E6',
    border: '#FFE6A3',
    textColor: '#B87A06',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Ears */}
        <polygon points="24,42 16,14 44,28" fill="#FBBF24" />
        <polygon points="26,38 21,20 40,28" fill="#FDE68A" />
        <polygon points="76,42 84,14 56,28" fill="#FBBF24" />
        <polygon points="74,38 79,20 60,28" fill="#FDE68A" />
        {/* Head */}
        <circle cx="50" cy="56" r="35" fill="#FBBF24" />
        {/* Stripes on forehead */}
        <path d="M50 26v8 M44 28v6 M56 28v6" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
        {/* Eyes */}
        <ellipse cx="36" cy="50" rx="5.5" ry="6.5" fill="#1E2233" />
        <ellipse cx="64" cy="50" rx="5.5" ry="6.5" fill="#1E2233" />
        <circle cx="38" cy="48" r="2.2" fill="#FFFFFF" />
        <circle cx="66" cy="48" r="2.2" fill="#FFFFFF" />
        {/* Nose */}
        <polygon points="50,59 47,56 53,56" fill="#F472B6" />
        {/* Mouth */}
        <path d="M46 62q4 3 4 0q0 3 4 0" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Whiskers */}
        <line x1="20" y1="58" x2="32" y2="59" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="18" y1="64" x2="31" y2="63" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="80" y1="58" x2="68" y2="59" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="82" y1="64" x2="69" y2="63" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
        {/* Rosy cheeks */}
        <circle cx="28" cy="59" r="4.5" fill="#F472B6" opacity="0.6" />
        <circle cx="72" cy="59" r="4.5" fill="#F472B6" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'lion',
    name: 'Leo the Lion',
    title: 'Confident Champion',
    badge: 'Champion',
    bg: '#FEF3C7',
    border: '#FDE68A',
    textColor: '#B45309',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Mane */}
        <circle cx="50" cy="54" r="40" fill="#EA580C" />
        {/* Fluffy mane petals */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 50 + 38 * Math.cos(rad);
          const cy = 54 + 38 * Math.sin(rad);
          return <circle key={i} cx={cx} cy={cy} r="10" fill="#C2410C" opacity="0.7" />;
        })}
        {/* Face */}
        <circle cx="50" cy="56" r="30" fill="#FBBF24" />
        {/* Ears */}
        <circle cx="28" cy="36" r="8" fill="#FBBF24" />
        <circle cx="28" cy="36" r="4" fill="#EA580C" />
        <circle cx="72" cy="36" r="8" fill="#FBBF24" />
        <circle cx="72" cy="36" r="4" fill="#EA580C" />
        {/* Eyes */}
        <circle cx="39" cy="52" r="5" fill="#1E2233" />
        <circle cx="61" cy="52" r="5" fill="#1E2233" />
        <circle cx="41" cy="50" r="1.8" fill="#FFFFFF" />
        <circle cx="63" cy="50" r="1.8" fill="#FFFFFF" />
        {/* Muzzle */}
        <ellipse cx="50" cy="65" rx="10" ry="7" fill="#FEF3C7" />
        <polygon points="50,62 46,58 54,58" fill="#9A3412" />
        <path d="M47 65q3 2 3 0q0 2 3 0" stroke="#9A3412" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Crown */}
        <polygon points="38,28 44,17 50,24 56,17 62,28" fill="#FFD700" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="44" cy="17" r="1.5" fill="#EF4444" />
        <circle cx="56" cy="17" r="1.5" fill="#3B82F6" />
      </svg>
    ),
  },
  {
    id: 'bunny',
    name: 'Nova the Bunny',
    title: 'Astro Explorer',
    badge: 'Explorer',
    bg: '#FCE7F3',
    border: '#FBCFE8',
    textColor: '#BE185D',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Long Ears */}
        <ellipse cx="36" cy="26" rx="9" ry="24" fill="#F472B6" transform="rotate(-10 36 26)" />
        <ellipse cx="36" cy="26" rx="5" ry="18" fill="#FCE7F3" transform="rotate(-10 36 26)" />
        <ellipse cx="64" cy="26" rx="9" ry="24" fill="#F472B6" transform="rotate(10 64 26)" />
        <ellipse cx="64" cy="26" rx="5" ry="18" fill="#FCE7F3" transform="rotate(10 64 26)" />
        {/* Head */}
        <circle cx="50" cy="60" r="32" fill="#FFFFFF" />
        {/* Eyes */}
        <ellipse cx="38" cy="56" rx="4.5" ry="6" fill="#1E2233" />
        <ellipse cx="62" cy="56" rx="4.5" ry="6" fill="#1E2233" />
        <circle cx="40" cy="54" r="2" fill="#FFFFFF" />
        <circle cx="64" cy="54" r="2" fill="#FFFFFF" />
        {/* Nose & Mouth */}
        <polygon points="50,64 47,61 53,61" fill="#F43F5E" />
        <path d="M47 67q3 3 3 0q0 3 3 0" stroke="#F43F5E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Rosy Cheeks */}
        <circle cx="28" cy="64" r="5" fill="#FDA4AF" opacity="0.8" />
        <circle cx="72" cy="64" r="5" fill="#FDA4AF" opacity="0.8" />
        {/* Star hair accessory */}
        <polygon points="50,38 52,43 57,44 53,48 54,53 50,50 46,53 47,48 43,44 48,43" fill="#FBBF24" />
      </svg>
    ),
  },
  {
    id: 'bear',
    name: 'Barnaby the Bear',
    title: 'Steady & Determined',
    badge: 'Scholar',
    bg: '#ECE7FE',
    border: '#DDD3FD',
    textColor: '#5B21B6',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Ears */}
        <circle cx="24" cy="28" r="12" fill="#8D5B4C" />
        <circle cx="24" cy="28" r="6" fill="#E8B49B" />
        <circle cx="76" cy="28" r="12" fill="#8D5B4C" />
        <circle cx="76" cy="28" r="6" fill="#E8B49B" />
        {/* Head */}
        <circle cx="50" cy="56" r="35" fill="#8D5B4C" />
        {/* Muzzle */}
        <ellipse cx="50" cy="65" rx="16" ry="12" fill="#E8B49B" />
        <ellipse cx="50" cy="60" rx="6" ry="4" fill="#2C1810" />
        <path d="M46 66q4 3 8 0" stroke="#2C1810" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="36" cy="49" r="4.5" fill="#1E2233" />
        <circle cx="64" cy="49" r="4.5" fill="#1E2233" />
        <circle cx="37.5" cy="47.5" r="1.8" fill="#FFFFFF" />
        <circle cx="65.5" cy="47.5" r="1.8" fill="#FFFFFF" />
        {/* Cheeks */}
        <circle cx="26" cy="60" r="4.5" fill="#F472B6" opacity="0.5" />
        <circle cx="74" cy="60" r="4.5" fill="#F472B6" opacity="0.5" />
        {/* Bow tie */}
        <polygon points="42,84 50,88 42,92" fill="#6D3FE0" />
        <polygon points="58,84 50,88 58,92" fill="#6D3FE0" />
        <circle cx="50" cy="88" r="3" fill="#8B6CF0" />
      </svg>
    ),
  },
  {
    id: 'penguin',
    name: 'Penny the Penguin',
    title: 'Disciplined Learner',
    badge: 'Cool',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    textColor: '#0369A1',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Body */}
        <ellipse cx="50" cy="56" rx="34" ry="36" fill="#1E293B" />
        {/* White Belly */}
        <ellipse cx="50" cy="60" rx="23" ry="26" fill="#FFFFFF" />
        {/* Beak */}
        <polygon points="50,52 44,58 56,58" fill="#F59E0B" />
        {/* Eyes */}
        <circle cx="38" cy="45" r="5" fill="#1E2233" />
        <circle cx="62" cy="45" r="5" fill="#1E2233" />
        <circle cx="40" cy="43" r="2" fill="#FFFFFF" />
        <circle cx="64" cy="43" r="2" fill="#FFFFFF" />
        {/* Cheeks */}
        <circle cx="28" cy="54" r="4.5" fill="#FF9EB5" opacity="0.8" />
        <circle cx="72" cy="54" r="4.5" fill="#FF9EB5" opacity="0.8" />
        {/* Scarf */}
        <path d="M26 70q24 10 48 0" stroke="#06B6D4" strokeWidth="8" fill="none" strokeLinecap="round" />
        <rect x="58" y="70" width="8" height="18" rx="3" fill="#0891B2" />
      </svg>
    ),
  },
  {
    id: 'koala',
    name: 'Kobi the Koala',
    title: 'Warm & Friendly',
    badge: 'Kind',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    textColor: '#475569',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Big fluffy ears */}
        <circle cx="20" cy="38" r="18" fill="#94A3B8" />
        <circle cx="20" cy="38" r="10" fill="#E2E8F0" />
        <circle cx="80" cy="38" r="18" fill="#94A3B8" />
        <circle cx="80" cy="38" r="10" fill="#E2E8F0" />
        {/* Head */}
        <circle cx="50" cy="56" r="33" fill="#94A3B8" />
        {/* Big characteristic nose */}
        <ellipse cx="50" cy="58" rx="10" ry="15" fill="#1E293B" />
        {/* Eyes */}
        <circle cx="34" cy="50" r="4.5" fill="#1E2233" />
        <circle cx="66" cy="50" r="4.5" fill="#1E2233" />
        <circle cx="35.5" cy="48.5" r="1.8" fill="#FFFFFF" />
        <circle cx="67.5" cy="48.5" r="1.8" fill="#FFFFFF" />
        {/* Cheeks */}
        <circle cx="25" cy="62" r="4.5" fill="#FDA4AF" opacity="0.7" />
        <circle cx="75" cy="62" r="4.5" fill="#FDA4AF" opacity="0.7" />
        {/* Hair tuft */}
        <path d="M46 25q4-5 8 0" stroke="#64748B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'tiger',
    name: 'Tiggy the Tiger',
    title: 'Full of Energy',
    badge: 'Energetic',
    bg: '#FEF3C7',
    border: '#FDE68A',
    textColor: '#D97706',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {/* Ears */}
        <circle cx="24" cy="30" r="11" fill="#F97316" />
        <circle cx="24" cy="30" r="5" fill="#FFFFFF" />
        <circle cx="76" cy="30" r="11" fill="#F97316" />
        <circle cx="76" cy="30" r="5" fill="#FFFFFF" />
        {/* Head */}
        <circle cx="50" cy="56" r="34" fill="#F97316" />
        {/* Stripes */}
        <path d="M50 24v8 M43 27l3 5 M57 27l-3 5" stroke="#1E2233" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 50l7 2 M18 56l7 1 M82 50l-7 2 M82 56l-7 1" stroke="#1E2233" strokeWidth="2.5" strokeLinecap="round" />
        {/* Muzzle */}
        <ellipse cx="50" cy="66" rx="14" ry="10" fill="#FFFFFF" />
        <polygon points="50,62 46,58 54,58" fill="#1E2233" />
        <path d="M47 66q3 2 3 0q0 2 3 0" stroke="#1E2233" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="36" cy="49" r="4.5" fill="#1E2233" />
        <circle cx="64" cy="49" r="4.5" fill="#1E2233" />
        <circle cx="38" cy="47.5" r="1.8" fill="#FFFFFF" />
        <circle cx="66" cy="47.5" r="1.8" fill="#FFFFFF" />
        {/* Cheeks */}
        <circle cx="27" cy="62" r="4" fill="#FDA4AF" opacity="0.8" />
        <circle cx="73" cy="62" r="4" fill="#FDA4AF" opacity="0.8" />
      </svg>
    ),
  },
];

export const CUTE_CHARACTERS_MAP = new Map<string, CuteCharacter>(
  CUTE_CHARACTERS.map((c) => [c.id, c])
);

export function getCuteCharacter(idOrSeed?: string | null): CuteCharacter | null {
  if (!idOrSeed) return null;
  // If exact id match
  if (CUTE_CHARACTERS_MAP.has(idOrSeed)) {
    return CUTE_CHARACTERS_MAP.get(idOrSeed)!;
  }
  // Otherwise check if seed contains or maps to an id
  const lower = idOrSeed.toLowerCase();
  for (const char of CUTE_CHARACTERS) {
    if (lower.includes(char.id)) return char;
  }
  return null;
}

export interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  displayName,
  size = 'md',
  className = '',
}) => {
  const character = getCuteCharacter(photoURL);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[11px] rounded-[10px]',
    sm: 'w-9 h-9 text-xs rounded-[12px]',
    md: 'w-10 h-10 text-sm rounded-[14px]',
    lg: 'w-14 h-14 text-xl rounded-[18px]',
    xl: 'w-20 h-20 text-3xl rounded-[26px]',
  };

  if (character) {
    return (
      <div
        className={`shrink-0 overflow-hidden flex items-center justify-center border-2 ${sizeClasses[size]} ${className}`}
        style={{ background: character.bg, borderColor: character.border }}
        title={character.name}
      >
        <div className="w-[88%] h-[88%] flex items-center justify-center">
          {character.svg}
        </div>
      </div>
    );
  }

  // If photoURL is a full URL (e.g. Google photo)
  if (photoURL && (photoURL.startsWith('http://') || photoURL.startsWith('https://') || photoURL.startsWith('data:'))) {
    return (
      <img
        src={photoURL}
        alt={displayName || 'Avatar'}
        className={`shrink-0 object-cover border-2 border-[color:var(--card-line)] ${sizeClasses[size]} ${className}`}
      />
    );
  }

  // Fallback initials
  const initial = (displayName?.trim().charAt(0) || 'S').toUpperCase();
  return (
    <div
      className={`shrink-0 bg-[color:var(--brand)] text-white font-display flex items-center justify-center shadow-sm ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  );
};
