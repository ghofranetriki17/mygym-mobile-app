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
import { t, supportedLanguages } from '../localization';
import { useLanguage } from './hooks/useLanguage';

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
  const { language, changeLanguage } = useLanguage();

  const latest = useMemo(() => (progresses.length ? progresses[progresses.length - 1] : null), [progresses]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('userName');
      setUserName(storedUserName || t(language, 'userDefault'));
      fetchProgresses();
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t(language, 'errorTitle'), t(language, 'errorLoadUserData'));
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
        Alert.alert(t(language, 'sessionExpired'), t(language, 'pleaseLoginAgain'));
      } else {
        const errorMessage = error.response?.data?.message || t(language, 'errorLoadProgress');
        Alert.alert(t(language, 'errorTitle'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteProgress = async (id) => {
    Alert.alert(
      t(language, 'confirmDelete'),
      t(language, 'confirmDeleteProgress'),
      [
        { text: t(language, 'cancel'), style: 'cancel' },
        {
          text: t(language, 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await userProgressAPI.delete(id);
              Alert.alert(t(language, 'deletedTitle'), t(language, 'progressDeleted'));
              fetchProgresses();
            } catch (error) {
              console.error('Error deleting progress:', error);
              Alert.alert(t(language, 'errorTitle'), t(language, 'errorDeleteProgress'));
            }
          },
        },
      ]
    );
  };

  const addProgress = async () => {
    if (!recordedAt) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'dateRequired'));
      return;
    }

    if (!weight && !height && !bodyFat && !muscleMass) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'oneMeasurement'));
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(recordedAt)) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'dateFormat'));
      return;
    }

    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'validWeight'));
      return;
    }

    if (height && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'validHeight'));
      return;
    }

    if (bodyFat && (isNaN(parseFloat(bodyFat)) || parseFloat(bodyFat) < 0 || parseFloat(bodyFat) > 100)) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'bodyFatRange'));
      return;
    }

    if (muscleMass && (isNaN(parseFloat(muscleMass)) || parseFloat(muscleMass) < 0 || parseFloat(muscleMass) > 100)) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'muscleMassRange'));
      return;
    }

    try {
      const progressData = { recorded_at: recordedAt };
      if (weight) progressData.weight = parseFloat(weight);
      if (height) progressData.height = parseFloat(height);
      if (bodyFat) progressData.body_fat = parseFloat(bodyFat);
      if (muscleMass) progressData.muscle_mass = parseFloat(muscleMass);

      await userProgressAPI.create(progressData);
      Alert.alert(t(language, 'successTitle'), t(language, 'progressAdded'));
      fetchProgresses();

      setWeight('');
      setHeight('');
      setBodyFat('');
      setMuscleMass('');
      setRecordedAt('');
    } catch (error) {
      console.error('Error adding progress:', error);
      let errorMessage = t(language, 'errorSaveProgress');
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        errorMessage = Object.values(details).flat().join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert(t(language, 'errorTitle'), errorMessage);
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
        <Text style={styles.loadingText}>{t(language, 'loadingProgress')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FF3B30', '#0B0B0F']} style={styles.heroCard}>
          <Text style={styles.heroKicker}>{t(language, 'progressTracker')}</Text>
          <Text style={styles.heroTitle}>{t(language, 'progressFor', { name: userName })}</Text>
          <Text style={styles.heroSubtitle}>{t(language, 'progressSubtitle')}</Text>
          <View style={styles.langSwitch}>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, language === lang.code && styles.langChipActive]}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text style={[styles.langChipText, language === lang.code && styles.langChipTextActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Icon name="calendar" size={14} color="#0B0B0F" />
              <Text style={styles.heroBadgeText}>
                {progresses.length
                  ? t(language, 'entriesCount', { count: progresses.length })
                  : t(language, 'noEntries')}
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(11,11,15,0.2)', borderColor: '#0B0B0F' }]}>
              <Icon name="clock-o" size={14} color="#0B0B0F" />
              <Text style={[styles.heroBadgeText, { color: '#0B0B0F' }]}>
                {latest ? new Date(latest.recorded_at).toLocaleDateString() : t(language, 'noRecentData')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.cardsRow}>
          <View style={styles.statCard}>
            <Icon name="balance-scale" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>{t(language, 'weight')}</Text>
            <Text style={styles.statValue}>{latest?.weight ? `${latest.weight} kg` : '--'}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="heartbeat" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>{t(language, 'bodyFat')}</Text>
            <Text style={styles.statValue}>{latest?.body_fat ? `${latest.body_fat}%` : '--'}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="line-chart" size={20} color="#FF3B30" />
            <Text style={styles.statLabelSmall}>{t(language, 'bmi')}</Text>
            <Text style={styles.statValue}>{latest ? formatImc(latest.imc) : '--'}</Text>
          </View>
        </View>

        {chartData && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t(language, 'recentTrends')}</Text>
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
              <Text style={[styles.legendText, { color: 'rgba(0, 123, 255, 1)' }]}>{t(language, 'weight')}</Text>
              <Text style={[styles.legendText, { color: 'rgba(255, 99, 132, 1)' }]}>{t(language, 'height')}</Text>
              <Text style={[styles.legendText, { color: 'rgba(75, 192, 192, 1)' }]}>{t(language, 'muscle')}</Text>
              <Text style={[styles.legendText, { color: 'rgba(255, 206, 86, 1)' }]}>{t(language, 'bodyFat')}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t(language, 'addProgress')}</Text>
          <Text style={styles.sectionHint}>{t(language, 'addProgressHint')}</Text>
          <TextInput
            placeholder={t(language, 'weightPlaceholder')}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder={t(language, 'heightPlaceholder')}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder={t(language, 'bodyFatPlaceholder')}
            keyboardType="numeric"
            value={bodyFat}
            onChangeText={setBodyFat}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <TextInput
            placeholder={t(language, 'musclePlaceholder')}
            keyboardType="numeric"
            value={muscleMass}
            onChangeText={setMuscleMass}
            style={styles.input}
            placeholderTextColor="#8E8E93"
          />
          <View style={styles.dateRow}>
            <TextInput
              placeholder={t(language, 'datePlaceholder')}
              value={recordedAt}
              onChangeText={setRecordedAt}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor="#8E8E93"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={setTodaysDate}>
              <Text style={styles.secondaryButtonText}>{t(language, 'today')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={addProgress}>
            <Text style={styles.primaryButtonText}>{t(language, 'saveProgress')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t(language, 'history')}</Text>
        {progresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t(language, 'noProgressYet')}</Text>
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
                    <Text style={styles.deleteButtonText}>{t(language, 'delete')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.metricsContainer}>
                  <View style={styles.metricBox}>
                    <Icon name="balance-scale" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.weight ? `${item.weight} kg` : '-'}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'weight')}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="arrows-v" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.height ? `${item.height} cm` : '-'}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'height')}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="tint" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.body_fat ? `${item.body_fat}%` : '-'}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'bodyFat')}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="heartbeat" size={18} color="#FF6F61" />
                    <Text style={styles.metricValue}>{item.muscle_mass ? `${item.muscle_mass}%` : '-'}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'muscle')}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Icon name="line-chart" size={18} color="#FFD700" />
                    <Text style={styles.metricValue}>{formatImc(item.imc)}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'bmi')}</Text>
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
  langSwitch: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(30,30,30,0.9)',
  },
  langChipActive: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  langChipText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 12,
  },
  langChipTextActive: {
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
