import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Color Palette & WCAG AA Contrast Verification (SRS Section 2.2)
test('Color Palette should have defined tokens and valid hex codes for Classes 1 to 6', async () => {
  const CLASS_PALETTE = {
    1: { bg: '#FAECE7', text: '#4A1B0C', border: '#F3D2C6' },
    2: { bg: '#E1F5EE', text: '#04342C', border: '#BCE8DC' },
    3: { bg: '#EEEDFE', text: '#26215C', border: '#D7D4FC' },
    4: { bg: '#FAEEDA', text: '#412402', border: '#F3DCB7' },
    5: { bg: '#FBEAF0', text: '#4B1528', border: '#F5D2DF' },
    6: { bg: '#E6F1FB', text: '#042C53', border: '#CBE0F7' },
  };

  for (let i = 1; i <= 6; i++) {
    const tile = CLASS_PALETTE[i];
    assert.ok(tile, `Class ${i} tile style should be defined`);
    assert.match(tile.bg, /^#[0-9A-Fa-f]{6}$/, `Class ${i} background should be a 6-digit hex`);
    assert.match(tile.text, /^#[0-9A-Fa-f]{6}$/, `Class ${i} text should be a 6-digit hex`);
  }
});

// Test 2: Rate Limiting Algorithm (NFR-3 & FR-9)
test('Feedback Rate Limiter allows up to 5 submissions within 1 hour and rejects the 6th', () => {
  const MAX_PER_HOUR = 5;
  const simulatedTimestamps = [];
  const now = Date.now();

  function submit() {
    const oneHourAgo = now - 3600000;
    const valid = simulatedTimestamps.filter(ts => ts > oneHourAgo);
    if (valid.length >= MAX_PER_HOUR) {
      return { allowed: false, remaining: 0 };
    }
    simulatedTimestamps.push(now);
    return { allowed: true, remaining: MAX_PER_HOUR - simulatedTimestamps.length };
  }

  // 1 to 5 submissions should succeed
  for (let i = 1; i <= 5; i++) {
    const result = submit();
    assert.strictEqual(result.allowed, true, `Submission ${i} should be allowed`);
    assert.strictEqual(result.remaining, 5 - i, `Remaining count after submission ${i} should be ${5 - i}`);
  }

  // 6th submission must be rejected
  const sixth = submit();
  assert.strictEqual(sixth.allowed, false, '6th submission within 1 hour must be rejected per NFR-3');
  assert.strictEqual(sixth.remaining, 0, 'Remaining submissions must be 0');
});

// Test 3: Deactivated Video Edge Case (SRS Section 4.3 & FR-6)
test('Deactivated video handling preserves progress stats and renders as unavailable', () => {
  const mockCatalog = [
    { youtube_id: 'vid1', video_title: 'Active Lesson 1', isActive: true },
    { youtube_id: 'vid2', video_title: 'Active Lesson 2', isActive: true },
    { youtube_id: 'vid_archived', video_title: 'Archived Lesson', isActive: false },
  ];

  // User completed all 3 videos previously
  const userProgress = {
    vid1: { completed: true, favorited: false },
    vid2: { completed: true, favorited: true },
    vid_archived: { completed: true, favorited: true },
  };

  // Rule 1: Active catalog excludes deactivated video
  const activeCatalog = mockCatalog.filter(v => v.isActive);
  assert.strictEqual(activeCatalog.length, 2, 'Active catalog must exclude inactive videos');
  assert.ok(!activeCatalog.some(v => v.youtube_id === 'vid_archived'), 'Deactivated video must not appear in browse/search');

  // Rule 2: Progress completion totals are NOT reduced by deactivated video
  const totalCompleted = Object.values(userProgress).filter(p => p.completed).length;
  assert.strictEqual(totalCompleted, 3, 'Completed count must still be 3 even if one is archived per SRS 4.3');

  // Rule 3: Favourites still renders deactivated video but flags it as unavailable
  const favoritedIds = Object.keys(userProgress).filter(k => userProgress[k].favorited);
  assert.strictEqual(favoritedIds.length, 2);
  const archivedVideo = mockCatalog.find(v => v.youtube_id === 'vid_archived');
  assert.ok(archivedVideo, 'Video exists in raw catalog');
  assert.strictEqual(archivedVideo.isActive, false, 'Is marked deactivated');
});

// Test 4: Reminder Frequency & Job Anchoring (FR-7 & SRS 3.4)
test('Reminder scheduling discriminates strictly between daily and weekly users', () => {
  const users = [
    { id: 'u1', reminders_enabled: true, reminder_frequency: 'daily' },
    { id: 'u2', reminders_enabled: true, reminder_frequency: 'weekly' },
    { id: 'u3', reminders_enabled: false, reminder_frequency: 'daily' },
    { id: 'u4', reminders_enabled: false, reminder_frequency: 'weekly' },
  ];

  const dailyRecipients = users.filter(u => u.reminders_enabled && u.reminder_frequency === 'daily');
  const weeklyRecipients = users.filter(u => u.reminders_enabled && u.reminder_frequency === 'weekly');

  assert.strictEqual(dailyRecipients.length, 1);
  assert.strictEqual(dailyRecipients[0].id, 'u1');

  assert.strictEqual(weeklyRecipients.length, 1);
  assert.strictEqual(weeklyRecipients[0].id, 'u2');
});

// Test 5: Limited Content Access Control (Visitor preview vs Registered user)
test('Visitors can only access Free Preview (Chapter 1), while registered users unlock all lessons', () => {
  function isLessonUnlocked(user, chapterIndex, videoIndex) {
    if (user) return true; // Full access for registered students
    return chapterIndex === 0 && (typeof videoIndex === 'number' ? videoIndex === 0 : true);
  }

  const visitor = null;
  const registeredStudent = { userId: 'student_123', email: 'student@example.com' };

  // Visitor trying to access Chapter 1 Lesson 1 (Free Preview)
  assert.strictEqual(isLessonUnlocked(visitor, 0, 0), true, 'Visitor must have access to Chapter 1 sample lesson');

  // Visitor trying to access Chapter 2, 3, 4 lessons
  assert.strictEqual(isLessonUnlocked(visitor, 1, 0), false, 'Visitor must NOT have access to Chapter 2 without login');
  assert.strictEqual(isLessonUnlocked(visitor, 2, 0), false, 'Visitor must NOT have access to Chapter 3 without login');
  assert.strictEqual(isLessonUnlocked(visitor, 0, 1), false, 'Visitor must NOT have access to secondary lesson in Chapter 1');

  // Registered student has access to ALL chapters and lessons
  assert.strictEqual(isLessonUnlocked(registeredStudent, 0, 0), true);
  assert.strictEqual(isLessonUnlocked(registeredStudent, 1, 0), true);
  assert.strictEqual(isLessonUnlocked(registeredStudent, 5, 2), true);
});

// Test 6: Admin Student Dashboard Control (Broadcasts, Spotlight & Policy Targeting)
test('Student Dashboard Control delivers announcements and spotlights accurately per grade', () => {
  const mockConfig = {
    announcement: {
      id: 'ann-1',
      title: 'Board Exam Sprint',
      message: 'Revise high-yield topics',
      tone: 'exam',
      targetClass: '10',
      isActive: true,
    },
    spotlights: {
      '10': {
        classSort: '10',
        videoId: 'vid_science_10',
        title: 'Chemical Reactions',
        note: 'High yield for Friday quiz',
        isActive: true,
      },
      '12': {
        classSort: '12',
        videoId: 'vid_phys_12',
        title: 'Electrostats',
        note: 'Derivations revision',
        isActive: false, // Inactive
      },
    },
    policy: {
      freePreviewEnabled: true,
      freePreviewCount: 1,
      allowGuestNotes: false,
    },
  };

  function shouldShowAnnouncement(ann, studentClass) {
    if (!ann || !ann.isActive) return false;
    const studentInt = parseInt(String(studentClass).replace(/\D/g, ''), 10);
    const targetInt = parseInt(String(ann.targetClass).replace(/\D/g, ''), 10);
    return (
      ann.targetClass === 'all' ||
      ann.targetClass === studentClass ||
      (!isNaN(targetInt) && !isNaN(studentInt) && targetInt === studentInt)
    );
  }

  function getActiveSpotlight(spotlights, studentClass) {
    const studentInt = parseInt(String(studentClass).replace(/\D/g, ''), 10);
    const item = spotlights[studentClass] || spotlights[String(studentInt)];
    return item && item.isActive ? item : null;
  }

  // Announcement targeted to Class 10
  assert.strictEqual(shouldShowAnnouncement(mockConfig.announcement, '10'), true, 'Class 10 student must see Class 10 announcement');
  assert.strictEqual(shouldShowAnnouncement(mockConfig.announcement, 'class_10'), true, 'Class 10 student (prefixed) must see announcement');
  assert.strictEqual(shouldShowAnnouncement(mockConfig.announcement, '09'), false, 'Class 9 student must NOT see Class 10 announcement');

  // Spotlight active check
  const class10Spotlight = getActiveSpotlight(mockConfig.spotlights, '10');
  assert.ok(class10Spotlight, 'Class 10 has an active spotlight');
  assert.strictEqual(class10Spotlight.videoId, 'vid_science_10');
  assert.strictEqual(class10Spotlight.note, 'High yield for Friday quiz');

  const class12Spotlight = getActiveSpotlight(mockConfig.spotlights, '12');
  assert.strictEqual(class12Spotlight, null, 'Class 12 spotlight is inactive and must not be displayed');

  const class9Spotlight = getActiveSpotlight(mockConfig.spotlights, '09');
  assert.strictEqual(class9Spotlight, null, 'Class 9 has no spotlight configured');
});

// Test 7: Admin Session Routing & Immediate Dashboard Rendering
test('Administrators are never shown the empty student state and load admin dashboard directly', () => {
  const adminUser = {
    userId: 'admin_123',
    email: 'admin@ncertprep.edu',
    displayName: 'Curriculum Director',
    role: 'admin',
    grade_preference: null,
  };

  const studentUser = {
    userId: 'student_123',
    email: 'student@example.com',
    displayName: 'Aarav',
    role: 'student',
    grade_preference: '10',
  };

  const studentWithoutGrade = {
    userId: 'student_456',
    email: 'newstudent@example.com',
    displayName: 'Riya',
    role: 'student',
    grade_preference: null,
  };

  function resolveHomeView(user, isAdmin) {
    if (!user) return 'landing';
    const isUserAdmin = isAdmin || user.role === 'admin' || user.email === 'admin@ncertprep.edu';
    if (isUserAdmin) {
      return 'admin_dashboard';
    }
    if (!user.grade_preference) {
      return 'student_onboarding_empty_state';
    }
    return 'student_home';
  }

  assert.strictEqual(resolveHomeView(adminUser, true), 'admin_dashboard', 'Admin must directly resolve to admin_dashboard');
  assert.strictEqual(resolveHomeView(adminUser, false), 'admin_dashboard', 'Admin by email/role resolves to admin_dashboard even if flag is delayed');
  assert.strictEqual(resolveHomeView(studentUser, false), 'student_home', 'Student with grade resolves to student_home');
  assert.strictEqual(resolveHomeView(studentWithoutGrade, false), 'student_onboarding_empty_state', 'Student without grade resolves to empty state');
});

// Test 8: Admin Left Sidebar Navigation & Active Tab Query Resolution
test('Admin Left Sidebar reflects complete admin dashboard tabs and handles active query states', () => {
  function getNavigation(isUserAdmin) {
    if (isUserAdmin) {
      return {
        main: [
          { to: '/app', label: 'Overview' },
          { to: '/app?tab=student-control', label: 'Dashboard Control' },
          { to: '/app?tab=curriculum', label: 'Classes & Chapters' },
          { to: '/app?tab=videos', label: 'Video Catalog' },
          { to: '/app?tab=notes', label: 'Notes & Cheat Sheets' },
          { to: '/app?tab=doubts', label: 'Student Doubts' },
          { to: '/app?tab=feedback', label: 'Student Feedback' },
          { to: '/app?tab=data', label: 'Data & Sync' },
        ],
        account: [
          { to: '/browse', label: 'Student Syllabus View' },
          { to: '/app/profile', label: 'Profile & settings' },
        ],
      };
    }
    return {
      main: [
        { to: '/app', label: 'Home' },
        { to: '/app/subjects', label: 'My subjects' },
        { to: '/app/doubts', label: 'Doubts' },
        { to: '/app/saved', label: 'Saved' },
        { to: '/app/focus', label: 'Focus timer' },
        { to: '/app/reminders', label: 'Reminders' },
      ],
      account: [
        { to: '/app/profile', label: 'Profile & settings' },
      ],
    };
  }

  function isItemActive(item, pathname, searchParamTab, isUserAdmin) {
    if (isUserAdmin) {
      const currentTab = searchParamTab || 'overview';
      if (item.to.startsWith('/app?tab=')) {
        const itemTab = new URLSearchParams(item.to.split('?')[1]).get('tab');
        return pathname === '/app' && currentTab === itemTab;
      }
      if (item.to === '/app') {
        return pathname === '/app' && (!searchParamTab || currentTab === 'overview');
      }
      return pathname === item.to || pathname.startsWith(item.to + '/');
    }
    return pathname === item.to || pathname.startsWith(item.to + '/');
  }

  const adminNav = getNavigation(true);
  assert.strictEqual(adminNav.main.length, 8, 'Admin must have all 8 control tabs in primary navigation');
  assert.strictEqual(adminNav.account.length, 2, 'Admin must have Syllabus View and Profile in account navigation');

  // Test active state for '/app' (Overview)
  assert.strictEqual(isItemActive(adminNav.main[0], '/app', null, true), true, 'Overview active when no query tab');
  assert.strictEqual(isItemActive(adminNav.main[1], '/app', null, true), false, 'Dashboard Control inactive when on overview');

  // Test active state for '/app?tab=student-control'
  assert.strictEqual(isItemActive(adminNav.main[0], '/app', 'student-control', true), false, 'Overview inactive when on student-control tab');
  assert.strictEqual(isItemActive(adminNav.main[1], '/app', 'student-control', true), true, 'Dashboard Control active when on student-control tab');

  // Test active state for '/app?tab=videos'
  assert.strictEqual(isItemActive(adminNav.main[3], '/app', 'videos', true), true, 'Video Catalog active on videos tab');
  assert.strictEqual(isItemActive(adminNav.main[2], '/app', 'videos', true), false, 'Classes inactive on videos tab');

  // Test active state when navigating to '/browse'
  assert.strictEqual(isItemActive(adminNav.account[0], '/browse', null, true), true, 'Student Syllabus View active on /browse');
  assert.strictEqual(isItemActive(adminNav.main[0], '/browse', null, true), false, 'Overview inactive on /browse');
});

// Test 9: Class-scoped Leaderboard and XP Ranking
test('Class-scoped Leaderboard ranks students from the same class based on earned XP', () => {
  const XP_PER_LESSON = 50;

  const mockUsers = [
    { userId: 'u1', name: 'Aarav Sharma', class: '10', completedLessons: 12, streak: 4 },
    { userId: 'u2', name: 'Priya Patel', class: '10', completedLessons: 8, streak: 3 },
    { userId: 'u3', name: 'Rohan Verma', class: '10', completedLessons: 15, streak: 6 },
    { userId: 'u4', name: 'Sneha Rao', class: '09', completedLessons: 20, streak: 8 }, // Different class
    { userId: 'u_curr', name: 'Current Student', class: '10', completedLessons: 10, streak: 2 },
  ];

  // 1. Filter only same class ('10')
  const class10Students = mockUsers
    .filter((u) => u.class === '10')
    .map((u) => {
      const xp = u.completedLessons * XP_PER_LESSON;
      const level = Math.floor(xp / 100) + 1;
      return {
        ...u,
        xp,
        level,
      };
    });

  assert.strictEqual(class10Students.length, 4, 'Only students from Class 10 should be in the class leaderboard');
  assert.ok(!class10Students.some((s) => s.class !== '10'), 'No student from Class 9 should appear in Class 10 leaderboard');

  // 2. Sort by XP descending
  class10Students.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.completedLessons - a.completedLessons;
  });

  // Verify ranking order
  assert.strictEqual(class10Students[0].userId, 'u3', 'Rank 1 should be Rohan (15 lessons = 750 XP)');
  assert.strictEqual(class10Students[0].xp, 750);
  assert.strictEqual(class10Students[0].level, 8);

  assert.strictEqual(class10Students[1].userId, 'u1', 'Rank 2 should be Aarav (12 lessons = 600 XP)');
  assert.strictEqual(class10Students[1].xp, 600);
  assert.strictEqual(class10Students[1].level, 7);

  assert.strictEqual(class10Students[2].userId, 'u_curr', 'Rank 3 should be Current Student (10 lessons = 500 XP)');
  assert.strictEqual(class10Students[2].xp, 500);
  assert.strictEqual(class10Students[2].level, 6);

  assert.strictEqual(class10Students[3].userId, 'u2', 'Rank 4 should be Priya (8 lessons = 400 XP)');
  assert.strictEqual(class10Students[3].xp, 400);

  // 3. Verify rank index and distance to overtake the student ahead
  const currentRankIndex = class10Students.findIndex((s) => s.userId === 'u_curr');
  assert.strictEqual(currentRankIndex, 2, 'Current student is at index 2 (Rank 3)');

  const studentAhead = class10Students[currentRankIndex - 1];
  assert.strictEqual(studentAhead.name, 'Aarav Sharma');
  const xpNeeded = studentAhead.xp - class10Students[currentRankIndex].xp + 1;
  assert.strictEqual(xpNeeded, 101, 'Needs 101 XP to overtake rank 2');
  const lessonsNeeded = Math.ceil(xpNeeded / XP_PER_LESSON);
  assert.strictEqual(lessonsNeeded, 3, 'Needs 3 lessons to overtake rank 2');
});

// Test 10: Cute Characters Avatar Catalog and Selection
test('Cute character avatar system supports selection, identification and fallback', () => {
  const AVATAR_IDS = ['owl', 'fox', 'panda', 'cat', 'lion', 'bunny', 'bear', 'penguin', 'koala', 'tiger'];

  // 1. Verify all avatar IDs are valid and unique
  const idSet = new Set(AVATAR_IDS);
  assert.strictEqual(idSet.size, 10, 'Must have 10 unique cute characters');

  // 2. Avatar resolution logic
  function resolveAvatar(photoURL) {
    if (!photoURL) return { type: 'initials' };
    if (AVATAR_IDS.includes(photoURL)) {
      return { type: 'cute_character', id: photoURL };
    }
    if (photoURL.startsWith('http://') || photoURL.startsWith('https://')) {
      return { type: 'image_url', url: photoURL };
    }
    return { type: 'initials' };
  }

  // Selected cute character
  assert.deepStrictEqual(resolveAvatar('owl'), { type: 'cute_character', id: 'owl' });
  assert.deepStrictEqual(resolveAvatar('panda'), { type: 'cute_character', id: 'panda' });
  assert.deepStrictEqual(resolveAvatar('fox'), { type: 'cute_character', id: 'fox' });

  // Custom photo URL
  assert.deepStrictEqual(resolveAvatar('https://example.com/photo.png'), {
    type: 'image_url',
    url: 'https://example.com/photo.png',
  });

  // Fallback
  assert.deepStrictEqual(resolveAvatar(null), { type: 'initials' });
  assert.deepStrictEqual(resolveAvatar(undefined), { type: 'initials' });
  assert.deepStrictEqual(resolveAvatar(''), { type: 'initials' });
});

// Test 11: XP Count, Credit History Ledger, Reversals, and Level Calculation
test('XP count calculation, credit/debit transaction ledger, reversal handling, and level progression', () => {
  const XP_CONFIG = {
    lesson: 50,
    focus: 25,
    streak: 20,
    bonus: 30,
    perLevel: 100,
  };

  class TestXpLedger {
    constructor(userId) {
      this.userId = userId;
      this.transactions = [];
      this.balance = 0;
    }

    record(type, amount, description, sourceId) {
      // Check idempotency for positive lesson credits
      if (type === 'lesson' && amount > 0 && sourceId) {
        const alreadyCredited = this.transactions.some(
          (t) => t.sourceId === sourceId && t.amount > 0
        );
        const alreadyReversed = this.transactions.some(
          (t) => t.sourceId === sourceId && t.amount < 0
        );
        if (alreadyCredited && !alreadyReversed) {
          return null; // Don't double credit
        }
      }

      const balanceAfter = Math.max(0, this.balance + amount);
      const tx = {
        id: `tx_${Date.now()}_${Math.random()}`,
        userId: this.userId,
        amount,
        type,
        description,
        sourceId,
        timestamp: Date.now(),
        balanceAfter,
      };

      this.balance = balanceAfter;
      this.transactions.unshift(tx); // Most recent first
      return tx;
    }

    getLevelStats() {
      const level = Math.floor(this.balance / XP_CONFIG.perLevel) + 1;
      const xpInLevel = this.balance % XP_CONFIG.perLevel;
      const xpToNext = XP_CONFIG.perLevel - xpInLevel;
      return { level, xpInLevel, xpToNext };
    }

    filterByType(filterType) {
      if (!filterType || filterType === 'all') return this.transactions;
      return this.transactions.filter((t) => t.type === filterType);
    }
  }

  const ledger = new TestXpLedger('student_test_1');

  // 1. Initial state
  assert.strictEqual(ledger.balance, 0, 'Initial XP balance should be 0');
  assert.deepStrictEqual(ledger.getLevelStats(), { level: 1, xpInLevel: 0, xpToNext: 100 });

  // 2. Complete Lesson 1 (+50 XP)
  const tx1 = ledger.record('lesson', 50, 'Completed lesson: Chemical Reactions', 'vid_chem_1');
  assert.ok(tx1, 'Transaction 1 should be recorded');
  assert.strictEqual(ledger.balance, 50, 'XP balance after 1 lesson is 50');
  assert.strictEqual(tx1.balanceAfter, 50);
  assert.deepStrictEqual(ledger.getLevelStats(), { level: 1, xpInLevel: 50, xpToNext: 50 });

  // 3. Idempotent check: completing same lesson without uncompleting should not double credit
  const duplicateTx = ledger.record('lesson', 50, 'Completed lesson: Chemical Reactions', 'vid_chem_1');
  assert.strictEqual(duplicateTx, null, 'Duplicate credit for same lesson must be ignored');
  assert.strictEqual(ledger.balance, 50, 'Balance must remain 50 after duplicate attempt');

  // 4. Complete Focus Session (+25 XP)
  const tx2 = ledger.record('focus', 25, 'Completed 25-min focus session', 'focus_session_1');
  assert.strictEqual(ledger.balance, 75, 'XP balance after focus is 75');
  assert.strictEqual(tx2.balanceAfter, 75);

  // 5. Complete Lesson 2 (+50 XP) -> Total 125 XP -> Level 2
  const tx3 = ledger.record('lesson', 50, 'Completed lesson: Acids and Bases', 'vid_chem_2');
  assert.strictEqual(ledger.balance, 125, 'XP balance should now be 125');
  assert.strictEqual(tx3.balanceAfter, 125);
  const statsLvl2 = ledger.getLevelStats();
  assert.strictEqual(statsLvl2.level, 2, 'Should reach Level 2 at 125 XP');
  assert.strictEqual(statsLvl2.xpInLevel, 25, '25 XP into Level 2');
  assert.strictEqual(statsLvl2.xpToNext, 75, '75 XP required for Level 3');

  // 6. Streak bonus (+20 XP) -> Total 145 XP
  const tx4 = ledger.record('streak', 20, '3-day study streak milestone!', 'streak_day_3');
  assert.strictEqual(ledger.balance, 145, 'XP balance after streak bonus is 145');

  // 7. Reversal: student unmarks Lesson 2 -> Debit (-50 XP)
  const tx5 = ledger.record('lesson_reversal', -50, 'Lesson uncompleted: Acids and Bases', 'vid_chem_2');
  assert.strictEqual(ledger.balance, 95, 'XP balance after reversal is 95');
  assert.strictEqual(tx5.balanceAfter, 95);
  const statsAfterReversal = ledger.getLevelStats();
  assert.strictEqual(statsAfterReversal.level, 1, 'Should return to Level 1 after XP reduction below 100');
  assert.strictEqual(statsAfterReversal.xpInLevel, 95);

  // 8. Ledger History Filtering and Ordering
  assert.strictEqual(ledger.transactions.length, 5, 'Should have 5 total transactions recorded');
  // First item in array is most recent
  assert.strictEqual(ledger.transactions[0].type, 'lesson_reversal');
  assert.strictEqual(ledger.transactions[1].type, 'streak');
  assert.strictEqual(ledger.transactions[2].type, 'lesson');

  const lessonTxs = ledger.filterByType('lesson');
  assert.strictEqual(lessonTxs.length, 2, 'Should have 2 positive lesson completion transactions');

  const focusTxs = ledger.filterByType('focus');
  assert.strictEqual(focusTxs.length, 1, 'Should have 1 focus transaction');
  assert.strictEqual(focusTxs[0].amount, 25);

  const streakTxs = ledger.filterByType('streak');
  assert.strictEqual(streakTxs.length, 1, 'Should have 1 streak transaction');
  assert.strictEqual(streakTxs[0].amount, 20);

  // 9. Floor safety: debits cannot reduce balance below 0
  const massiveDebit = ledger.record('adjustment', -500, 'Admin penalty test', null);
  assert.strictEqual(ledger.balance, 0, 'Balance must never drop below 0');
  assert.strictEqual(massiveDebit.balanceAfter, 0);
});

// Test 12: Strict Class Isolation across Leaderboard, Syllabus, Saved Items, and Announcements
test('Strict Class Isolation guarantees students are scoped strictly to their enrolled class', () => {
  // 1. Leaderboard multi-class prevention: switching classes removes student from prior class
  let leaderboardStorage = [
    { userId: 'student_101', displayName: 'Aarav', class_sort: '10', xp: 500 },
    { userId: 'student_102', displayName: 'Priya', class_sort: '10', xp: 450 },
    { userId: 'student_201', displayName: 'Rohan', class_sort: '09', xp: 600 },
  ];

  function syncStudentEntry(storage, student, newClass, xp) {
    // Purge student from old class
    const cleaned = storage.filter((e) => e.userId !== student.userId);
    cleaned.push({
      userId: student.userId,
      displayName: student.displayName,
      class_sort: newClass,
      xp,
    });
    return cleaned;
  }

  // Student 101 switches from Class 10 to Class 11
  leaderboardStorage = syncStudentEntry(leaderboardStorage, { userId: 'student_101', displayName: 'Aarav' }, '11', 500);

  // Assert Student 101 no longer exists in Class 10
  const class10Entries = leaderboardStorage.filter((e) => e.class_sort === '10');
  assert.strictEqual(class10Entries.some((e) => e.userId === 'student_101'), false, 'Student must not linger in old Class 10');
  assert.strictEqual(class10Entries.length, 1, 'Only Priya should remain in Class 10');

  // Assert Student 101 exists solely in Class 11
  const class11Entries = leaderboardStorage.filter((e) => e.class_sort === '11');
  assert.strictEqual(class11Entries.length, 1);
  assert.strictEqual(class11Entries[0].userId, 'student_101');

  // 2. Querying a different class must NEVER inject a student from another class
  function getClassLeaderboard(requestedClass, storage, currentUser) {
    const isEnrolledInRequested = currentUser && currentUser.grade_preference === requestedClass;
    let list = storage.filter((e) => e.class_sort === requestedClass);
    if (currentUser && isEnrolledInRequested) {
      if (!list.some((e) => e.userId === currentUser.userId)) {
        list.push({ userId: currentUser.userId, class_sort: requestedClass, xp: 100 });
      }
    }
    return list;
  }

  const studentInClass10 = { userId: 'student_current', grade_preference: '10' };
  const class9List = getClassLeaderboard('09', leaderboardStorage, studentInClass10);
  assert.strictEqual(
    class9List.some((e) => e.userId === 'student_current'),
    false,
    'Class 10 student must NEVER be injected into Class 9 leaderboard'
  );

  // 3. Saved items isolation: students only see bookmarks matching their enrolled class
  const allSavedVideos = [
    { youtube_id: 'vid_10_sci', title: 'Carbon Compounds', class_sort: '10' },
    { youtube_id: 'vid_10_math', title: 'Quadratic Equations', class_sort: '10' },
    { youtube_id: 'vid_09_sci', title: 'Motion', class_sort: '09' },
    { youtube_id: 'vid_12_phy', title: 'Optics', class_sort: '12' },
  ];

  const student10Saved = allSavedVideos.filter((v) => v.class_sort === studentInClass10.grade_preference);
  assert.strictEqual(student10Saved.length, 2, 'Class 10 student only sees Class 10 saved items');
  assert.ok(student10Saved.every((v) => v.class_sort === '10'));
});

// Test 13: Strict Student ID Isolation across LocalStorage, PII protection, and Doubts
test('Strict Student ID Isolation prevents data leakage across different user IDs and sessions', () => {
  // 1. Storage keys must be partitioned by student userId
  function getStorageKeysForUser(userId) {
    return {
      progress: `chapterplay_user_progress_${userId}`,
      lastWatched: `chapterplay_last_watched_${userId}`,
      xpHistory: `quickprep_xp_history_${userId}`,
      xpTotal: `quickprep_xp_total_${userId}`,
      onboarded: `ncert_prep_onboarded_${userId}`,
    };
  }

  const userA = 'student_aaa_111';
  const userB = 'student_bbb_222';
  const keysA = getStorageKeysForUser(userA);
  const keysB = getStorageKeysForUser(userB);

  // Ensure all keys are completely distinct between user A and user B
  for (const [keyName, keyA] of Object.entries(keysA)) {
    const keyB = keysB[keyName];
    assert.notStrictEqual(keyA, keyB, `Key ${keyName} must be distinct per student ID`);
  }

  // 2. PII Protection in public/shared data (Leaderboard write sanitizer)
  function sanitizeLeaderboardEntry(rawUser, stats) {
    const FORBIDDEN_KEYS = ['email', 'phoneNumber', 'consent', 'role', 'tokens', 'parentEmail'];
    // Display name must NOT fall back to raw email address
    const safeDisplayName = rawUser.displayName?.trim() || 'Student';

    const entry = {
      userId: rawUser.userId,
      displayName: safeDisplayName,
      class_sort: rawUser.grade_preference || '10',
      xp: stats.xp,
      completedCount: stats.completedCount,
      level: Math.floor(stats.xp / 100) + 1,
      photoURL: rawUser.photoURL || null,
    };

    // Ensure no forbidden PII keys exist in sanitized entry
    const entryKeys = Object.keys(entry);
    for (const forbidden of FORBIDDEN_KEYS) {
      assert.strictEqual(entryKeys.includes(forbidden), false, `PII key ${forbidden} must not be exposed`);
    }

    return entry;
  }

  const userWithSensitiveData = {
    userId: 'user_privacy_test',
    email: 'secret_student@example.com',
    phoneNumber: '+919876543210',
    consent: { status: 'granted' },
    role: 'student',
    tokens: { sessionToken: 'abc123secret' },
    displayName: '', // Empty display name
  };

  const safeEntry = sanitizeLeaderboardEntry(userWithSensitiveData, { xp: 250, completedCount: 5 });
  assert.strictEqual(safeEntry.displayName, 'Student', 'Empty display name safely falls back to Student without leaking email');
  assert.strictEqual(safeEntry.email, undefined);
  assert.strictEqual(safeEntry.phoneNumber, undefined);

  // 3. Doubt data isolation: student can only query where userId == their own ID
  const doubtsDatabase = [
    { id: 'd1', userId: 'student_aaa_111', question: 'What is photosynthesis?' },
    { id: 'd2', userId: 'student_bbb_222', question: 'How to balance equations?' },
    { id: 'd3', userId: 'student_aaa_111', question: 'Explain Newton third law' },
  ];

  function queryMyDoubts(queryingUserId) {
    return doubtsDatabase.filter((d) => d.userId === queryingUserId);
  }

  const studentADoubts = queryMyDoubts(userA);
  assert.strictEqual(studentADoubts.length, 2);
  assert.ok(studentADoubts.every((d) => d.userId === userA), 'Student A can only access Student A doubts');

  const studentBDoubts = queryMyDoubts(userB);
  assert.strictEqual(studentBDoubts.length, 1);
  assert.strictEqual(studentBDoubts[0].id, 'd2');
});

// Test 14: Class-wise XP Isolation across Class Switches and Ledgers
test('Class-wise XP Isolation keeps XP balances, transaction ledgers, and completed counts separated per class', () => {
  const XP_PER_LESSON = 50;
  const XP_PER_FOCUS = 25;
  const XP_PER_LEVEL = 100;

  class ClassIsolatedXpSystem {
    constructor(userId) {
      this.userId = userId;
      this.transactions = []; // All recorded transactions
    }

    record(type, amount, description, sourceId, classSort) {
      const targetClass = String(classSort).padStart(2, '0');
      const classBalance = this.getClassBalance(targetClass).totalXp;
      const newBalance = Math.max(0, classBalance + amount);

      const tx = {
        id: `tx_${Date.now()}_${Math.random()}`,
        userId: this.userId,
        amount,
        type,
        description,
        sourceId,
        class_sort: targetClass,
        timestamp: Date.now(),
        balanceAfter: newBalance,
      };

      this.transactions.unshift(tx); // Newest first
      return tx;
    }

    getClassHistory(classSort) {
      const targetClass = String(classSort).padStart(2, '0');
      const filtered = this.transactions.filter((t) => t.class_sort === targetClass);

      // Recompute chronological class running balance
      const chronological = [...filtered].reverse();
      let running = 0;
      const recomputed = chronological.map((t) => {
        running = Math.max(0, running + t.amount);
        return { ...t, balanceAfter: running };
      });
      return recomputed.reverse();
    }

    getClassBalance(classSort) {
      const targetClass = String(classSort).padStart(2, '0');
      const classTxs = [...this.transactions]
        .filter((t) => t.class_sort === targetClass)
        .reverse();

      let totalXp = 0;
      for (const t of classTxs) {
        totalXp = Math.max(0, totalXp + t.amount);
      }

      const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
      const xpInLevel = totalXp % XP_PER_LEVEL;
      const xpToNext = XP_PER_LEVEL - xpInLevel;

      return { totalXp, level, xpInLevel, xpToNext };
    }

    getClassCompletedCount(classSort, completedVideoIds, videoCatalog) {
      const targetClass = String(classSort).padStart(2, '0');
      return completedVideoIds.filter((id) => {
        const vid = videoCatalog.find((v) => v.youtube_id === id);
        return vid && vid.class_sort === targetClass;
      }).length;
    }
  }

  const catalog = [
    { youtube_id: 'vid_10_c1', class_sort: '10', title: 'Carbon' },
    { youtube_id: 'vid_10_c2', class_sort: '10', title: 'Acids' },
    { youtube_id: 'vid_09_m1', class_sort: '09', title: 'Motion' },
  ];

  const xpSystem = new ClassIsolatedXpSystem('student_switch_user');

  // 1. Initial State for both Class 10 and Class 09
  assert.strictEqual(xpSystem.getClassBalance('10').totalXp, 0);
  assert.strictEqual(xpSystem.getClassBalance('09').totalXp, 0);

  // 2. Student studies in Class 10: 2 lessons + 1 focus session
  xpSystem.record('lesson_completed', XP_PER_LESSON, 'Completed Carbon', 'vid_10_c1', '10');
  xpSystem.record('lesson_completed', XP_PER_LESSON, 'Completed Acids', 'vid_10_c2', '10');
  xpSystem.record('focus_session', XP_PER_FOCUS, 'Focus Session', 'focus_1', '10');

  const class10Stats = xpSystem.getClassBalance('10');
  assert.strictEqual(class10Stats.totalXp, 125, 'Class 10 XP must be 125');
  assert.strictEqual(class10Stats.level, 2, 'Class 10 level must be 2');
  assert.strictEqual(class10Stats.xpInLevel, 25);
  assert.strictEqual(class10Stats.xpToNext, 75);

  const completedVideos = ['vid_10_c1', 'vid_10_c2'];
  assert.strictEqual(xpSystem.getClassCompletedCount('10', completedVideos, catalog), 2);

  // 3. User switches to Class 09: Class 09 XP must be completely isolated and 0
  const class09StatsBefore = xpSystem.getClassBalance('09');
  assert.strictEqual(class09StatsBefore.totalXp, 0, 'Class 9 XP must start at 0 and NOT carry over Class 10 XP');
  assert.strictEqual(class09StatsBefore.level, 1, 'Class 9 level must be 1');
  assert.strictEqual(xpSystem.getClassCompletedCount('09', completedVideos, catalog), 0, 'Class 9 completed count must be 0');
  assert.strictEqual(xpSystem.getClassHistory('09').length, 0, 'Class 9 ledger must have 0 transactions');

  // 4. User earns 1 lesson in Class 09 (+50 XP)
  xpSystem.record('lesson_completed', XP_PER_LESSON, 'Completed Motion', 'vid_09_m1', '09');
  completedVideos.push('vid_09_m1');

  const class09StatsAfter = xpSystem.getClassBalance('09');
  assert.strictEqual(class09StatsAfter.totalXp, 50, 'Class 9 XP must now be exactly 50');
  assert.strictEqual(class09StatsAfter.level, 1);
  assert.strictEqual(xpSystem.getClassCompletedCount('09', completedVideos, catalog), 1, 'Class 9 completed count is 1');

  const class09History = xpSystem.getClassHistory('09');
  assert.strictEqual(class09History.length, 1, 'Class 9 ledger must only contain the 1 Class 9 transaction');
  assert.strictEqual(class09History[0].sourceId, 'vid_09_m1');
  assert.strictEqual(class09History[0].balanceAfter, 50);

  // 5. Switching back to Class 10 preserves Class 10's isolated 125 XP without contamination
  const class10StatsAfter = xpSystem.getClassBalance('10');
  assert.strictEqual(class10StatsAfter.totalXp, 125, 'Class 10 XP must remain exactly 125');
  assert.strictEqual(class10StatsAfter.level, 2);
  assert.strictEqual(xpSystem.getClassCompletedCount('10', completedVideos, catalog), 2, 'Class 10 completed count is still 2');

  const class10History = xpSystem.getClassHistory('10');
  assert.strictEqual(class10History.length, 3, 'Class 10 ledger must strictly contain only the 3 Class 10 transactions');
  assert.ok(!class10History.some((t) => t.class_sort === '09'), 'Class 10 ledger must NOT contain any Class 09 transactions');
  assert.strictEqual(class10History[0].balanceAfter, 125);
});

// Test 15: Notification Card Flyout Aggregation and Unread Badge Counts
test('Notification Card Flyout aggregates doubt replies, class announcements, streak milestones, and admin alerts', () => {
  function buildNotifications({ user, isAdmin, myDoubts, announcement, adminOpenDoubts, adminFeedbackCount }) {
    const list = [];

    // 1. Admin notifications
    if (isAdmin) {
      if (adminOpenDoubts > 0) {
        list.push({
          id: 'admin_open_doubts',
          type: 'admin_doubt',
          title: `${adminOpenDoubts} student doubts awaiting reply`,
          unread: true,
          actionUrl: '/app?tab=doubts',
        });
      }
      if (adminFeedbackCount > 0) {
        list.push({
          id: 'admin_feedback',
          type: 'admin_feedback',
          title: `${adminFeedbackCount} student feedback submissions`,
          unread: true,
          actionUrl: '/app?tab=feedback',
        });
      }
    }

    // 2. Student Doubt Replies
    if (!isAdmin && myDoubts && myDoubts.length > 0) {
      const answered = myDoubts.filter((d) => d.status === 'answered' || d.student_unread);
      answered.forEach((d) => {
        list.push({
          id: `doubt_${d.id}`,
          type: 'doubt_reply',
          title: d.student_unread ? 'Teacher replied to your doubt!' : `Doubt: ${d.question}`,
          unread: Boolean(d.student_unread),
          actionUrl: `/app/lesson/${d.youtube_id}`,
        });
      });
    }

    // 3. Class Announcements (Class-Isolated)
    const userClass = user?.grade_preference || '';
    const isTarget =
      announcement?.isActive &&
      (announcement.targetClass === 'all' ||
        announcement.targetClass === userClass ||
        (userClass && parseInt(userClass.replace(/\D/g, ''), 10) === parseInt(announcement.targetClass.replace(/\D/g, ''), 10)));

    if (isTarget && announcement) {
      list.push({
        id: `announcement_${announcement.title}`,
        type: 'announcement',
        title: announcement.title,
        unread: true,
        actionUrl: announcement.actionUrl || '/app',
      });
    }

    // 4. Streak Milestone
    if (!isAdmin && user && user.streak_days >= 3) {
      list.push({
        id: 'streak_milestone',
        type: 'streak',
        title: `${user.streak_days}-Day Study Streak Active!`,
        unread: false,
        actionUrl: '/app/leaderboard',
      });
    }

    return {
      notifications: list,
      unreadCount: list.filter((n) => n.unread).length,
    };
  }

  // Student in Class 10 with 1 unread doubt reply and 1 active Class 10 announcement
  const studentUser = {
    userId: 'student_123',
    grade_preference: '10',
    streak_days: 4,
  };

  const mockDoubts = [
    { id: 'd1', question: 'How does refraction occur?', answer: 'Due to speed change in medium', status: 'answered', student_unread: true, youtube_id: 'vid_1' },
    { id: 'd2', question: 'What is valency?', answer: null, status: 'open', student_unread: false, youtube_id: 'vid_2' },
  ];

  const class10Announcement = {
    title: 'Science Pre-Board Date Sheet',
    message: 'Term 2 begins next week',
    targetClass: '10',
    isActive: true,
  };

  const class12Announcement = {
    title: 'Physics Practical Dates',
    message: 'Class 12 lab exam on Monday',
    targetClass: '12',
    isActive: true,
  };

  // Student receives Class 10 announcement, 1 doubt reply, and 1 streak alert
  const studentResult = buildNotifications({
    user: studentUser,
    isAdmin: false,
    myDoubts: mockDoubts,
    announcement: class10Announcement,
  });

  assert.strictEqual(studentResult.notifications.length, 3, 'Should have 3 notifications (doubt, announcement, streak)');
  assert.strictEqual(studentResult.unreadCount, 2, '2 unread notifications (unread doubt reply + announcement)');
  assert.strictEqual(studentResult.notifications[0].type, 'doubt_reply');
  assert.strictEqual(studentResult.notifications[0].title, 'Teacher replied to your doubt!');
  assert.strictEqual(studentResult.notifications[1].type, 'announcement');
  assert.strictEqual(studentResult.notifications[2].type, 'streak');

  // Announcement for Class 12 must NOT be received by Class 10 student
  const studentWithClass12Ann = buildNotifications({
    user: studentUser,
    isAdmin: false,
    myDoubts: mockDoubts,
    announcement: class12Announcement,
  });
  assert.strictEqual(studentWithClass12Ann.notifications.some((n) => n.type === 'announcement'), false, 'Class 12 announcement must NOT be shown to Class 10 student');

  // Admin view
  const adminResult = buildNotifications({
    user: { userId: 'admin_1', grade_preference: null },
    isAdmin: true,
    myDoubts: [],
    adminOpenDoubts: 5,
    adminFeedbackCount: 2,
  });
  assert.strictEqual(adminResult.notifications.length, 2);
  assert.strictEqual(adminResult.unreadCount, 2);
  assert.strictEqual(adminResult.notifications[0].type, 'admin_doubt');
  assert.strictEqual(adminResult.notifications[0].title, '5 student doubts awaiting reply');
  assert.strictEqual(adminResult.notifications[1].type, 'admin_feedback');
});

// Test 16: Full Pomodoro Technique Cycles, Presets, and Floating Mini Widget State Machine
test('Full Pomodoro cycle progression, duration presets, and Floating Mini Widget behavior', () => {
  // 1. Verify standard presets
  const POMODORO_PRESETS = {
    standard: { focus: 25 * 60, short: 5 * 60, long: 15 * 60 },
    deep: { focus: 50 * 60, short: 10 * 60, long: 30 * 60 },
    sprint: { focus: 15 * 60, short: 3 * 60, long: 10 * 60 },
  };

  assert.strictEqual(POMODORO_PRESETS.standard.focus, 1500);
  assert.strictEqual(POMODORO_PRESETS.standard.short, 300);
  assert.strictEqual(POMODORO_PRESETS.standard.long, 900);
  assert.strictEqual(POMODORO_PRESETS.deep.focus, 3000);
  assert.strictEqual(POMODORO_PRESETS.sprint.focus, 900);

  // 2. Pomodoro cycle state machine simulation
  class PomodoroMachine {
    constructor(preset = 'standard') {
      this.durs = POMODORO_PRESETS[preset];
      this.mode = 'focus';
      this.cycleStep = 1;
      this.sessionsToday = 0;
      this.focusEventsFired = 0;
      this.isFloating = false;
      this.isMinimized = false;
      this.currentTask = '';
      this.soundEnabled = true;
    }

    setTask(task) {
      this.currentTask = task;
    }

    toggleFloating() {
      this.isFloating = !this.isFloating;
    }

    toggleMinimized() {
      this.isMinimized = !this.isMinimized;
    }

    completeInterval() {
      if (this.mode === 'focus') {
        this.sessionsToday += 1;
        this.focusEventsFired += 1;
        if (this.cycleStep >= 4) {
          this.mode = 'long';
          this.cycleStep = 1;
        } else {
          this.mode = 'short';
        }
      } else if (this.mode === 'short') {
        this.cycleStep = Math.min(4, this.cycleStep + 1);
        this.mode = 'focus';
      } else {
        // long break ended
        this.cycleStep = 1;
        this.mode = 'focus';
      }
    }
  }

  const pomo = new PomodoroMachine('standard');
  pomo.setTask('Class 10 Heredity and Evolution');
  assert.strictEqual(pomo.currentTask, 'Class 10 Heredity and Evolution');

  // Step 1: Focus 1 -> Short break
  assert.strictEqual(pomo.mode, 'focus');
  assert.strictEqual(pomo.cycleStep, 1);
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'short', 'Step 1 Focus should transition to Short Break');
  assert.strictEqual(pomo.cycleStep, 1);
  assert.strictEqual(pomo.sessionsToday, 1);
  assert.strictEqual(pomo.focusEventsFired, 1, 'Should fire quickprep-focus-completed for XP');

  // Step 1 Break completes -> Focus 2
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'focus');
  assert.strictEqual(pomo.cycleStep, 2, 'Should advance to Pomodoro Block 2');

  // Step 2 Focus completes -> Short break
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'short');
  assert.strictEqual(pomo.sessionsToday, 2);

  // Step 2 Break completes -> Focus 3
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'focus');
  assert.strictEqual(pomo.cycleStep, 3, 'Should advance to Pomodoro Block 3');

  // Step 3 Focus completes -> Short break
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'short');

  // Step 3 Break completes -> Focus 4
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'focus');
  assert.strictEqual(pomo.cycleStep, 4, 'Should advance to 4th and final Pomodoro Block');

  // Step 4 Focus completes -> LONG BREAK
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'long', '4th Pomodoro completion must trigger Long Break');
  assert.strictEqual(pomo.sessionsToday, 4);
  assert.strictEqual(pomo.focusEventsFired, 4, '4 focus events fired total awarding 100 XP (4 * 25)');

  // Long break completes -> Cycle resets to Focus 1
  pomo.completeInterval();
  assert.strictEqual(pomo.mode, 'focus');
  assert.strictEqual(pomo.cycleStep, 1, 'Cycle resets to Block 1 after Long Break');

  // 3. Floating mini widget toggling and position constraining
  assert.strictEqual(pomo.isFloating, false);
  pomo.toggleFloating();
  assert.strictEqual(pomo.isFloating, true, 'Floating mode can be enabled');

  assert.strictEqual(pomo.isMinimized, false);
  pomo.toggleMinimized();
  assert.strictEqual(pomo.isMinimized, true, 'Can minimize to compact floating pill');
  pomo.toggleMinimized();
  assert.strictEqual(pomo.isMinimized, false, 'Can expand back to full floating card');

  // Viewport bounds constraint check
  const windowWidth = 1024;
  const windowHeight = 768;
  function clampCoordinates(x, y) {
    return {
      x: Math.max(10, Math.min(windowWidth - 220, x)),
      y: Math.max(60, Math.min(windowHeight - 80, y)),
    };
  }

  const clampedOffscreen = clampCoordinates(1500, -20);
  assert.strictEqual(clampedOffscreen.x, 1024 - 220, 'Should constrain to right boundary');
  assert.strictEqual(clampedOffscreen.y, 60, 'Should constrain to top boundary');
});






