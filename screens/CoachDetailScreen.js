import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DEFAULT_POSTER = 'https://via.placeholder.com/400x600/1A1A1A/FFFFFF?text=Video';
const DAY_LABEL_WIDTH = 62;
const HOUR_BLOCK_WIDTH = 64;

const CoachDetailScreen = ({ route }) => {
  const { coach } = route.params;
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const currentIndex = viewableItems[0].index ?? 0;
      setActiveVideoIndex(currentIndex);
    } else {
      setActiveVideoIndex(null);
    }
  }).current;

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map((p) => parseInt(p, 10));
    if (parts.length < 2 || Number.isNaN(parts[0])) return null;
    const hours = parts[0];
    const minutes = Number.isNaN(parts[1]) ? 0 : parts[1];
    return hours * 60 + minutes;
  };

  const getVideoSourceType = (url) => {
    if (!url) return 'unknown';
    if (url.startsWith('file://') || (!url.includes('http') && !url.includes('www'))) return 'local';
    if (url.includes('drive.google.com')) return 'googledrive';
    if (url.includes('dropbox.com')) return 'dropbox';
    if (url.includes('onedrive.live.com') || url.includes('sharepoint.com')) return 'onedrive';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.match(/\.(mp4|mov|avi|mkv|webm|m4v)(\?.*)?$/i)) return 'direct';
    return 'web';
  };

  const getVideoThumbnail = (url, sourceType) => {
    switch (sourceType) {
      case 'youtube': {
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const videoId = youtubeMatch ? youtubeMatch[1] : null;
        return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : DEFAULT_POSTER;
      }
      case 'instagram':
        return 'https://via.placeholder.com/400x600/E4405F/white?text=Instagram+Video';
      case 'tiktok':
        return 'https://via.placeholder.com/400x600/000000/white?text=TikTok+Video';
      case 'facebook':
        return 'https://via.placeholder.com/400x600/1877F2/white?text=Facebook+Video';
      case 'direct':
        return 'https://via.placeholder.com/400x600/2196F3/white?text=Video+Direct';
      case 'googledrive': {
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w400-h600`;
        return 'https://via.placeholder.com/400x600/4285F4/white?text=Google+Drive';
      }
      case 'dropbox':
        return 'https://via.placeholder.com/400x600/0061FF/white?text=Dropbox+Video';
      case 'onedrive':
        return 'https://via.placeholder.com/400x600/0078D4/white?text=OneDrive+Video';
      case 'local':
        return 'https://via.placeholder.com/400x600/4CAF50/white?text=Video+Locale';
      default:
        return DEFAULT_POSTER;
    }
  };

  const getPlatformIcon = (sourceType) => {
    switch (sourceType) {
      case 'youtube':
        return { name: 'logo-youtube', color: '#FF0000' };
      case 'googledrive':
        return { name: 'logo-google', color: '#4285F4' };
      case 'dropbox':
        return { name: 'cloud', color: '#0061FF' };
      case 'onedrive':
        return { name: 'cloud', color: '#0078D4' };
      case 'instagram':
        return { name: 'logo-instagram', color: '#E4405F' };
      case 'tiktok':
        return { name: 'musical-notes', color: '#000000' };
      case 'facebook':
        return { name: 'logo-facebook', color: '#1877F2' };
      case 'local':
        return { name: 'folder', color: '#4CAF50' };
      case 'direct':
        return { name: 'videocam', color: '#2196F3' };
      default:
        return { name: 'link', color: '#9E9E9E' };
    }
  };

  const handleExternalVideoPress = (videoUrl) => {
    Linking.openURL(videoUrl).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la video');
    });
  };

  const renderVideoItem = ({ item, index }) => {
    const sourceType = getVideoSourceType(item.video_url);
    const platformIcon = getPlatformIcon(sourceType);
    const thumbnailUrl = getVideoThumbnail(item.video_url, sourceType);
    const posterUrl = item.poster_url || item.thumbnail_url || thumbnailUrl || DEFAULT_POSTER;
    const isPlaying = activeVideoIndex === index;
    const isPlayableInline = sourceType === 'local' || sourceType === 'direct' ||
      sourceType === 'googledrive' || sourceType === 'dropbox' || sourceType === 'onedrive';

    if (isPlayableInline) {
      return (
        <View style={styles.reelCard}>
          <View style={styles.videoContainer}>
            {isPlaying ? (
              <Video
                source={{ uri: item.video_url }}
                style={styles.reelVideo}
                useNativeControls
                resizeMode="cover"
                isLooping
                shouldPlay
                posterSource={{ uri: posterUrl }}
                posterStyle={styles.reelVideo}
                usePoster
              />
            ) : (
              <ImageBackground
                source={{ uri: posterUrl }}
                style={styles.posterFrame}
                imageStyle={styles.posterImage}
              >
                <View style={styles.posterTint} />
              </ImageBackground>
            )}

            <TouchableOpacity
              style={styles.videoTapArea}
              onPress={() => {
                if (isPlaying) {
                  setActiveVideoIndex(null);
                } else {
                  setActiveVideoIndex(index);
                }
              }}
              activeOpacity={1}
            >
              <View style={[styles.playOverlay, isPlaying && styles.playOverlayActive]}>
                {!isPlaying && (
                  <>
                    <View style={[styles.playButton, { backgroundColor: platformIcon.color }]}>
                      <Ionicons name="play" size={40} color="#fff" />
                    </View>
                    <Text style={styles.tapToPlayText}>Appuyez pour lire</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.platformLabel}>
              <Ionicons name={platformIcon.name} size={16} color={platformIcon.color} />
              <Text style={styles.platformLabelText}>
                {sourceType === 'local' ? 'Local' :
                 sourceType === 'googledrive' ? 'Drive' :
                 sourceType === 'dropbox' ? 'Dropbox' :
                 sourceType === 'onedrive' ? 'OneDrive' : 'Video'}
              </Text>
            </View>
          </View>

          <View style={styles.videoInfo}>
            <Text style={styles.reelTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.reelDesc} numberOfLines={2}>{item.description}</Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.reelCard}>
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={() => handleExternalVideoPress(item.video_url)}
          activeOpacity={0.9}
        >
          <ImageBackground
            source={{ uri: posterUrl }}
            style={styles.posterFrame}
            imageStyle={styles.posterImage}
          >
            <View style={styles.posterTint} />
          </ImageBackground>

          <View style={styles.playOverlay}>
            <View style={[
              styles.playButton,
              { backgroundColor: platformIcon.color, shadowColor: platformIcon.color }
            ]}>
              <Ionicons name="play" size={40} color="#fff" />
            </View>
            <Text style={styles.tapToPlayText}>Ouvrir dans {
              sourceType === 'youtube' ? 'YouTube' :
              sourceType === 'tiktok' ? 'TikTok' :
              sourceType === 'instagram' ? 'Instagram' :
              sourceType === 'facebook' ? 'Facebook' : 'le navigateur'
            }</Text>
          </View>

          <View style={styles.platformLabel}>
            <Ionicons name={platformIcon.name} size={16} color={platformIcon.color} />
            <Text style={styles.platformLabelText}>
              {sourceType === 'youtube' ? 'YouTube' :
               sourceType === 'tiktok' ? 'TikTok' :
               sourceType === 'instagram' ? 'Instagram' :
               sourceType === 'facebook' ? 'Facebook' : 'Web'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.videoInfo}>
          <Text style={styles.reelTitle} numberOfLines={1}>{item.title}</Text>
          {item.description && (
            <Text style={styles.reelDesc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </View>
    );
  };

  const allVideos = coach.videos || [];

  const weekOrder = [
    { key: 'monday', label: 'Lun' },
    { key: 'tuesday', label: 'Mar' },
    { key: 'wednesday', label: 'Mer' },
    { key: 'thursday', label: 'Jeu' },
    { key: 'friday', label: 'Ven' },
    { key: 'saturday', label: 'Sam' },
    { key: 'sunday', label: 'Dim' },
  ];

  const normalizedSlots = (coach.availabilities || [])
    .map((a) => {
      const start = parseTimeToMinutes(a.start_time);
      const end = parseTimeToMinutes(a.end_time);
      if (start === null || end === null || Number.isNaN(start) || Number.isNaN(end)) return null;
      const key = (a.day_of_week || '').toLowerCase();
      return { ...a, start, end, day_key: key };
    })
    .filter(Boolean);

  const minStart = normalizedSlots.length ? Math.min(...normalizedSlots.map((s) => s.start)) : 8 * 60;
  const maxEnd = normalizedSlots.length ? Math.max(...normalizedSlots.map((s) => s.end)) : 18 * 60;
  const startHour = Math.min(6, Math.floor(minStart / 60));
  const endHour = Math.max(22, Math.ceil(maxEnd / 60));
  const totalHours = Math.max(endHour - startHour, 1);
  const timelineWidth = totalHours * HOUR_BLOCK_WIDTH;
  const hourMarks = Array.from({ length: totalHours + 1 }).map((_, idx) => {
    const hour = startHour + idx;
    return { hour, label: `${hour.toString().padStart(2, '0')}h` };
  });

  const schedule = weekOrder.map((day) => {
    const slots = normalizedSlots
      .filter((slot) => {
        const key = slot.day_key;
        return key.startsWith(day.key.slice(0, 3)) || key === day.key;
      })
      .sort((a, b) => a.start - b.start);
    return { ...day, slots };
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroSection}>
        <Image
          source={{ uri: coach.photo_url ? coach.photo_url : 'https://via.placeholder.com/150' }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{coach.name}</Text>
        <Text style={styles.speciality}>
          {coach.specialities?.map((s) => s.name).join(', ') || 'No speciality'}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="call" size={20} color="#FF3B30" />
          <Text style={styles.sectionTitle}> Contact</Text>
        </View>
        <View style={styles.contactGrid}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL(`mailto:${coach.email}`)}
          >
            <Ionicons name="mail" size={24} color="#FFD700" />
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{coach.email}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL(`tel:${coach.phone}`)}
          >
            <Ionicons name="call" size={24} color="#00FF88" />
            <Text style={styles.contactLabel}>Telephone</Text>
            <Text style={styles.contactValue}>{coach.phone}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {coach.bio && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#FF3B30" />
            <Text style={styles.sectionTitle}> Bio</Text>
          </View>
          <View style={styles.bioCard}>
            <Text style={styles.infoText}>{coach.bio}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="school" size={20} color="#FF3B30" />
          <Text style={styles.sectionTitle}> Certifications</Text>
        </View>
        <View style={styles.bioCard}>
          <Text style={styles.infoText}>{coach.certifications || 'No certifications listed.'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={20} color="#FF3B30" />
          <Text style={styles.sectionTitle}> Disponibilites</Text>
        </View>
        {coach.availabilities?.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.hourHeaderRow}>
                <View style={{ width: DAY_LABEL_WIDTH }} />
                <View style={[styles.hourTrack, { width: timelineWidth }]}>
                  {hourMarks.map((mark, idx) => (
                    <View key={mark.hour} style={[styles.hourMark, { left: idx * HOUR_BLOCK_WIDTH }]}>
                      <Text style={styles.hourLabel}>{mark.label}</Text>
                      <View style={styles.hourLine} />
                    </View>
                  ))}
                </View>
              </View>

              {schedule.map((day) => (
                <View key={day.key} style={styles.dayRow}>
                  <View style={[styles.dayLabelCell, { width: DAY_LABEL_WIDTH }]}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                  </View>
                  <View style={[styles.dayTimeline, { width: timelineWidth }]}>
                    {hourMarks.map((_, idx) => (
                      <View key={idx} style={[styles.guideline, { left: idx * HOUR_BLOCK_WIDTH }]} />
                    ))}
                    {day.slots.length > 0 ? (
                      day.slots.map((slot, idx) => {
                        const left = ((slot.start - startHour * 60) / 60) * HOUR_BLOCK_WIDTH;
                        const widthPx = ((slot.end - slot.start) / 60) * HOUR_BLOCK_WIDTH;
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.slotBlock,
                              { left, width: Math.max(widthPx, 36) },
                            ]}
                          >
                            <Text style={styles.slotText}>{slot.start_time} - {slot.end_time}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.offText}>Off</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.infoText}>No availability listed.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="videocam" size={20} color="#FF3B30" />
          <Text style={styles.sectionTitle}> Videos du coach</Text>
        </View>
        
        {allVideos.length > 0 ? (
          <FlatList
            data={allVideos}
            keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
            renderItem={renderVideoItem}
            horizontal
            pagingEnabled
            snapToInterval={width * 0.88}
            snapToAlignment="center"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reelListContent}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
          />
        ) : (
          <View style={styles.noVideosContainer}>
            <Ionicons name="videocam-off" size={48} color="#666" />
            <Text style={styles.noVideosText}>Aucune video disponible</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  heroSection: { alignItems: 'center', marginBottom: 25 },
  profileImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#333' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FF3B30', marginTop: 10 },
  speciality: { fontSize: 14, color: '#CCCCCC', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10,
  },
  sectionTitle: { marginLeft: 8, color: '#FF3B30', fontSize: 18, fontWeight: 'bold', flex: 1 },
  contactGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  contactCard: { 
    width: '48%', 
    backgroundColor: '#1E1E1E', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  contactLabel: { color: '#CCCCCC', fontSize: 14, marginTop: 5 },
  contactValue: { color: '#FFFFFF', fontSize: 12, marginTop: 2 },
  bioCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 10 },
  infoText: { color: '#CCCCCC', lineHeight: 20 },
  hourHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  hourTrack: {
    height: 26,
    position: 'relative',
  },
  hourMark: {
    position: 'absolute',
    alignItems: 'center',
  },
  hourLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  hourLine: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayLabelCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayLabel: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 13,
  },
  dayTimeline: {
    position: 'relative',
    height: 46,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  guideline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  slotBlock: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  slotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  offText: {
    color: '#777',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  
  reelCard: { 
    backgroundColor: '#1A1A1A', 
    borderRadius: 20, 
    marginBottom: 20,
    width: width * 0.85,
    marginRight: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: width * 1.3,
    backgroundColor: '#000',
  },
  reelVideo: { 
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  playOverlayActive: {
    backgroundColor: 'transparent',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tapToPlayText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  platformLabel: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  platformLabelText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 16,
  },
  reelTitle: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '700', 
    marginBottom: 6,
  },
  reelDesc: { 
    color: '#999', 
    fontSize: 14, 
    lineHeight: 18,
  },
  reelListContent: {
    paddingVertical: 10,
    paddingRight: 16,
  },
  noVideosContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
  },
  noVideosText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  posterFrame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f0f0f',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});

export default CoachDetailScreen;
