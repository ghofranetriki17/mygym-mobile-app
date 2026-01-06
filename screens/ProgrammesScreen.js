import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { programmeAPI, workoutAPI } from '../services/api';
import { t } from '../localization';
import { useLanguage } from './hooks/useLanguage';

const ProgrammesScreen = ({ navigation }) => {
  const [programmes, setProgrammes] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [sortOrder, setSortOrder] = useState('newest'); // newest | oldest

  const [title, setTitle] = useState('');
  const [objectif, setObjectif] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [workoutEntries, setWorkoutEntries] = useState([]);
  const { language } = useLanguage();

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId !== null) {
      loadData();
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      const storedId = await AsyncStorage.getItem('userId');
      setUserId(storedId);
    } catch {
      setUserId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [progs, wos] = await Promise.all([loadProgrammes(), loadWorkouts(userId)]);
      setProgrammes(filterProgrammesByUser(progs));
      setWorkouts(wos);
      setError(null);
    } catch {
      setError(t(language, 'errorLoadProgrammes'));
    } finally {
      setLoading(false);
    }
  };

  const loadProgrammes = async () => {
    const data = await programmeAPI.getAll();
    return Array.isArray(data) ? data : [];
  };

  const loadWorkouts = async (uid) => {
    setLoadingWorkouts(true);
    try {
      const data = await workoutAPI.getAll();
      const list = Array.isArray(data) ? data : [];
      if (!uid) return list;
      return list.filter((w) => String(w.user_id) === String(uid));
    } catch {
      Alert.alert(t(language, 'errorTitle'), t(language, 'errorLoadWorkouts'));
      return [];
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const filterProgrammesByUser = (list) => {
    if (!userId) return list;
    return list.filter((p) => String(p.user_id) === String(userId));
  };

  const clearSearch = () => setSearchQuery('');

  const toggleSortOrder = () =>
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));

  const resetFilters = () => {
    setStatusFilter('all');
    setSortOrder('newest');
    clearSearch();
  };

  const getDateValue = (item) => {
    const raw = item?.created_at || item?.updated_at;
    if (raw) {
      const parsed = new Date(raw).getTime();
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Number(item?.id) || 0;
  };

  const visibleProgrammes = useMemo(() => {
    let list = programmes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(query)) ||
          (p.objectif && p.objectif.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => (statusFilter === 'active' ? p.is_active : !p.is_active));
    }

    return [...list].sort((a, b) => {
      const dateA = getDateValue(a);
      const dateB = getDateValue(b);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [programmes, searchQuery, statusFilter, sortOrder]);

  const resetForm = () => {
    setTitle('');
    setObjectif('');
    setDescription('');
    setDurationWeeks('');
    setWorkoutEntries([]);
  };

  const addWorkoutEntry = () => {
    setWorkoutEntries((prev) => [...prev, { workoutId: null, order: '', week_day: '' }]);
  };

  const updateEntry = (index, field, value) => {
    setWorkoutEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry))
    );
  };

  const removeEntry = (index) => {
    setWorkoutEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateProgramme = async () => {
    if (!title.trim()) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'titleRequired'));
      return;
    }
    if (!userId) {
      Alert.alert(t(language, 'errorTitle'), t(language, 'userNotIdentified'));
      return;
    }

    const formattedWorkouts = workoutEntries
      .filter((w) => w.workoutId)
      .map((w) => ({
        id: w.workoutId,
        order: Number(w.order) || 0,
        week_day: w.week_day ? Number(w.week_day) : null,
      }));

    setSaving(true);
    try {
      await programmeAPI.create({
        user_id: Number(userId),
        title: title.trim(),
        objectif: objectif.trim() || null,
        description: description.trim() || null,
        duration_weeks: durationWeeks ? Number(durationWeeks) : null,
        is_active: true,
        workouts: formattedWorkouts,
      });
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert(t(language, 'errorTitle'), t(language, 'errorCreateProgramme'));
    } finally {
      setSaving(false);
    }
  };

  const renderProgrammeCard = ({ item }) => (
    <TouchableOpacity
      style={styles.programmeCard}
      onPress={() => navigation.navigate('ProgrammeDetail', { programme: item, workoutsSource: workouts })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.programmeTitle}>{item.title}</Text>
        <Text style={styles.programmeDuration}>
          {item.duration_weeks
            ? t(language, 'durationWeeksShort', { count: item.duration_weeks })
            : t(language, 'durationNA')}
        </Text>
      </View>
      <Text style={styles.programmeObjective}>{item.objectif || t(language, 'noObjective')}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.metaPill}>
          <Icon name="dumbbell" size={12} color="#FF3B30" />
          <Text style={styles.metaText}>
            {t(language, 'workoutsCount', { count: item.workouts?.length || 0 })}
          </Text>
        </View>
        {item.is_active ? (
          <View style={styles.activePill}>
            <Text style={styles.activeText}>{t(language, 'active')}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderWorkoutEntry = (entry, index) => (
    <View key={index} style={styles.entryContainer}>
      <Text style={styles.label}>{t(language, 'workoutNumber', { num: index + 1 })}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {workouts.map((w) => {
          const selected = entry.workoutId === w.id;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.workoutChip, selected && styles.workoutChipSelected]}
              onPress={() => updateEntry(index, 'workoutId', w.id)}
            >
              <Text
                style={[
                  styles.workoutChipText,
                  selected && styles.workoutChipTextSelected,
                ]}
              >
                {w.title || `Workout ${w.id}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.entryRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>{t(language, 'orderLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={String(entry.order || '')}
            onChangeText={(text) => updateEntry(index, 'order', text)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>{t(language, 'weekDayLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={String(entry.week_day || '')}
            onChangeText={(text) => updateEntry(index, 'week_day', text)}
          />
        </View>
      </View>
      <TouchableOpacity style={styles.removeEntryButton} onPress={() => removeEntry(index)}>
        <Text style={styles.removeEntryText}>{t(language, 'remove')}</Text>
      </TouchableOpacity>
    </View>
  );

  const hasFilters = searchQuery.trim() || statusFilter !== 'all' || sortOrder !== 'newest';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t(language, 'myProgrammes')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={16} color="#121212" />
          <Text style={styles.addButtonText}>{t(language, 'newLabel')}</Text>
        </TouchableOpacity>
      </View>

      {!loading && !error && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Icon name="search" size={16} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t(language, 'searchProgrammes')}
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                selectionColor="#FF3B30"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                  <Icon name="times-circle" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={toggleSortOrder}
              activeOpacity={0.8}
            >
              <Icon
                name={sortOrder === 'newest' ? 'sort-amount-down' : 'sort-amount-up'}
                size={14}
                color="#FF3B30"
              />
              <Text style={styles.sortButtonText}>
                {sortOrder === 'newest' ? t(language, 'newest') : t(language, 'oldest')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {['all', 'active', 'inactive'].map((filterKey) => {
              const active = statusFilter === filterKey;
              const label =
                filterKey === 'all'
                  ? t(language, 'allLabel')
                  : filterKey === 'active'
                  ? t(language, 'active')
                  : t(language, 'inactive');
              return (
                <TouchableOpacity
                  key={filterKey}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(filterKey)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              {t(language, 'programmesCount', { count: visibleProgrammes.length })}
            </Text>
            {(searchQuery.length > 0 || statusFilter !== 'all' || sortOrder !== 'newest') && (
              <TouchableOpacity onPress={resetFilters} activeOpacity={0.8}>
                <Text style={styles.resetText}>{t(language, 'reset')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t(language, 'retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleProgrammes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProgrammeCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {hasFilters ? t(language, 'noProgrammesFilters') : t(language, 'noProgrammes')}
              </Text>
              <Text style={styles.emptySubText}>
                {hasFilters
                  ? t(language, 'adjustSearchFilters')
                  : t(language, 'createProgrammeHint')}
              </Text>
              {hasFilters && (
                <TouchableOpacity style={styles.retryButton} onPress={resetFilters} activeOpacity={0.8}>
                  <Text style={styles.retryText}>{t(language, 'clearFilters')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t(language, 'createProgramme')}</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.label}>{t(language, 'titleLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(language, 'programmeTitlePlaceholder')}
                placeholderTextColor="#888"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>{t(language, 'objectiveLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(language, 'objectivePlaceholder')}
                placeholderTextColor="#888"
                value={objectif}
                onChangeText={setObjectif}
              />

              <Text style={styles.label}>{t(language, 'descriptionLabel')}</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder={t(language, 'programmeNotesPlaceholder')}
                placeholderTextColor="#888"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>{t(language, 'durationWeeksLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(language, 'durationPlaceholder')}
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={durationWeeks}
                onChangeText={setDurationWeeks}
              />

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.label}>{t(language, 'workoutsInProgramme')}</Text>
                <TouchableOpacity style={styles.smallAddButton} onPress={addWorkoutEntry}>
                  <Icon name="plus" size={12} color="#121212" />
                  <Text style={styles.smallAddButtonText}>{t(language, 'addWorkout')}</Text>
                </TouchableOpacity>
              </View>

              {loadingWorkouts ? (
                <ActivityIndicator color="#FF3B30" style={{ marginVertical: 10 }} />
              ) : workoutEntries.length === 0 ? (
                <Text style={styles.helperText}>
                  {t(language, 'addWorkoutsHelper')}
                </Text>
              ) : (
                workoutEntries.map((entry, idx) => renderWorkoutEntry(entry, idx))
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>{t(language, 'cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreateProgramme}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#121212" />
                  ) : (
                    <Text style={styles.saveText}>{t(language, 'save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  screenTitle: { color: '#FF3B30', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: { color: '#121212', fontWeight: '800', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  clearSearchButton: { padding: 4 },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  sortButtonText: { color: '#FF3B30', fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterChipActive: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  filterChipText: { color: '#E5E7EB', fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: '#121212' },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsText: { color: '#9CA3AF', fontWeight: '700' },
  resetText: { color: '#FF3B30', fontWeight: '800' },
  programmeCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  programmeTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  programmeDuration: { color: '#9CA3AF', fontSize: 13, fontWeight: '700' },
  programmeObjective: { color: '#CCCCCC', fontSize: 14, marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metaText: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#00FF88',
    borderRadius: 12,
  },
  activeText: { color: '#121212', fontWeight: '800', fontSize: 12 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  errorText: { color: '#FF6F61', fontSize: 16, marginBottom: 10 },
  retryButton: { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  retryText: { color: '#121212', fontWeight: '800' },
  emptyText: { color: '#CCCCCC', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubText: { color: '#9CA3AF', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: { color: '#FF3B30', fontSize: 20, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  label: { color: '#FF3B30', fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 6,
  },
  helperText: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  smallAddButtonText: { color: '#121212', fontWeight: '800', fontSize: 12 },
  entryContainer: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  workoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  workoutChipSelected: {
    backgroundColor: '#FF3B30',
  },
  workoutChipText: { color: '#FFFFFF', fontWeight: '600' },
  workoutChipTextSelected: { color: '#121212', fontWeight: '800' },
  entryRow: { flexDirection: 'row', marginTop: 6 },
  removeEntryButton: { alignSelf: 'flex-end', marginTop: 8 },
  removeEntryText: { color: '#FF6B6B', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333', marginRight: 8 },
  saveButton: { backgroundColor: '#FF3B30', marginLeft: 8 },
  cancelText: { color: '#9CA3AF', fontWeight: '800' },
  saveText: { color: '#121212', fontWeight: '900' },
});

export default ProgrammesScreen;
