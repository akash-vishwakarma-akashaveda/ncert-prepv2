import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { ReferralGoodies } from '../../services/dashboardControl';

/** The scrolling strip itself, also used as the live preview in the admin's Referral Goodies tab. */
export const GoodiesStrip: React.FC<{ goodies: ReferralGoodies; action?: React.ReactNode }> = ({ goodies, action }) => {
  const line = [goodies.message, goodies.claimHow].filter((s) => s.trim()).join('  •  ');
  return (
    <div role="region" aria-label="Referral goodies" className="flex items-stretch bg-[#FFC53D] border-b-2 border-[#E0A81F] text-[#1E2233]">
      <div className="marquee marquee-fade flex-1 min-w-0 overflow-hidden py-1.5">
        <ul className="flex w-max gap-10 animate-marquee [animation-duration:30s]">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} aria-hidden={i > 0 || undefined} className="flex items-center gap-2 whitespace-nowrap text-[13px] font-extrabold">
              <Gift className="w-4 h-4 shrink-0 text-[#B4570B]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      {action && <div className="shrink-0 flex items-center pl-2 pr-3 sm:pr-4 bg-[#FFC53D]">{action}</div>}
    </div>
  );
};

const ACTION = 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1E2233] text-white text-[12px] font-extrabold hover:bg-[#2C3350] whitespace-nowrap';

/**
 * Referral goodies banner: a slim scrolling strip on top of every public and student page while the admin has
 * the offer switched on (Dashboard Control → Referral Goodies). Students get a shortcut to the card they
 * screenshot to claim; visitors get the sign-up.
 */
export const GoodiesMarquee: React.FC = () => {
  const { config } = useDashboardConfig();
  const { user, isAdmin, setAuthModalOpen } = useAuth();
  const { pathname } = useLocation();
  const goodies = config?.goodies;
  if (!goodies?.enabled || isAdmin || !goodies.message.trim()) return null;
  const action = user ? (
    pathname.startsWith('/app/profile') ? null : (
      <Link to="/app/profile?section=referrals" className={ACTION}>
        My referral code
      </Link>
    )
  ) : (
    <button type="button" onClick={() => setAuthModalOpen(true)} className={`${ACTION} cursor-pointer`}>
      Get your code
    </button>
  );
  return <GoodiesStrip goodies={goodies} action={action} />;
};
