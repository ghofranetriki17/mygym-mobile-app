import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { userProgressAPI } from '../services/api';
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get("window").width;

const formatImc = (imc) => {
  const val = parseFloat(imc);
  return !isNaN(val) ? val.toFixed(2) : '-';
};

const UserProgressScreen = () => {
  const [progresses, setProgresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [userName, setUserName] = useState('');

  const latest = useMemo(() => (progresses.length ? progresses[progresses.length - 1] : null), [progresses]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('userName');
      setUserName(storedUserName || 'User');
      fetchProgresses();
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgresses = async () => {
    try {
      setLoading(true);
      const data = await userProgressAPI.getAll();
      setProgresses(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to load progress data';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteProgress = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userProgressAPI.delete(id);
              Alert.alert('Deleted', 'Progress entry deleted successfully');
              fetchProgresses();
            } catch (error) {
              console.error('Error deleting progress:', error);
              Alert.alert('Error', 'Failed to delete progress');
            }
          },
        },
      ]
    );
  };

  const addProgress = async () => {
    if (!recordedAt) {
      Alert.alert('Validation', 'Date is required');
      return;
    }

    if (!weight && !height && !bodyFat && !muscleMass) {
      Alert.alert('Validation', 'Please provide at least one measurement');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(recordedAt)) {
      Alert.alert('Validation', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      Alert.alert('Validation', 'Please enter a valid weight');
      return;
    }

    if (height && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
      Alert.alert('Validation', 'Please enter a valid height');
      return;
    }

    if (bodyFat && (isNaN(parseFloat(bodyFat)) || parseFloat(bodyFat) < 0 || parseFloat(bodyFat) > 100)) {
      Alert.alert('Validation', 'Body fat percentage must be between 0 and 100');
      return;
    }

    if (muscleMass && (isNaN(parseFloat(muscleMass)) || parseFloat(muscleMass) < 0 || parseFloat(muscleMass) > 100)) {
      Alert.alert('Validation', 'Muscle mass percentage must be between 0 and 100');
      return;
    }

    try {
      const progressData = { recorded_at: recordedAt };
      if (weight) progressData.weight = parseFloat(weight);
      if (height) progressData.height = parseFloat(height);
      if (bodyFat) progressData.body_fat = parseFloat(bodyFat);
      if (muscleMass) progressData.muscle_mass = parseFloat(muscleMass);

      await userProgressAPI.create(progressData);
      Alert.alert('Success', 'Progress added successfully');
      fetchProgresses();

      setWeight('');
      setHeight('');
      setBodyFat('');
      setMuscleMass('');
      setRecordedAt('');
    } catch (error) {
      console.error('Error adding progress:', error);
      let errorMessage = 'Failed to save progress';
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        errorMessage = Object.values(details).flat().join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const getTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setTodaysDate = () => {
    setRecordedAt(getTodaysDate());
  };

  const getChartData = () => {
    if (progresses.length === 0) return null;
    const recentProgresses = progresses.slice(-5);
    const labels = recentProgresses.map(p => new Date(p.recorded_at).toLocaleDateString());

    const datasets = [];

    const weightData = recentProgresses.map(p => p.weight ? parseFloat(p.weight) : 0);
    if (weightData.some(w => w > 0)) {
      datasets.push({
        data: weightData,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 2,
      });
    }

    const heightData = recentProgresses.map(p => p.height ? parseFloat(p.height) : 0);
    if (heightData.some(h => h > 0)) {
      datasets.push({
        data: heightData,
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 2,
      });
    }

    const muscleMassData = recentProgresses.map(p => p.muscle_mass ? parseFloat(p.muscle_mass) : 0);
    if (muscleMassData.some(m => m > 0)) {
      datasets.push({
        data: muscleMassData,
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
        strokeWidth: 2,
      });
    }

    const bodyFatData = recentProgresses.map(p => p.body_fat ? parseFloat(p.body_fat) : 0);
    if (bodyFatData.some(b => b > 0)) {
      datasets.push({
        data: bodyFatData,
        color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
        strokeWidth: 2,
      });
    }

    return datasets.length > 0 ? { labels, datasets } : null;
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FF3B30', '#0B0B0F']} style={styles.heroCard}>
          <Text style={styles.heroKicker}>Progress Tracker</Text>
          <Text style={styles.heroTitle}>{userName}'s progress</Text>
          <Text style={styles.heroSubtitle}>Suivez poids, masse musculaire et body fat</Text>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Icon name="calendar" size={14} color="#0B0B0F" />
              <Text style={styles.heroBadgeText}>
                {progresses.length ? `${progresses.length} entr${progresses.length > 1 ? 'ies' : 'y'}` : 'No entries'}
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(11,11,15,0.2)', borderColor: '#0B0B0F' }]}>
              <Icon name="clock-o" size={14} color="#0B0B0F" />
              <Text style={[styles.heroBadgeText, { color: '#0B0B0F' }]}>
                {latest ? new Date(latest.recorded_at).toLocaleDateString() : 'No recent data'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.cardsRow}>
          <View style={styles.statCard}>
            <Icon name="balance-scale" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>Weight</Text>
            <Text style={styles.statValue}>{latest?.weight ? `${latest.weight} kg` : '--'}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="heartbeat" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>Body fat</Text>
            <Text style={styles.statValue}>{latest?.body_fat ? `${latest.body_fat}%` : '--'}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="line-chart" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>BMI</Text>
            <Text style={styles.statValue}>{latest ? formatImc(latest.imc) : '--'}</Text>
          </View>
        </View>

        {chartData && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tendances récentes</Text>
            <LineChart
              data={chartData}
              width={screenWidth * 0.9}
              height={220}
              chartConfig={{
                backgroundColor: '#0F1016',
                backgroundGradientFrom: '#0F1016',
                backgroundGradientTo: '#0F1016',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#FF3B30"
                }
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
              bezier
            />
            <View style={styles.legendContainer}>
              <Text style={[styles.legendText, { color: 'rgba(0, 123, 255, 1)' }]}>Weight</Text>
              <Text style={[styles.legendText, { color: 'rgba(255, 99, 132, 1)' }]}>Height</Text>
              <Text style={[styles.legendText, { color: 'rgba(75, 192, 192, 1)' }]}>Muscle</Text>
              <Text style={[styles.legendText, { color: 'rgba(255, 206, 86, 1)' }]}>Body fat</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add new progress</Text>
          <Text style={styles.sectionHint}>Enregistrez vos mesures pour suivre vos progrès.</Text>
          <TextInput
            placeholder="Weight (kg) - optional"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder="Height (cm) - optional"
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder="Body Fat % - optional"
            keyboardType="numeric"
            value={bodyFat}
            onChangeText={setBodyFat}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder="Muscle Mass % - optional"
            keyboardType="numeric"
            value={muscleMass}
            onChangeText={setMuscleMass}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <View style={styles.dateRow}>
            <TextInput
              placeholder="Recorded Date (YYYY-MM-DD) - required"
              value={recordedAt}
              onChangeText={setRecordedAt}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor="#8E8E93"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={setTodaysDate}>
              <Text style={styles.secondaryButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={addProgress}>
            <Text style={styles.primaryButtonText}>Save progress</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>History</Text>
        {progresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No progress data yet. Add your first entry above!</Text>
          </View>
        ) : (
          progresses
            .slice()
            .reverse()
            .map((item) => (
              <View key={item.id} style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.dateText}>{new Date(item.recorded_at).toLocaleDateString()}</Text>
                  <TouchableOpacity onPress={() => deleteProgress(item.id)} style={styles.deleteButton}>
                    <Icon name="trash" size={14} color="#FF3B30" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.metricsContainer}>
                  <View style={styles.metricBox}>
                    <Icon name="balance-scale" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.weight ? `${item.weight} kg` : '-'}</Text>
                    <Text style={styles.metricLabel}>Weight</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="arrows-v" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.height ? `${item.height} cm` : '-'}</Text>
                    <Text style={styles.metricLabel}>Height</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="tint" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.body_fat ? `${item.body_fat}%` : '-'}</Text>
                    <Text style={styles.metricLabel}>Body Fat</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="heartbeat" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.muscle_mass ? `${item.muscle_mass}%` : '-'}</Text>
                    <Text style={styles.metricLabel}>Muscle</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="line-chart" size={18} color="#FFD700" />
                    <Text style={styles.metricValue}>{formatImc(item.imc)}</Text>
                    <Text style={styles.metricLabel}>BMI</Text>
                  </View>
                </View>
              </View>
            ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#000000',
    flexGrow: 1,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  heroKicker: {
    color: '#0B0B0F',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#0B0B0F',
    fontSize: 24,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#1E1E1E',
    fontSize: 14,
    fontWeight: '600',
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFE0DB',
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#0B0B0F',
    fontWeight: '800',
    fontSize: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0F1016',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F1F2A',
    gap: 4,
  },
  statLabelSmall: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#0F1016',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F2A',
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  legendText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
  },
  input: {
    borderColor: '#1F1F2A',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#151621',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#0B0B0F',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 13,
  },
  progressItem: {
    backgroundColor: '#0F1016',
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F2A',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#FF6F61',
    fontSize: 14,
    fontWeight: '800',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    width: '31%',
    backgroundColor: '#151621',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F2A',
  },
  metricValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default UserProgressScreen;
