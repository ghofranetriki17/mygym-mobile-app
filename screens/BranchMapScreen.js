import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { branchAPI } from '../services/api';

const accent = '#FF5C39';
const fallback = { latitude: 34.7745429, longitude: 10.7338536 };

const BranchMapScreen = ({ navigation }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await branchAPI.getAll();
      setBranches(response.data || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  const initialRegion = useMemo(() => {
    const first = branches[0];
    const lat = first?.latitude ? parseFloat(first.latitude) : fallback.latitude;
    const lng = first?.longitude ? parseFloat(first.longitude) : fallback.longitude;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [branches]);

  const renderBranch = ({ item }) => {
    const lat = item.latitude ? parseFloat(item.latitude) : fallback.latitude;
    const lng = item.longitude ? parseFloat(item.longitude) : fallback.longitude;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BranchDetail', { branch: item })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>{item.city || 'Location'} | {item.address || 'Address pending'}</Text>
          <Text style={styles.meta}>Phone: {item.phone || 'N/A'}</Text>
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('BranchDetail', { branch: item })}
        >
          <Text style={styles.mapBtnText}>Details</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading branches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {branches.map((branch) => {
          const lat = branch.latitude ? parseFloat(branch.latitude) : fallback.latitude;
          const lng = branch.longitude ? parseFloat(branch.longitude) : fallback.longitude;
          return (
            <Marker
              key={branch.id || branch.name}
              coordinate={{ latitude: lat, longitude: lng }}
              title={branch.name}
              description={branch.city || branch.address}
              onCalloutPress={() => navigation.navigate('BranchDetail', { branch })}
            />
          );
        })}
      </MapView>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Branches</Text>
        <Text style={styles.listSubtitle}>Tap a card to see details</Text>
      </View>

      <FlatList
        data={branches}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderBranch}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
  map: {
    height: 280,
    width: '100%',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  listSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  meta: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  mapBtn: {
    backgroundColor: accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070707',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
});

export default BranchMapScreen;
