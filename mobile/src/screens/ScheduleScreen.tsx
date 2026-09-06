import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Pressable,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  XCircle,
  X,
  ShieldAlert,
  List as ListIcon,
  CalendarDays,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { SessionCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { getSyncRepository } from '../sync/SyncRepository';
import type { Session, MemberProfile } from '../types';

export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const parts = today.toISOString().split('T');
    return parts[0] ?? '';
  });
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const repo = getSyncRepository();

  // Membership status check (active vs past_due/cancelled/expired)
  const isMembershipActive = profile?.membership
    ? profile.membership.status === 'active'
    : true;

  const loadSessions = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const [sessionsData, profileData] = await Promise.all([
        repo.getSessions({ forceRefresh }),
        repo.getProfile({ forceRefresh }).catch(() => null),
      ]);
      setSessions(sessionsData);
      if (profileData) {
        setProfile(profileData);
      }
    } catch {
      setError('Unable to load schedule from server. Displaying cached sessions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [repo]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [sessionsData, profileData] = await Promise.all([
            repo.getSessions({ forceRefresh: false }),
            repo.getProfile({ forceRefresh: false }).catch(() => null),
          ]);
          if (active) {
            setSessions(sessionsData);
            if (profileData) setProfile(profileData);
          }
        } catch {
          if (active) setError('Unable to load schedule from server. Displaying cached sessions.');
        } finally {
          if (active) setIsLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [repo])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSessions(true);
  };

  const handleCancelSession = async (session: Session) => {
    if (!session.can_cancel) return;

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your reservation for "${session.title}"?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              // Ignore
            }

            const res = await repo.cancelSession(session.id, 'User cancelled');
            if (res.success) {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === session.id
                    ? { ...s, status: 'cancelled_by_member', can_cancel: false }
                    : s
                )
              );
              setSelectedSession((prev) =>
                prev && prev.id === session.id
                  ? { ...prev, status: 'cancelled_by_member', can_cancel: false }
                  : prev
              );
            }
          },
        },
      ]
    );
  };

  // Generate 7 days for the current weekOffset (Monday to Sunday)
  const weekDays = useMemo(() => {
    const now = new Date();
    // Monday as start of week
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isoDate = `${yyyy}-${mm}-${dd}`;

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      // Check if there are sessions on this date
      const hasSessions = sessions.some((s) => {
        if (!s.starts_at) return false;
        return s.starts_at.startsWith(isoDate);
      });

      days.push({
        isoDate,
        dayName,
        dayNum,
        isToday,
        hasSessions,
        fullDate: d,
      });
    }
    return days;
  }, [weekOffset, sessions]);

  const getWeekRangeLabel = (offset: number) => {
    if (weekDays.length < 7 || !weekDays[0] || !weekDays[6]) return '';
    const start = weekDays[0].fullDate;
    const end = weekDays[6].fullDate;
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  };

  // Active selected date (ensuring fallback to week's start if out of bounds)
  const activeDateStr = useMemo(() => {
    if (weekDays.some((d) => d.isoDate === selectedDateStr)) {
      return selectedDateStr;
    }
    return weekDays[0]?.isoDate ?? selectedDateStr;
  }, [weekDays, selectedDateStr]);

  // Filtered sessions based on viewMode and activeDateStr
  const filteredSessions = useMemo(() => {
    if (viewMode === 'list') {
      // In list mode, show sessions within the selected week range
      if (weekDays.length < 7 || !weekDays[0] || !weekDays[6]) return sessions;
      const startIso = weekDays[0].isoDate;
      const endIso = weekDays[6].isoDate;

      return sessions.filter((s) => {
        if (!s.starts_at) return true;
        const sessionDate = s.starts_at.split('T')[0] ?? '';
        return sessionDate >= startIso && sessionDate <= endIso;
      });
    }

    // In calendar mode, filter by selected date
    return sessions.filter((s) => {
      if (!s.starts_at) return false;
      return s.starts_at.startsWith(activeDateStr);
    });
  }, [sessions, viewMode, activeDateStr, weekDays]);

  const selectedDayInfo = useMemo(() => {
    const found = weekDays.find((d) => d.isoDate === activeDateStr);
    if (!found) return null;
    return found.fullDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [weekDays, activeDateStr]);

  const handleNextDay = useCallback(() => {
    const currentIndex = weekDays.findIndex((d) => d.isoDate === activeDateStr);
    if (currentIndex >= 0 && currentIndex < weekDays.length - 1) {
      const next = weekDays[currentIndex + 1];
      if (next) setSelectedDateStr(next.isoDate);
    } else {
      setWeekOffset((w) => w + 1);
    }
  }, [weekDays, activeDateStr]);

  const handlePrevDay = useCallback(() => {
    const currentIndex = weekDays.findIndex((d) => d.isoDate === activeDateStr);
    if (currentIndex > 0) {
      const prev = weekDays[currentIndex - 1];
      if (prev) setSelectedDateStr(prev.isoDate);
    } else {
      setWeekOffset((w) => w - 1);
    }
  }, [weekDays, activeDateStr]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 40;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50) {
            handleNextDay();
          } else if (gestureState.dx > 50) {
            handlePrevDay();
          }
        },
      }),
    [handleNextDay, handlePrevDay]
  );

  const renderSessionItem = ({ item }: { item: Session }) => {
    const isCancelled = item.is_cancelled || item.status.includes('cancelled');
    const isCancelledByGym = item.status === 'cancelled_by_gym';
    const isCancelledByMember = item.status === 'cancelled_by_member';

    return (
      <TouchableOpacity
        style={[styles.sessionCard, isCancelled && styles.sessionCardCancelled]}
        onPress={() => setSelectedSession(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Session: ${item.title}, Tap for details`}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            <View style={styles.metaRow}>
              <Clock size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {item.starts_at
                  ? new Date(item.starts_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '09:00 AM'}
              </Text>
              <MapPin size={13} color={colors.textSecondary} style={{ marginLeft: 10 }} />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          </View>

          {/* Status Badge */}
          {isCancelledByGym && (
            <View style={styles.gymCancelledBadge}>
              <Text style={styles.gymCancelledText}>Cancelled by Gym</Text>
            </View>
          )}
          {isCancelledByMember && (
            <View style={styles.memberCancelledBadge}>
              <Text style={styles.memberCancelledText}>Cancelled</Text>
            </View>
          )}
          {!isCancelled && (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>Confirmed</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.trainerInfo}>
            <User size={13} color={colors.textMuted} />
            <Text style={styles.trainerName}>{item.trainer?.name || item.trainer_name || '—'}</Text>
          </View>

          {!isCancelled && item.can_cancel ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelSession(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Cancel session ${item.title}`}
            >
              <XCircle size={14} color={colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.cancelText}>Opt Out</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // Inactive Membership Locked State
  if (!isMembershipActive) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.subtitle}>Reserved sessions and group workouts</Text>
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconWrapper}>
            <ShieldAlert size={48} color={colors.text} />
          </View>
          <Text style={styles.lockedTitle}>Membership Inactive</Text>
          <Text style={styles.lockedDescription}>
            Your GymFlow membership is currently inactive or expired. Renew your plan to reserve trainer sessions and access group classes.
          </Text>
          <TouchableOpacity
            style={styles.renewButton}
            onPress={() => {
              Alert.alert('Renew Membership', 'Please visit member services or your account profile to renew.');
            }}
            accessibilityRole="button"
            accessibilityLabel="Renew Membership"
          >
            <Text style={styles.renewButtonText}>Renew Membership</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Title & View Mode Toggle */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {navigation.canGoBack() ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Weekly Schedule</Text>
              <Text style={styles.subtitle}>Reserved sessions & bookings</Text>
            </View>
          </View>

          {/* Calendar / List View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
              onPress={() => setViewMode('calendar')}
              accessibilityRole="button"
              accessibilityLabel="Calendar Day View"
            >
              <CalendarDays
                size={16}
                color={viewMode === 'calendar' ? colors.textInverse : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
              accessibilityLabel="Full Week List View"
            >
              <ListIcon
                size={16}
                color={viewMode === 'list' ? colors.textInverse : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Week Navigator */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => setWeekOffset((prev) => prev - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{getWeekRangeLabel(weekOffset)}</Text>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => setWeekOffset((prev) => prev + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* 7-Day Strip (in Calendar mode or as quick jump) */}
      <View style={styles.daysStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysStripContent}
        >
          {weekDays.map((day) => {
            const isSelected = viewMode === 'calendar' && activeDateStr === day.isoDate;
            return (
              <TouchableOpacity
                key={day.isoDate}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  day.isToday && !isSelected && styles.dayChipToday,
                ]}
                onPress={() => {
                  setSelectedDateStr(day.isoDate);
                  if (viewMode !== 'calendar') setViewMode('calendar');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${day.dayName} ${day.dayNum}`}
              >
                <Text
                  style={[
                    styles.dayChipName,
                    isSelected && styles.dayChipTextSelected,
                  ]}
                >
                  {day.dayName}
                </Text>
                <Text
                  style={[
                    styles.dayChipNum,
                    isSelected && styles.dayChipTextSelected,
                  ]}
                >
                  {day.dayNum}
                </Text>
                {day.hasSessions && (
                  <View
                    style={[
                      styles.sessionIndicatorDot,
                      isSelected && styles.sessionIndicatorDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error ? <ErrorCard message={error} onRetry={() => loadSessions(true)} /> : null}

      {/* Main Sessions List */}
      <View
        style={{ flex: 1 }}
        {...(viewMode === 'calendar' ? panResponder.panHandlers : {})}
      >
        {isLoading ? (
          <View style={styles.listPadding}>
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            contentContainerStyle={styles.listPadding}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              viewMode === 'calendar' && selectedDayInfo ? (
                <View style={styles.dayHeading}>
                  <Text style={styles.dayHeadingText}>{selectedDayInfo}</Text>
                  <Text style={styles.dayHeadingCount}>
                    {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={Calendar}
                title={viewMode === 'calendar' ? 'No Sessions on this Day' : 'No Sessions Scheduled'}
                description={
                  viewMode === 'calendar'
                    ? `You have no workout sessions or classes booked for ${selectedDayInfo || 'this date'}.`
                    : 'You have no upcoming workout sessions or classes for this entire week.'
                }
                actionLabel={viewMode === 'calendar' ? 'View All Week Sessions' : undefined}
                onAction={() => setViewMode('list')}
              />
            }
          />
        )}
      </View>

      {/* Session Detail Modal */}
      <Modal
        visible={Boolean(selectedSession)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSession(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedSession(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedSession && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedSession.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSession(null)}
                    style={styles.modalCloseButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close dialog"
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Time & Date */}
                  <View style={styles.modalRow}>
                    <Clock size={18} color={colors.primary} />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowLabel}>Date & Time</Text>
                      <Text style={styles.modalRowValue}>
                        {selectedSession.starts_at
                          ? new Date(selectedSession.starts_at).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Scheduled Day'}
                        {' • '}
                        {selectedSession.starts_at
                          ? new Date(selectedSession.starts_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '09:00 AM'}
                      </Text>
                    </View>
                  </View>

                  {/* Location & Room */}
                  <View style={styles.modalRow}>
                    <MapPin size={18} color={colors.primary} />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowLabel}>Location</Text>
                      <Text style={styles.modalRowValue}>{selectedSession.location}</Text>
                    </View>
                  </View>

                  {/* Trainer */}
                  <View style={styles.modalRow}>
                    <User size={18} color={colors.primary} />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowLabel}>Instructor</Text>
                      <Text style={styles.modalRowValue}>
                        {selectedSession.trainer?.name || selectedSession.trainer_name || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Booking / Attendance status */}
                  <View style={styles.modalRow}>
                    <Users size={18} color={colors.primary} />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowLabel}>Booking Status</Text>
                      <Text style={styles.modalRowValue}>
                        {selectedSession.status === 'cancelled_by_gym'
                          ? 'Cancelled by Gym'
                          : selectedSession.status === 'cancelled_by_member' || selectedSession.is_cancelled
                          ? 'Cancelled'
                          : selectedSession.checked_in
                          ? 'Checked In'
                          : 'Confirmed Reservation'}
                      </Text>
                    </View>
                  </View>

                  {/* Description / Preparation */}
                  <View style={styles.modalNotes}>
                    <Text style={styles.notesLabel}>Preparation & Equipment</Text>
                    <Text style={styles.notesText}>
                      Please arrive 5 minutes prior to session start. Bring clean athletic shoes, hydration, and a towel. Lockers and shower facilities are accessible in the member locker room.
                    </Text>
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={styles.modalFooter}>
                  {!selectedSession.is_cancelled && selectedSession.can_cancel && (
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => handleCancelSession(selectedSession)}
                      accessibilityRole="button"
                      accessibilityLabel="Opt out of session"
                    >
                      <Text style={styles.modalCancelText}>Opt Out of Session</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modalDoneBtn}
                    onPress={() => setSelectedSession(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss dialog"
                  >
                    <Text style={styles.modalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  weekArrow: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: '600',
  },
  daysStripContainer: {
    marginVertical: spacing.xs,
  },
  daysStripContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  dayChip: {
    width: 48,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipToday: {
    borderColor: colors.text,
  },
  dayChipName: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  dayChipNum: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBlack,
    color: colors.text,
    marginTop: 2,
  },
  dayChipTextSelected: {
    color: colors.textInverse,
  },
  sessionIndicatorDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  sessionIndicatorDotSelected: {
    backgroundColor: colors.textInverse,
  },
  dayHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  dayHeadingText: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  dayHeadingCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  listPadding: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 110, // accommodate bottom tab bar
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardCancelled: {
    opacity: 0.65,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  confirmedBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  confirmedText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  gymCancelledBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  gymCancelledText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  memberCancelledBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  memberCancelledText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerName: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  lockedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xl,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  renewButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  renewButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: 6,
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalRowText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  modalRowLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  modalRowValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: 2,
  },
  modalNotes: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalFooter: {
    gap: spacing.sm,
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalDoneText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
});

