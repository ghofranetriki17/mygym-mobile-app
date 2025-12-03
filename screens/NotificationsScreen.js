import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupSessionAPI } from '../services/api';

const accent = '#FF5C39';

const NotificationsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await groupSessionAPI.getUserBookings();
      const bookings = response.data || response || [];
      const mapped = bookings
        .filter((b) => b.session_date)
        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
        .map((b) => ({
          id: b.id,
          title: b.title,
          date: b.session_date,
          branch: b.branch?.name || 'TBD',
          badge: timeBadge(b.session_date),
          raw: b,
        }));
      setItems(mapped);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date pending';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeBadge = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return null;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return 'Today';
    if (hours < 48) return 'Tomorrow';
    return null;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SessionDetail', { session: item.raw })}
    >
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="bell" size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{formatDate(item.date)}</Text>
        <Text style={styles.meta}>Branch: {item.branch}</Text>
      </View>
      {item.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off" size={40} color={accent} />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,92,57,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  badge: {
    backgroundColor: 'rgba(255,92,57,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    color: accent,
    fontWeight: '700',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070707',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 6,
  },
});

export default NotificationsScreen;
