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
} from 'react-native';
import { branchAPI, groupSessionAPI, parametersAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = 16;
const HERO_FALLBACK =
  'data:image/png;base64,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';

const HomeScreen = ({ navigation }) => {
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookedSessions, setBookedSessions] = useState([]);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [parameters, setParameters] = useState({});
  const [loadingParams, setLoadingParams] = useState(true);
  const [cityFilter, setCityFilter] = useState('all');

  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [])
  );

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

  const availabilitySnippet = (branch) => {
    if (!branch.availabilities || !branch.availabilities.length) return 'Hours not provided';
    return branch.availabilities
      .slice(0, 2)
      .map(
        (a) => `${a.day_of_week?.slice(0, 3) || ''} ${a.opening_hour || '--:--'}-${a.closing_hour || '--:--'}`
      )
      .join(' • ');
  };

  const renderBranchItem = ({ item }) => (
    <TouchableOpacity style={styles.branchCard} onPress={() => handleBranchPress(item)}>
      <View style={styles.branchCardHeader}>
        <View style={styles.branchIcon}>
          <MaterialIcons name="fitness-center" size={20} color="#FF5C39" />
        </View>
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>{item.city || 'Location'}</Text>
        </View>
      </View>
      
      <Text style={styles.branchName}>{item.name}</Text>
      
      <View style={styles.branchInfo}>
        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
          <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="phone" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="access-time" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>{availabilitySnippet(item)}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <MaterialIcons name="arrow-forward" size={16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        setShowBookingsModal(false);
        navigation.navigate('SessionDetail', { session: item });
      }}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingIconContainer}>
          <MaterialCommunityIcons name="calendar-check" size={22} color="#FF5C39" />
        </View>
        <View style={styles.bookingContent}>
          <Text style={styles.bookingTitle}>{item.title}</Text>
          <Text style={styles.bookingDate}>{formatDate(item.session_date)}</Text>
          <Text style={styles.bookingLocation}>
            {item.branch?.name || 'Unknown location'}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  const appName = parameters.app_name || 'GymPro';
  const welcomeMessage = parameters.welcome_message || 'Find your perfect workout spot';
  const siteDescription = parameters.site_description || 'Premium fitness experience';
  const openingHours = parameters.opening_hours || '06:00-22:00';
  const heroImage = parameters.hero_image || HERO_FALLBACK;

  const upcomingSessions = useMemo(() => {
    return (bookedSessions || [])
      .filter((s) => s.session_date && new Date(s.session_date) >= new Date())
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
      .slice(0, 3);
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
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';
  }, [userName]);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(branches.map((b) => (b.city || '').toLowerCase()).filter(Boolean)));
    return ['all', ...unique];
  }, [branches]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5C39" />
        <Text style={styles.loadingText}>Loading gyms...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={60} color="#FF5C39" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBranches}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5C39" colors={["#FF5C39"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerUser}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.headerTitle}>{userName || 'Athlete'}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroGradient} />
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{appName}</Text>
            <Text style={styles.heroSubtitle}>{siteDescription}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <MaterialIcons name="store" size={18} color="white" />
                <Text style={styles.heroStatText}>{branches.length} Gyms</Text>
              </View>
              <View style={styles.heroStat}>
                <MaterialIcons name="access-time" size={18} color="white" />
                <Text style={styles.heroStatText}>{openingHours}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickAction, styles.quickActionPrimary]}
            onPress={() => navigation.navigate('BranchMap')}
          >
            <MaterialIcons name="map" size={22} color="white" />
            <Text style={styles.quickActionText}>Explore Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickAction, styles.quickActionSecondary]}
            onPress={() => setShowBookingsModal(true)}
          >
            <MaterialCommunityIcons name="calendar-check" size={22} color="#FF5C39" />
            <View>
              <Text style={styles.quickActionTextSecondary}>My Bookings</Text>
              {bookingsGrouped.upcoming.length > 0 && (
                <Text style={styles.quickActionSubtext}>{bookingsGrouped.upcoming.length} active</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search gyms or cities..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* City Filter */}
          {cities.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityFilters}
            >
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
        </View>

   

        {/* Branches List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery || cityFilter !== 'all' ? 'Search Results' : 'Explore Gyms'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('BranchMap')}>
              <Text style={styles.seeAllLink}>View Map</Text>
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
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color="#374151" />
              <Text style={styles.emptyStateText}>No gyms found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
            </View>
          )}
        </View>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
              <TouchableOpacity onPress={() => setShowBookingsModal(true)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sessionsList}>
              {upcomingSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => navigation.navigate('SessionDetail', { session })}
                >
                  <View style={styles.sessionIcon}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color="#FF5C39" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionMeta}>{formatDate(session.session_date)}</Text>
                    <Text style={styles.sessionLocation}>{session.branch?.name || 'Unknown'}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Contact & Social */}
        {(parameters.contact_phone || parameters.contact_email) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <View style={styles.contactCard}>
              {parameters.contact_phone && (
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <MaterialIcons name="phone" size={20} color="#FF5C39" />
                  </View>
                  <Text style={styles.contactText}>{parameters.contact_phone}</Text>
                </View>
              )}
              {parameters.contact_email && (
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <MaterialIcons name="email" size={20} color="#FF5C39" />
                  </View>
                  <Text style={styles.contactText}>{parameters.contact_email}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {(parameters.facebook_url || parameters.instagram_url || parameters.twitter_url) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Follow Us</Text>
            <View style={styles.socialButtons}>
              {parameters.facebook_url && (
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialPress(parameters.facebook_url)}
                >
                  <FontAwesome name="facebook" size={24} color="#1877F2" />
                </TouchableOpacity>
              )}
              {parameters.instagram_url && (
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialPress(parameters.instagram_url)}
                >
                  <FontAwesome name="instagram" size={24} color="#E4405F" />
                </TouchableOpacity>
              )}
              {parameters.twitter_url && (
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialPress(parameters.twitter_url)}
                >
                  <FontAwesome name="twitter" size={24} color="#1DA1F2" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('UserProgress')}
        >
          <FontAwesome name="line-chart" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('WorkoutList')}
        >
          <FontAwesome name="heartbeat" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Programmes')}
        >
          <FontAwesome name="list-alt" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bookings Modal */}
      <Modal
        visible={showBookingsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowBookingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Bookings</Text>
            <TouchableOpacity onPress={() => setShowBookingsModal(false)}>
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {loadingBookings ? (
            <ActivityIndicator size="large" color="#FF5C39" style={styles.modalLoader} />
          ) : bookingsGrouped.upcoming.length > 0 || bookingsGrouped.past.length > 0 ? (
            <ScrollView contentContainerStyle={styles.bookingsList}>
              {bookingsGrouped.upcoming.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Upcoming</Text>
                  {bookingsGrouped.upcoming.map((item) => (
                    <View key={`up-${item.id || item.session_date}`}>
                      {renderBookingItem({ item })}
                    </View>
                  ))}
                </>
              )}
              {bookingsGrouped.past.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Past</Text>
                  {bookingsGrouped.past.map((item) => (
                    <View key={`past-${item.id || item.session_date}`}>
                      {renderBookingItem({ item })}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.modalEmptyState}>
              <MaterialCommunityIcons name="calendar-remove" size={64} color="#374151" />
              <Text style={styles.modalEmptyText}>No Bookings Yet</Text>
              <Text style={styles.modalEmptySubtext}>Start exploring and book your first session</Text>
              <TouchableOpacity
                style={styles.modalCta}
                onPress={() => {
                  setShowBookingsModal(false);
                  navigation.navigate('BranchMap');
                }}
              >
                <Text style={styles.modalCtaText}>Explore Gyms</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const PromoCard = ({ title, subtitle }) => (
  <View style={styles.promoCard}>
    <View style={styles.promoIcon}>
      <MaterialIcons name="local-offer" size={24} color="#FF5C39" />
    </View>
    <Text style={styles.promoTitle}>{title}</Text>
    {subtitle && <Text style={styles.promoSubtitle}>{subtitle}</Text>}
    <TouchableOpacity style={styles.promoButton}>
      <Text style={styles.promoButtonText}>Claim Now</Text>
      <MaterialIcons name="arrow-forward" size={16} color="white" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF5C39',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: { color: '#FF5C39', fontWeight: '900', fontSize: 16 },
  greetingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Banner
  heroBanner: {
    height: 180,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F1F',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#E5E7EB',
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  quickActionPrimary: {
    backgroundColor: '#FF5C39',
  },
  quickActionSecondary: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  quickActionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  quickActionTextSecondary: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  quickActionSubtext: {
    color: '#FF5C39',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Search
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
  },
  cityFilters: {
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
  },
  cityChipActive: {
    backgroundColor: '#FF5C39',
  },
  cityChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: 'white',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  seeAllLink: {
    color: '#FF5C39',
    fontSize: 15,
    fontWeight: '600',
  },

  // Promotions
  promotionsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  promoCard: {
    width: width * 0.75,
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  promoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,92,57,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5C39',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  promoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },

  // Branch Cards
  branchList: {
    paddingHorizontal: 20,
    gap: CARD_SPACING,
  },
  branchCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  branchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  branchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,92,57,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityBadge: {
    backgroundColor: 'rgba(255,92,57,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cityBadgeText: {
    color: '#FF5C39',
    fontSize: 12,
    fontWeight: '700',
  },
  branchName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  branchInfo: {
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 14,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5C39',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 6,
  },

  // Sessions
  sessionsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,92,57,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionMeta: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 2,
  },
  sessionLocation: {
    color: '#6B7280',
    fontSize: 12,
  },

  // Contact
  contactCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,92,57,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    color: '#D1D5DB',
    fontSize: 15,
    flex: 1,
  },

  // Social
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  // Floating Action Buttons
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF5C39',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  modalLoader: {
    marginTop: 60,
  },
  bookingsList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  bookingCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,92,57,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingContent: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  bookingLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 20,
  },
  modalEmptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalCta: {
    backgroundColor: '#FF5C39',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  modalCtaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HomeScreen;
