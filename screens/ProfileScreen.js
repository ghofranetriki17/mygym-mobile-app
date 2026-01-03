import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { authAPI } from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initials = useMemo(() => {
    const name = user?.name || '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2);
  }, [user]);

  const loadUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.getUser();
      const payload = response.data?.data || response.data || {};
      setUser(payload);
      if (payload.name) await AsyncStorage.setItem('userName', payload.name);
      if (payload.email) await AsyncStorage.setItem('userEmail', payload.email);
      if (payload.id) await AsyncStorage.setItem('userId', String(payload.id));
    } catch (e) {
      console.error('Profile fetch error:', e?.response?.data || e.message);
      setError('Impossible de charger le profil');
      const name = await AsyncStorage.getItem('userName');
      const email = await AsyncStorage.getItem('userEmail');
      const id = await AsyncStorage.getItem('userId');
      if (name || email || id) {
        setUser({ name: name || '', email: email || '', id: id || '' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error('Logout error:', e?.response?.data || e.message);
    } finally {
      navigation.replace('Auth');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.email}>{user?.email || 'Email non fourni'}</Text>
          {user?.id ? <Text style={styles.idText}>ID: {user.id}</Text> : null}
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadUser}>
          <Ionicons name="refresh" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Coordonnées</Text>
        <View style={styles.row}>
          <MaterialIcons name="email" size={20} color="#FF3B30" />
          <Text style={styles.rowText}>{user?.email || 'Email non fourni'}</Text>
        </View>
        {user?.phone ? (
          <View style={styles.row}>
            <MaterialIcons name="phone" size={20} color="#FF3B30" />
            <Text style={styles.rowText}>{user.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#FF3B30" />
          <Text style={styles.actionText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('WorkoutList')}>
          <Ionicons name="list" size={20} color="#FF3B30" />
          <Text style={styles.actionText}>Mes workouts</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  loadingText: { marginTop: 12, color: '#ccc' },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#121212', fontWeight: '900', fontSize: 20 },
  name: { color: 'white', fontSize: 20, fontWeight: '900' },
  email: { color: '#ccc', fontSize: 14, marginTop: 4 },
  idText: { color: '#888', fontSize: 12, marginTop: 4 },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: { color: '#FF3B30', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rowText: { color: '#E5E7EB', fontSize: 14, fontWeight: '700' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  actionText: { color: 'white', fontSize: 15, fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 8,
  },
  logoutText: { color: '#FF3B30', fontWeight: '900', fontSize: 16 },
  errorText: { color: '#ff6b6b', marginBottom: 12 },
});

export default ProfileScreen;
