import type { User } from '@prisma/client';

/** Never send passwordHash or googleId to the client. One place all auth/user routes funnel through. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    phoneNumber: user.phoneNumber,
    city: user.city,
    role: user.role,
    referralCode: user.referralCode,
    hasReferrer: user.referredByCode != null,
    // Shown on the profile: students screenshot it to claim referral goodies.
    referredByCode: user.referredByCode,
    classGrade: user.classGrade,
    xp: user.xp,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    lastWatchedVideo: user.lastWatchedVideo,
    studyGoalMinutes: user.studyGoalMinutes,
    onboardingCompleted: user.onboardingCompleted,
    focusSubjects: user.focusSubjects,
    stream: user.stream,
    remindersEnabled: user.remindersEnabled,
    reminderFrequency: user.reminderFrequency,
    reminderHour: user.reminderHour,
    emailVerified: user.emailVerified,
    provider: user.passwordHash ? ('password' as const) : ('google.com' as const),
    consent:
      user.consentStatus === 'GRANTED' || user.consentMethod
        ? {
            status: user.consentStatus === 'GRANTED' ? ('granted' as const) : ('pending_parent' as const),
            age_group: user.consentAgeGroup,
            method: user.consentMethod,
            notice_version: user.consentNoticeVersion,
            language: user.consentLanguage,
            parent_name: user.consentParentName,
            parent_email: user.consentParentEmail,
            parent_phone: user.consentParentPhone,
            granted_at: user.consentGrantedAt,
            requested_at: user.consentRequestedAt,
          }
        : undefined,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
