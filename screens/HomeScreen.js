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
  const heroImage = parameters.hero_image || null;

  const upcomingSessions = useMemo(() => {
    return (bookedSessions || [])
      .filter((s) => s.session_date && new Date(s.session_date) >= new Date())
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
      .slice(0, 3);
  }, [bookedSessions]);

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
          <View>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.headerTitle}>{userName || 'Athlete'}</Text>
          </View>
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
              {bookedSessions.length > 0 && (
                <Text style={styles.quickActionSubtext}>{bookedSessions.length} active</Text>
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
          ) : bookedSessions.length > 0 ? (
            <FlatList
              data={bookedSessions}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.bookingsList}
            />
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