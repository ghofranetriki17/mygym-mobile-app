import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Linking,
  Animated,
} from 'react-native';
import { branchAPI, groupSessionAPI, parametersAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialIcons, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';

const HomeScreen = ({ navigation }) => {
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookedSessions, setBookedSessions] = useState([]);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [parameters, setParameters] = useState({});
  const [loadingParams, setLoadingParams] = useState(true);
  const [cityFilter, setCityFilter] = useState('all');
  const [scrollY] = useState(new Animated.Value(0));

  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [])
  );

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = branches.filter((b) => {
      const matchesQuery = [b.name, b.city, b.address].some((field) =>
        field?.toLowerCase().includes(q)
      );
      const matchesCity = cityFilter === 'all' || b.city?.toLowerCase() === cityFilter;
      return matchesQuery && matchesCity;
    });
    setFilteredBranches(filtered);
  }, [searchQuery, branches, cityFilter]);

  const loadAllData = async () => {
    await Promise.all([loadUserName(), loadParameters(), loadBranches(), loadBookedSessions()]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadUserName = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('userName');
      if (storedUserName) setUserName(storedUserName);
    } catch (e) {
      console.error('Error loading user name:', e);
    }
  };

  const loadParameters = async () => {
    try {
      setLoadingParams(true);
      const response = await parametersAPI.getPublic();
      const paramsObj = response.data || {};
      setParameters(paramsObj);
    } catch (e) {
      console.error('Error loading parameters:', e);
      setParameters({});
    } finally {
      setLoadingParams(false);
    }
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await branchAPI.getAll();
      setBranches(response.data);
      setFilteredBranches(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load branches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadBookedSessions = async () => {
    try {
      setLoadingBookings(true);
      const response = await groupSessionAPI.getUserBookings();
      setBookedSessions(response.data || response);
    } catch (e) {
      console.error('Error loading booked sessions:', e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const requestNotificationPermission = async () => false; // Notifications disabled until expo-notifications is installed

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            navigation.replace('Auth');
          } catch (e) {
            console.error('Logout failed:', e);
          }
        },
      },
    ]);
  };

  const handleBranchPress = (branch) => navigation.navigate('BranchDetail', { branch });

  const handleSocialPress = (url) => {
    if (url) Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const timeUntil = (dateString) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    const now = new Date();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Ended';
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) return `In ${days}d ${hours}h`;
    if (hours > 0) return `In ${hours}h ${mins}m`;
    return `In ${mins}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const appName = parameters.app_name || 'ATHLETIC';
  const welcomeMessage = parameters.welcome_message || 'Elevate Your Training';
  const siteDescription = parameters.site_description || 'Premium Performance Hub';
  const openingHours = parameters.opening_hours || '06:00-22:00';
  const heroImage = parameters.hero_image || HERO_FALLBACK;

  const upcomingSessions = useMemo(() => {
    return (bookedSessions || [])
      .filter((s) => s.session_date && new Date(s.session_date) >= new Date())
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
      .slice(0, 3);
  }, [bookedSessions]);

  const upcomingCount = useMemo(() => {
    const now = new Date();
    return (bookedSessions || []).filter(
      (s) => s.session_date && new Date(s.session_date) >= now
    ).length;
  }, [bookedSessions]);

  const bookingsGrouped = useMemo(() => {
    const now = new Date();
    const upcoming = (bookedSessions || [])
      .filter((s) => s.session_date && new Date(s.session_date) >= now)
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    const past = (bookedSessions || [])
      .filter((s) => s.session_date && new Date(s.session_date) < now)
      .sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    return { upcoming, past };
  }, [bookedSessions]);

  const initials = useMemo(() => {
    const parts = (userName || '').split(' ').filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
  }, [userName]);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(branches.map((b) => (b.city || '').toLowerCase()).filter(Boolean)));
    return ['all', ...unique];
  }, [branches]);

  const branchHours = (branch) => {
    const slots = Array.isArray(branch?.availabilities) ? branch.availabilities : [];
    if (!slots.length) return null;
    const first = slots[0];
    const day = first.day_of_week ? first.day_of_week.slice(0, 3).toUpperCase() : '';
    const open = first.opening_hour || '--:--';
    const close = first.closing_hour || '--:--';
    return `${day} ${open}-${close}`;
  };

  const renderBranchItem = ({ item }) => (
    <TouchableOpacity style={styles.branchCard} onPress={() => handleBranchPress(item)} activeOpacity={0.9}>
      <Image
        source={{
          uri:
            item.image_url ||
            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop',
        }}
        style={styles.branchImage}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.branchGradient} />
      <View style={styles.branchContent}>
        <View style={styles.branchHeader}>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="white" />
            <Text style={styles.distanceText}>{item.city || 'Location'}</Text>
          </View>
        </View>
        <Text style={styles.branchName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.branchDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#8E8E93" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.address || item.city || 'Address TBD'}
            </Text>
          </View>
          {branchHours(item) ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.detailText} numberOfLines={1}>
                {branchHours(item)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.branchFooter}>
          <TouchableOpacity style={styles.bookButton} onPress={() => handleBranchPress(item)}>
            <Text style={styles.bookButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBookingItem = ({ item }) => {
    const isUpcoming = item.session_date && new Date(item.session_date) >= new Date();
    const statusLabel = isUpcoming ? 'Upcoming' : 'Past';
    const statusColor = isUpcoming ? '#34C759' : '#9CA3AF';
    const countdown = isUpcoming ? timeUntil(item.session_date) : 'Ended';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          setShowBookingsModal(false);
          navigation.navigate('SessionDetail', { session: item });
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#121218', '#1F1F2A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bookingGradient}
        />
        <View style={styles.bookingHeaderRow}>
          <View style={styles.bookingLocationRow}>
            <Ionicons name="business-outline" size={12} color="#9CA3AF" />
            <Text style={styles.bookingLocationText}>{item.branch?.name || 'Unknown location'}</Text>
          </View>
          <View style={[styles.bookingStatusPill, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
            <Text style={[styles.bookingStatusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.bookingContent}>
          <View style={styles.bookingIcon}>
            <MaterialCommunityIcons name="dumbbell" size={22} color="#FF3B30" />
          </View>
          <View style={styles.bookingDetails}>
            <Text style={styles.bookingTitle}>{item.title}</Text>
            <Text style={styles.bookingTime}>{formatDate(item.session_date)}</Text>
            {countdown ? <Text style={styles.bookingCountdown}>{countdown}</Text> : null}
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="error-outline" size={60} color="#FF3B30" />
        <Text style={styles.loadingText}>{error}</Text>
        <TouchableOpacity style={styles.modalButton} onPress={loadAllData}>
          <Text style={styles.modalButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3B30" colors={["#FF3B30"]} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} blurRadius={2} />
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']} style={styles.heroGradient} />

          <View style={styles.heroContent}>
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')}>
                  <LinearGradient colors={['#FF3B30', '#FF9500']} style={styles.avatarGradient} />
                  <Text style={styles.avatarText}>{initials}</Text>
                </TouchableOpacity>
                <View>
                  <Text style={styles.welcomeText}>Welcome back,</Text>
                  <Text style={styles.userName}>{userName || 'Athlete'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => {
                  setShowUpcomingOnly(true);
                  setShowBookingsModal(true);
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="white" />
                {upcomingCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{upcomingCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{welcomeMessage}</Text>
              <Text style={styles.heroSubtitle}>{siteDescription}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="business-outline" size={20} color="#FF3B30" />
                <Text style={styles.statNumber}>{branches.length}</Text>
                <Text style={styles.statLabel}>Locations</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#FF3B30" />
                <Text style={styles.statNumber}>{openingHours}</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#FF3B30" />
                <Text style={styles.statNumber}>{bookingsGrouped.upcoming.length}</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Search & City Filter */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search gyms, locations..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {cities.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityFilters}>
              {cities.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCityFilter(c)}
                  style={[styles.cityChip, cityFilter === c && styles.cityChipActive]}
                >
                  <Text style={[styles.cityChipText, cityFilter === c && styles.cityChipTextActive]}>
                    {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('BranchMap')}>
              <LinearGradient colors={['#FF3B30', '#FF9500']} style={styles.quickActionGradient} />
              <Ionicons name="map-outline" size={24} color="white" />
              <Text style={styles.quickActionText}>Map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => setShowBookingsModal(true)}>
              <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.quickActionGradient} />
              <MaterialCommunityIcons name="calendar-check" size={24} color="#FF3B30" />
              <View style={styles.bookingsInfo}>
                <Text style={styles.quickActionText}>Bookings</Text>
                {upcomingCount > 0 && (
                  <Text style={styles.bookingsCount}>{upcomingCount} active</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('WorkoutList')}>
              <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.quickActionGradient} />
              <MaterialCommunityIcons name="run-fast" size={24} color="#FF3B30" />
              <Text style={styles.quickActionText}>Workouts</Text>
            </TouchableOpacity>
          </View>

          {/* Branch List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery || cityFilter !== 'all' ? 'Results' : 'Our Locations'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('BranchMap')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {filteredBranches.length > 0 ? (
              <FlatList
                horizontal
                data={filteredBranches}
                renderItem={renderBranchItem}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.branchList}
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="map-marker-off" size={64} color="#3A3A3C" />
                <Text style={styles.emptyStateTitle}>No locations found</Text>
                <Text style={styles.emptyStateSubtitle}>Try adjusting your search</Text>
              </View>
            )}
          </View>

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
                <TouchableOpacity onPress={() => setShowBookingsModal(true)}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sessionsList}>
                {upcomingSessions.map((session, index) => (
                  <TouchableOpacity
                    key={session.id || index}
                    style={styles.sessionItem}
                    onPress={() => navigation.navigate('SessionDetail', { session })}
                  >
                    <View style={styles.sessionIconContainer}>
                      <MaterialCommunityIcons name="dumbbell" size={20} color="#FF3B30" />
                    </View>
                    <View style={styles.sessionContent}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      <Text style={styles.sessionTime}>{formatDate(session.session_date)}</Text>
                    </View>
                    <View style={styles.sessionStatus}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Confirmed</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Social Links */}
          {(parameters.facebook_url || parameters.instagram_url) && (
            <View style={styles.socialSection}>
              <Text style={styles.sectionTitle}>Connect With Us</Text>
              <View style={styles.socialButtons}>
                {parameters.instagram_url && (
                  <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialPress(parameters.instagram_url)}>
                    <LinearGradient colors={['#833AB4', '#FD1D1D', '#FCAF45']} style={styles.socialButtonGradient} />
                    <FontAwesome name="instagram" size={20} color="white" />
                  </TouchableOpacity>
                )}
                {parameters.facebook_url && (
                  <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialPress(parameters.facebook_url)}>
                    <LinearGradient colors={['#1877F2', '#0A5EC2']} style={styles.socialButtonGradient} />
                    <FontAwesome name="facebook" size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Action Menu */}
      <View style={styles.fabMenu}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('UserProgress')}>
          <LinearGradient colors={['#FF3B30', '#FF9500']} style={styles.fabGradient} />
          <Feather name="bar-chart" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Programmes')}>
          <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.fabGradient} />
          <Feather name="list" size={24} color="#FF3B30" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={handleLogout}>
          <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.fabGradient} />
          <Feather name="log-out" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Bookings Modal */}
      <Modal
        visible={showBookingsModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          setShowBookingsModal(false);
          setShowUpcomingOnly(false);
        }}
      >
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#000000', '#1A1A1A']} style={styles.modalBackground} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>My Bookings</Text>
              <View style={styles.modalBadgeRow}>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeLabel}>Upcoming</Text>
                  <Text style={styles.modalBadgeValue}>{bookingsGrouped.upcoming.length}</Text>
                </View>
                <View style={[styles.modalBadge, { backgroundColor: '#111118', borderColor: '#1F1F2A' }]}>
                  <Text style={styles.modalBadgeLabel}>Past</Text>
                  <Text style={styles.modalBadgeValue}>{bookingsGrouped.past.length}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowBookingsModal(false);
                setShowUpcomingOnly(false);
              }}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {loadingBookings ? (
            <ActivityIndicator size="large" color="#FF3B30" style={styles.modalLoader} />
          ) : bookingsGrouped.upcoming.length > 0 || (!showUpcomingOnly && bookingsGrouped.past.length > 0) ? (
            <ScrollView style={styles.modalContent}>
              {bookingsGrouped.upcoming.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Upcoming</Text>
                  {bookingsGrouped.upcoming.map((item) => (
                    <View key={`up-${item.id || item.session_date}`}>{renderBookingItem({ item })}</View>
                  ))}
                </View>
              )}

              {!showUpcomingOnly && bookingsGrouped.past.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Past Sessions</Text>
                  {bookingsGrouped.past.map((item) => (
                    <View key={`past-${item.id || item.session_date}`}>{renderBookingItem({ item })}</View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.modalEmpty}>
              <MaterialCommunityIcons name="calendar-blank" size={80} color="#3A3A3C" />
              <Text style={styles.modalEmptyTitle}>No bookings yet</Text>
              <Text style={styles.modalEmptySubtitle}>Start your fitness journey today</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowBookingsModal(false);
                  navigation.navigate('BranchMap');
                }}
              >
                <Text style={styles.modalButtonText}>Explore Locations</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'System',
  },
  heroContainer: {
    height: height * 0.45,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'System',
  },
  welcomeText: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'System',
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'System',
  },
  heroTextContainer: {
    marginBottom: 30,
  },
  heroTitle: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'System',
    lineHeight: 40,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 16,
    fontFamily: 'System',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
    fontFamily: 'System',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'System',
  },
  contentContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,60,0.5)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'System',
  },
  clearButton: {
    padding: 4,
  },
  cityFilters: {
    gap: 10,
    paddingBottom: 12,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(58,58,60,0.3)',
  },
  cityChipActive: {
    backgroundColor: '#FF3B30',
  },
  cityChipText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  cityChipTextActive: {
    color: 'white',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'System',
  },
  bookingsInfo: {
    alignItems: 'center',
  },
  bookingsCount: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'System',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
  },
  seeAllText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  branchList: {
    gap: 16,
  },
  branchCard: {
    width: CARD_WIDTH,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111',
  },
  branchImage: {
    width: '100%',
    height: '100%',
  },
  branchGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  branchContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'System',
  },
  branchName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    fontFamily: 'System',
  },
  branchDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'System',
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    fontFamily: 'System',
  },
  emptyStateSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'System',
  },
  sessionsList: {
    gap: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,60,0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sessionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'System',
  },
  sessionTime: {
    color: '#8E8E93',
    fontSize: 13,
    fontFamily: 'System',
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  socialSection: {
    marginBottom: 40,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  fabGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
  },
  modalBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'System',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  modalBadge: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  modalBadgeLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBadgeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: 'System',
  },
  modalLoader: {
    marginTop: 100,
  },
  bookingCard: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F1F2A',
  },
  bookingGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bookingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 12,
  },
  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingDetails: {
    flex: 1,
  },
  bookingTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'System',
  },
  bookingTime: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 6,
    fontFamily: 'System',
  },
  bookingLocationText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'System',
  },
  bookingCountdown: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  bookingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  bookingStatusText: {
    fontWeight: '800',
    fontSize: 12,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    fontFamily: 'System',
  },
  modalEmptySubtitle: {
    color: '#8E8E93',
    fontSize: 16,
    marginBottom: 32,
    fontFamily: 'System',
  },
  modalButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
});

export default HomeScreen;
