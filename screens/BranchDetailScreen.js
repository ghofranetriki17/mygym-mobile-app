import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
  FlatList,
  Alert,
  Dimensions,
  Modal,
  Pressable
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { branchAPI, groupSessionAPI } from '../services/api';

const { width } = Dimensions.get('window');

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const BranchDetailScreen = ({ route, navigation }) => {
  const { branch } = route.params;
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [groupSessions, setGroupSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showSpecialSessions, setShowSpecialSessions] = useState(false);
  const [specialSessions, setSpecialSessions] = useState([]);
  const [sessionType, setSessionType] = useState('');

  useEffect(() => {
    fetchCoaches();
    fetchGroupSessions();
  }, []);

  const fetchCoaches = async () => {
    try {
      setLoadingCoaches(true);
      const data = await branchAPI.getCoaches(branch.id);
      const list =
        (Array.isArray(data?.data?.data) && data?.data?.data) ||
        (Array.isArray(data?.data) && data?.data) ||
        (Array.isArray(data) && data) ||
        [];
      setCoaches(list);
    } catch (err) {
      console.error('Failed to load coaches', err);
      setCoaches([]);
    } finally {
      setLoadingCoaches(false);
    }
  };

  const fetchGroupSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await groupSessionAPI.getByBranch(branch.id);
      setGroupSessions(data);
    } catch (error) {
      console.error('Failed to fetch group training sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const getWeekDates = (weekOffset = 0) => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Calculate Monday of the current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setDate(monday.getDate() + (weekOffset * 7));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const formatTime = (time) => {
    if (!time) return 'Fermé';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const isCoachAvailableToday = (availabilities, coachName = '') => {
    if (!availabilities || availabilities.length === 0) return false;
    
    const now = new Date();
    const today = now.getDay();
    const dayNames = {
      1: 'monday', 2: 'tuesday', 3: 'wednesday',
      4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
    };
    
    const todayName = dayNames[today];
    const todayAvailability = availabilities.find(avail => 
      avail.day_of_week.toLowerCase() === todayName
    );
    
    if (!todayAvailability) return false;
    
    let isAvailable = false;
    if (todayAvailability.hasOwnProperty('is_available')) {
      isAvailable = todayAvailability.is_available === 1 || todayAvailability.is_available === true;
    } else {
      isAvailable = !!(todayAvailability.start_time && todayAvailability.end_time);
    }
    
    if (!isAvailable) return false;
    
    try {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 100 + currentMinute;
      
      let startTimeStr = todayAvailability.start_time;
      let endTimeStr = todayAvailability.end_time;
      
      if (startTimeStr.split(':').length === 3) startTimeStr = startTimeStr.substring(0, 5);
      if (endTimeStr.split(':').length === 3) endTimeStr = endTimeStr.substring(0, 5);
      
      const startTime = parseInt(startTimeStr.replace(':', ''));
      const endTime = parseInt(endTimeStr.replace(':', ''));
      
      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      return true;
    }
  };

  const refreshCoaches = async () => {
    Alert.alert(
      "Actualiser les coaches",
      "Recharger les données des coaches?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Actualiser", onPress: fetchCoaches }
      ]
    );
  };

  const refreshSessions = async () => {
    Alert.alert(
      "Actualiser les sessions",
      "Recharger les sessions collectives?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Actualiser", onPress: fetchGroupSessions }
      ]
    );
  };

  const sortedAvailabilities = branch.availabilities?.sort(
    (a, b) => daysOfWeek.indexOf(a.day_of_week) - daysOfWeek.indexOf(b.day_of_week)
  );

  const availabilityMap = {};
  if (sortedAvailabilities) {
    sortedAvailabilities.forEach((avail) => {
      availabilityMap[avail.day_of_week] = avail;
    });
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const fallbackLatitude = 34.7745429;
  const fallbackLongitude = 10.7338536;
  const fallbackPlusCode = 'QPFM+RG9, Sfax';

  const latitude = branch.latitude || fallbackLatitude;
  const longitude = branch.longitude || fallbackLongitude;

  const openMapApp = () => {
    let url = '';
    if (branch.latitude && branch.longitude) {
      url = Platform.select({
        ios: `maps://maps.apple.com/?ll=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}`,
      });
    } else {
      const query = encodeURIComponent(fallbackPlusCode);
      url = Platform.select({
        ios: `maps://maps.apple.com/?q=${query}`,
        android: `geo:0,0?q=${query}`,
      });
    }
    Linking.openURL(url);
  };

  const renderCoach = ({ item: coach }) => {
    const isAvailable = isCoachAvailableToday(coach.availabilities, coach.name);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CoachDetail', { coach })}
        style={styles.coachCard}
        activeOpacity={0.8}
      >
        <View style={styles.coachImageContainer}>
          <Image 
            source={{ uri: coach.photo_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFu5rZflN6Arud7cwsrZ9Uu0cXXXGt7ZWOdw&s' }} 
            style={[
              styles.coachImage,
              !isAvailable && styles.coachImageUnavailable
            ]} 
            onError={() => console.log('Failed to load coach image for:', coach.name)}
          />
          {!isAvailable && <View style={styles.darkOverlay} />}
          
          <View style={[
            styles.availabilityDot, 
            { backgroundColor: isAvailable ? '#00FF88' : '#FF3B30' }
          ]} />
        </View>
        
        <Text style={[
          styles.coachName,
          !isAvailable && styles.coachNameUnavailable
        ]}>
          {coach.name ? coach.name.split(' ')[0] : 'Coach'}
        </Text>
        
        <Text style={[
          styles.availabilityStatus,
          { color: isAvailable ? '#00FF88' : '#FF3B30' }
        ]}>
          {isAvailable ? 'Disponible' : 'Occupé'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSession = ({ item: session }) => {
    const isWomenOnly = session.is_for_women && !session.is_for_kids && !session.is_free;
    const isKidsOnly = session.is_for_kids && !session.is_for_women && !session.is_free;
    const isFree = session.is_free && !session.is_for_women && !session.is_for_kids;

    return (
      <TouchableOpacity 
        style={[
          styles.sessionCard,
          isWomenOnly && styles.womenOnlyCard,
          isKidsOnly && styles.kidsOnlyCard,
          isFree && styles.freeOnlyCard
        ]}
        onPress={() => navigation.navigate('SessionDetail', { session })}
      >
        <Text style={styles.sessionTitle}>{session.title}</Text>
        <Text style={styles.sessionInfo}>
          {new Date(session.session_date).toLocaleString()} • {session.duration} min
        </Text>
        <Text style={styles.sessionInfo}>
          Coach : {session.coach?.name || 'N/A'} • {session.course?.name || 'Sans cours'}
        </Text>
        <View style={styles.badgeContainer}>
          {session.is_for_women && <Text style={[styles.sessionBadge, styles.womenBadge]}>👩 Femmes</Text>}
          {session.is_for_kids && <Text style={[styles.sessionBadge, styles.kidsBadge]}>🧒 Enfants</Text>}
          {session.is_free && <Text style={[styles.sessionBadge, styles.freeBadge]}>🎁 Gratuit</Text>}
          {!session.is_free && !session.is_for_women && !session.is_for_kids && (
            <Text style={[styles.sessionBadge, styles.paidBadge]}>💰 Payant</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderWeeklySchedule = () => {
    const weekDates = getWeekDates(currentWeekOffset);
    const today = new Date();
    
    // Count special sessions for the week
    const womenSessionsCount = groupSessions.filter(session => 
      session.is_for_women && 
      weekDates.some(date => 
        new Date(session.session_date).toDateString() === date.toDateString()
      )
    ).length;
    
    const kidsSessionsCount = groupSessions.filter(session => 
      session.is_for_kids && 
      weekDates.some(date => 
        new Date(session.session_date).toDateString() === date.toDateString()
      )
    ).length;
    
    const freeSessionsCount = groupSessions.filter(session => 
      session.is_free && 
      weekDates.some(date => 
        new Date(session.session_date).toDateString() === date.toDateString()
      )
    ).length;
    
    return (
      <View style={styles.weeklyScheduleContainer}>
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            onPress={() => setCurrentWeekOffset(prev => prev - 1)}
            style={styles.weekNavButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FF3B30" />
          </TouchableOpacity>
          
          <Text style={styles.weekTitle}>
            Semaine du {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </Text>
          
          <TouchableOpacity 
            onPress={() => setCurrentWeekOffset(prev => prev + 1)}
            style={styles.weekNavButton}
          >
            <Ionicons name="chevron-forward" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        {/* Special Sessions Summary Cards */}
        <View style={styles.specialSessionsRow}>
          {/* Women Sessions */}
          <TouchableOpacity 
            style={[styles.specialSummaryCard, styles.womenSummaryCard]}
            onPress={() => {
              const sessions = groupSessions.filter(s => 
                s.is_for_women && 
                weekDates.some(date => 
                  new Date(s.session_date).toDateString() === date.toDateString()
                )
              );
              setSpecialSessions(sessions);
              setSessionType('Femmes');
              setShowSpecialSessions(true);
            }}
          >
            <View style={styles.specialSummaryContent}>
              <Ionicons name="woman" size={30} color="#FF69B4" />
              <View style={styles.specialSummaryText}>
                <Text style={styles.specialSummaryTitle}>Femmes</Text>
                <Text style={styles.specialSummaryCount}>{womenSessionsCount} sessions</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Kids Sessions */}
          <TouchableOpacity 
            style={[styles.specialSummaryCard, styles.kidsSummaryCard]}
            onPress={() => {
              const sessions = groupSessions.filter(s => 
                s.is_for_kids && 
                weekDates.some(date => 
                  new Date(s.session_date).toDateString() === date.toDateString()
                )
              );
              setSpecialSessions(sessions);
              setSessionType('Enfants');
              setShowSpecialSessions(true);
            }}
          >
            <View style={styles.specialSummaryContent}>
              <Ionicons name="happy" size={30} color="#64D2FF" />
              <View style={styles.specialSummaryText}>
                <Text style={styles.specialSummaryTitle}>Enfants</Text>
                <Text style={styles.specialSummaryCount}>{kidsSessionsCount} sessions</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Free Sessions */}
          <TouchableOpacity 
            style={[styles.specialSummaryCard, styles.freeSummaryCard]}
            onPress={() => {
              const sessions = groupSessions.filter(s => 
                s.is_free && 
                weekDates.some(date => 
                  new Date(s.session_date).toDateString() === date.toDateString()
                )
              );
              setSpecialSessions(sessions);
              setSessionType('Gratuites');
              setShowSpecialSessions(true);
            }}
          >
            <View style={styles.specialSummaryContent}>
              <Ionicons name="gift" size={30} color="#00FF88" />
              <View style={styles.specialSummaryText}>
                <Text style={styles.specialSummaryTitle}>Gratuites</Text>
                <Text style={styles.specialSummaryCount}>{freeSessionsCount} sessions</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekDaysContainer}
        >
          {weekDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const daySessions = groupSessions
              .filter(session => session.session_date.startsWith(dateStr))
              .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
            
            const isToday = date.getDate() === today.getDate() && 
                           date.getMonth() === today.getMonth() && 
                           date.getFullYear() === today.getFullYear();
            
            return (
              <View key={index} style={[
                styles.dayColumn,
                isToday && styles.todayDayColumn
              ]}>
                <View style={[
                  styles.dayHeader,
                  isToday && styles.todayDayHeader
                ]}>
                  <Text style={[
                    styles.dayName,
                    isToday && styles.todayDayName
                  ]}>
                    {shortDays[date.getDay()]}
                  </Text>
                  <Text style={[
                    styles.dayNumber,
                    isToday && styles.todayDayNumber
                  ]}>
                    {date.getDate()}
                  </Text>
                </View>
                
                {daySessions.length > 0 ? (
                  <FlatList
                    data={daySessions}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[
                          styles.sessionChip,
                          item.is_for_women && styles.womenOnlyChip,
                          item.is_for_kids && styles.kidsOnlyChip,
                          item.is_free && styles.freeOnlyChip
                        ]}
                        onPress={() => navigation.navigate('SessionDetail', { session: item })}
                      >
                        <Text style={styles.sessionChipTitle}>{item.title}</Text>
                        <Text style={styles.sessionChipTime}>
                          {new Date(item.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.sessionChipCoach}>{item.coach?.name || 'Coach'}</Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyDay}>
                    <Ionicons name="fitness-outline" size={24} color="#666" />
                    <Text style={styles.emptyDayText}>Pas de session</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.currentWeekButton}
          onPress={() => setCurrentWeekOffset(0)}
        >
          <Text style={styles.currentWeekButtonText}>Cette semaine</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.heroSection}>
        <View style={styles.headerOverlay}>
          <Text style={styles.branchName}>{branch.name}</Text>
          <Text style={styles.branchSubtitle}>Salle de Sport Premium</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton} 
          onPress={() => navigation.navigate('MachineList', { branch })}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="barbell" size={24} color="#FF3B30" />
          </View>
          <Text style={styles.actionText}>Équipements</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={openMapApp}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="location" size={24} color="#FF3B30" />
          </View>
          <Text style={styles.actionText}>Localisation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('SessionBooking', { branch })}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="calendar" size={24} color="#FF3B30" />
          </View>
          <Text style={styles.actionText}>Réserver</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Schedule Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar" size={24} color="#FF3B30" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Planning du jour</Text>
          </View>
          <Text style={styles.todayDateText}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </Text>
        </View>

        <View style={styles.fitnessLine} />

        {loadingSessions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Chargement du planning...</Text>
          </View>
        ) : (() => {
          const todayDate = new Date().toISOString().split('T')[0];
          const todaySessions = groupSessions
            .filter(session => session.session_date.startsWith(todayDate))
            .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

          return todaySessions.length > 0 ? (
            <FlatList
              data={todaySessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.sessionsListContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Aucune session aujourd'hui</Text>
              <Text style={styles.emptySubtext}>Vérifie demain !</Text>
            </View>
          );
        })()}
      </View>

      {/* Weekly Schedule Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={24} color="#FF3B30" /> Planning de la semaine
          </Text>
          <TouchableOpacity onPress={refreshSessions} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        {loadingSessions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Chargement du planning...</Text>
          </View>
        ) : (
          renderWeeklySchedule()
        )}
      </View>

      {/* Coaches Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people" size={24} color="#FF3B30" /> Coaches Disponibles
          </Text>
          <TouchableOpacity onPress={refreshCoaches} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        {loadingCoaches ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Chargement des coaches...</Text>
          </View>
        ) : coaches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-remove" size={48} color="#666" />
            <Text style={styles.emptyText}>Aucun coach disponible</Text>
            <Text style={styles.emptySubtext}>Revenez plus tard</Text>
          </View>
        ) : (
          <FlatList
            data={coaches}
            renderItem={renderCoach}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.coachListContainer}
          />
        )}
      </View>

      {/* Hours Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="time" size={24} color="#FF3B30" /> Horaires d'ouverture
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : sortedAvailabilities?.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hoursScrollContainer}
          >
            {daysOfWeek.map((day) => {
              const dayData = availabilityMap[day];
              const isToday = day === today;
              const isClosed = dayData?.is_closed;
              
              return (
                <View key={day} style={[
                  styles.dayCardHorizontal, 
                  isToday && styles.todayCardHorizontal
                ]}>
                  <Text style={[
                    styles.dayLabelHorizontal, 
                    isToday && styles.todayLabelHorizontal
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                  <Text style={[
                    styles.timeLabelHorizontal, 
                    isClosed && styles.closedLabelHorizontal,
                    isToday && styles.todayTimeHorizontal
                  ]}>
                    {dayData ? (
                      isClosed ? 'FERMÉ' : `${formatTime(dayData.opening_hour)}\n${formatTime(dayData.closing_hour)}`
                    ) : 'N/A'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Horaires non disponibles</Text>
          </View>
        )}
      </View>

      {/* Location & Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="information-circle" size={24} color="#FF3B30" /> Contact us
        </Text>
        
        <View style={styles.contactGrid}>
          {branch.phone && (
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => Linking.openURL(`tel:${branch.phone}`)}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="call" size={28} color="#00FF88" />
              </View>
              <Text style={styles.contactTitle}>Téléphone</Text>
              <Text style={styles.contactNumber}>{branch.phone}</Text>
              <View style={styles.contactAction}>
                <Text style={styles.contactActionText}>Appeler</Text>
                <Ionicons name="call" size={16} color="#00FF88" />
              </View>
            </TouchableOpacity>
          )}
          
          {branch.email && (
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => Linking.openURL(`mailto:${branch.email}`)}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="mail" size={28} color="#FFD700" />
              </View>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactEmail}>{branch.email}</Text>
              <View style={styles.contactAction}>
                <Text style={styles.contactActionText}>Envoyer</Text>
                <Ionicons name="send" size={16} color="#FFD700" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map */}
      <View style={[styles.section, { marginBottom: 30 }]}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="map" size={24} color="#FF3B30" /> Localisation
        </Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: latitude,
              longitude: longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: latitude,
                longitude: longitude,
              }}
              title={branch.name}
              description="Salle de sport"
            />
          </MapView>
          <TouchableOpacity style={styles.mapOverlay} onPress={openMapApp}>
            <Text style={styles.mapOverlayText}>Ouvrir dans Maps</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Special Sessions Modal */}
      <Modal
        visible={showSpecialSessions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSpecialSessions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                sessionType === 'Femmes' && styles.womenModalTitle,
                sessionType === 'Enfants' && styles.kidsModalTitle,
                sessionType === 'Gratuites' && styles.freeModalTitle
              ]}>
                Sessions {sessionType}
              </Text>
              <Pressable onPress={() => setShowSpecialSessions(false)}>
                <Ionicons name="close" size={24} color="#FF3B30" />
              </Pressable>
            </View>
            
            <FlatList
              data={specialSessions}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[
                  styles.modalSessionCard,
                  item.is_for_women && styles.womenModalCard,
                  item.is_for_kids && styles.kidsModalCard,
                  item.is_free && styles.freeModalCard
                ]}>
                  <Text style={styles.modalSessionTitle}>{item.title}</Text>
                  <Text style={styles.modalSessionInfo}>
                    {new Date(item.session_date).toLocaleString()} • {item.duration} min
                  </Text>
                  <Text style={styles.modalSessionInfo}>Coach: {item.coach?.name || 'N/A'}</Text>
                  <View style={styles.modalBadgeContainer}>
                    {item.is_for_women && <Text style={[styles.modalBadge, styles.womenModalBadge]}>👩 Femmes</Text>}
                    {item.is_for_kids && <Text style={[styles.modalBadge, styles.kidsModalBadge]}>🧒 Enfants</Text>}
                    {item.is_free && <Text style={[styles.modalBadge, styles.freeModalBadge]}>🎁 Gratuit</Text>}
                    {!item.is_free && !item.is_for_women && !item.is_for_kids && (
                      <Text style={[styles.modalBadge, styles.paidModalBadge]}>💰 Payant</Text>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  {sessionType === 'Femmes' && <Ionicons name="woman-outline" size={48} color="#FF69B4" />}
                  {sessionType === 'Enfants' && <Ionicons name="happy-outline" size={48} color="#64D2FF" />}
                  {sessionType === 'Gratuites' && <Ionicons name="gift-outline" size={48} color="#00FF88" />}
                  <Text style={styles.modalEmptyText}>Aucune session {sessionType.toLowerCase()} cette semaine</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  heroSection: {
    height: 200,
    backgroundColor: '#FF3B30',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    alignItems: 'center',
    padding: 20,
  },
  branchName: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#FFFFFF', 
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  branchSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 25,
    justifyContent: 'space-around',
    backgroundColor: '#111111',
    marginTop: -20,
    marginHorizontal: 15,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: { 
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#CCCCCC',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtext: {
    color: '#888888',
    fontSize: 14,
    marginTop: 5,
  },
  coachListContainer: { 
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  coachCard: {
    alignItems: 'center',
    marginRight: 20,
    width: 120,
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  coachImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  coachImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#333333',
  },
  coachImageUnavailable: {
    opacity: 0.5,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 40,
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
  coachName: { 
    fontSize: 16, 
    color: '#FFFFFF', 
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  coachNameUnavailable: {
    color: '#888888',
  },
  availabilityStatus: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Sessions styles
  sessionsListContainer: {
    paddingBottom: 10,
  },
  sessionCard: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  womenOnlyCard: {
    backgroundColor: 'rgba(255, 105, 180, 0.3)',
    borderColor: '#FF69B4',
  },
  kidsOnlyCard: {
    backgroundColor: 'rgba(100, 210, 255, 0.3)',
    borderColor: '#64D2FF',
  },
  freeOnlyCard: {
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    borderColor: '#00FF88',
  },
  sessionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  sessionInfo: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  sessionBadge: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 5,
    overflow: 'hidden',
  },
  womenBadge: {
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    color: '#FF69B4',
  },
  kidsBadge: {
    backgroundColor: 'rgba(100, 210, 255, 0.2)',
    color: '#64D2FF',
  },
  freeBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    color: '#00FF88',
  },
  paidBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
  },
  // Hours styles
  hoursScrollContainer: {
    paddingHorizontal: 10,
  },
  dayCardHorizontal: {
    width: 110,
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
    minHeight: 80,
    justifyContent: 'center',
  },
  todayCardHorizontal: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dayLabelHorizontal: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  todayLabelHorizontal: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  timeLabelHorizontal: {
    fontSize: 11,
    color: '#CCCCCC',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  todayTimeHorizontal: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  closedLabelHorizontal: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  // Contact styles
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 160,
  },
  contactIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactSubtext: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 16,
  },
  contactNumber: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactEmail: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '500',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  contactActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 5,
  },
  // Map styles
  mapContainer: {
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    height: 200,
  },
  map: { 
    width: '100%', 
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 5,
  },
  todayDateText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  fitnessLine: {
    height: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 50,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  // Weekly Schedule Styles
  weeklyScheduleContainer: {
    marginBottom: 20,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  weekNavButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  weekTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  weekDaysContainer: {
    paddingBottom: 10,
  },
  dayColumn: {
    width: 180,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    marginRight: 15,
    paddingBottom: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  todayDayColumn: {
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dayHeader: {
    paddingVertical: 15,
    backgroundColor: '#222222',
    alignItems: 'center',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginBottom: 10,
  },
  todayDayHeader: {
    backgroundColor: '#FF3B30',
  },
  dayName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  todayDayName: {
    color: '#FFFFFF',
  },
  dayNumber: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 5,
  },
  todayDayNumber: {
    color: '#FFFFFF',
  },
  sessionChip: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  womenOnlyChip: {
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    borderColor: '#FF69B4',
  },
  kidsOnlyChip: {
    backgroundColor: 'rgba(100, 210, 255, 0.2)',
    borderColor: '#64D2FF',
  },
  freeOnlyChip: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  sessionChipTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  sessionChipTime: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  sessionChipCoach: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  emptyDay: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDayText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 10,
  },
  currentWeekButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  currentWeekButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  // Special Sessions Summary Cards
  specialSessionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  specialSummaryCard: {
    width: '32%',
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
  },
  womenSummaryCard: {
    backgroundColor: 'rgba(255, 105, 180, 0.15)',
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  kidsSummaryCard: {
    backgroundColor: 'rgba(100, 210, 255, 0.15)',
    borderColor: 'rgba(100, 210, 255, 0.3)',
  },
  freeSummaryCard: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  specialSummaryContent: {
    alignItems: 'center',
  },
  specialSummaryText: {
    marginTop: 5,
  },
  specialSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  specialSummaryCount: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  womenModalTitle: {
    color: '#FF69B4',
  },
  kidsModalTitle: {
    color: '#64D2FF',
  },
  freeModalTitle: {
    color: '#00FF88',
  },
  modalSessionCard: {
    backgroundColor: '#252525',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  womenModalCard: {
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    borderColor: '#FF69B4',
  },
  kidsModalCard: {
    backgroundColor: 'rgba(100, 210, 255, 0.2)',
    borderColor: '#64D2FF',
  },
  freeModalCard: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  modalSessionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalSessionInfo: {
    color: '#CCCCCC',
    marginTop: 5,
  },
  modalBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  modalBadge: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 5,
    overflow: 'hidden',
  },
  womenModalBadge: {
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    color: '#FF69B4',
  },
  kidsModalBadge: {
    backgroundColor: 'rgba(100, 210, 255, 0.2)',
    color: '#64D2FF',
  },
  freeModalBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    color: '#00FF88',
  },
  paidModalBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
  },
  modalEmptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  modalEmptyText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default BranchDetailScreen;
