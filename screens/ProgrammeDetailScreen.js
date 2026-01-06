import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { programmeAPI, workoutAPI } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { t } from '../localization';
import { useLanguage } from './hooks/useLanguage';

const days = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const ProgrammeDetailScreen = ({ route, navigation }) => {
  const { programme: initialProgramme, workoutsSource = [] } = route.params || {};
  const [programme, setProgramme] = useState(initialProgramme || null);
  const [loading, setLoading] = useState(!initialProgramme);
  const [error, setError] = useState(null);
  const [openingWorkoutId, setOpeningWorkoutId] = useState(null);
  const [hydratedWorkouts, setHydratedWorkouts] = useState([]);
  const [availableWorkouts, setAvailableWorkouts] = useState(workoutsSource || []);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [newEntries, setNewEntries] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [removingWorkoutId, setRemovingWorkoutId] = useState(null);
  const [deletingProgramme, setDeletingProgramme] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    hydrateWorkouts(initialProgramme, workoutsSource);
    if (!workoutsSource || workoutsSource.length === 0) {
      loadAvailableWorkouts();
    }
  }, [initialProgramme, workoutsSource]);

  useEffect(() => {
    if (!initialProgramme?.id) return;
    if (!initialProgramme.workouts) {
      loadProgramme(initialProgramme.id);
    }
  }, [initialProgramme]);

  const hydrateWorkouts = (prog, source) => {
    if (!prog?.workouts) return;
    if (!Array.isArray(source) || source.length === 0) {
      setHydratedWorkouts(prog.workouts);
      return;
    }
    const merged = prog.workouts.map((w) => {
      const full = source.find((sw) => String(sw.id) === String(w.id));
      return full ? { ...full, pivot: w.pivot } : w;
    });
    setHydratedWorkouts(merged);
    setProgramme((prev) => (prev ? { ...prev, workouts: merged } : prev));
  };

  const loadAvailableWorkouts = async () => {
    setLoadingAvailable(true);
    try {
      const data = await workoutAPI.getAll();
      let list = Array.isArray(data) ? data : [];
      if (programme?.user_id) {
        list = list.filter((w) => String(w.user_id) === String(programme.user_id));
      }
      setAvailableWorkouts(list);
    } catch (e) {
      setAvailableWorkouts(workoutsSource || []);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const loadProgramme = async (id) => {
    setLoading(true);
    try {
      const data = await programmeAPI.getById(id);
      setProgramme(data);
    } catch {
      setError(t(language, 'errorLoadProgramme'));
    } finally {
      setLoading(false);
    }
  };

  const groupedWorkouts = useMemo(() => {
    const byWeek = {};
    (programme?.workouts || hydratedWorkouts || []).forEach((w) => {
      const week = w.pivot?.order ?? 1;
      const day = w.pivot?.week_day || 0;
      if (!byWeek[week]) byWeek[week] = {};
      if (!byWeek[week][day]) byWeek[week][day] = [];
      byWeek[week][day].push(w);
    });
    Object.keys(byWeek).forEach((wk) => {
      Object.keys(byWeek[wk]).forEach((d) => {
        byWeek[wk][d].sort((a, b) => (a.pivot?.order || 0) - (b.pivot?.order || 0));
      });
    });
    return byWeek;
  }, [programme, hydratedWorkouts]);

  useEffect(() => {
    const weeks = Object.keys(groupedWorkouts)
      .map((k) => Number(k))
      .sort((a, b) => a - b);
    if (weeks.length > 0 && (selectedWeek === null || !weeks.includes(selectedWeek))) {
      setSelectedWeek(weeks[0]);
    }
  }, [groupedWorkouts, selectedWeek]);

  const dayLabels = {
    1: t(language, 'dayMon'),
    2: t(language, 'dayTue'),
    3: t(language, 'dayWed'),
    4: t(language, 'dayThu'),
    5: t(language, 'dayFri'),
    6: t(language, 'daySat'),
    7: t(language, 'daySun'),
    0: t(language, 'unscheduled'),
  };

  const handleOpenWorkout = async (item) => {
    const id = item?.id;
    if (!id) return;
    const local = (hydratedWorkouts || []).find((w) => String(w.id) === String(id));
    if (local?.exercises?.length) {
      navigation.navigate('WorkoutDetails', { workout: local, workoutId: id });
      return;
    }

    try {
      setOpeningWorkoutId(id);
      const full = await workoutAPI.getById(id);
      navigation.navigate('WorkoutDetails', { workout: full, workoutId: id });
    } catch (e) {
      Alert.alert(t(language, 'accessTitle'), t(language, 'workoutFallback'));
      navigation.navigate('WorkoutDetails', { workout: item, workoutId: id });
    } finally {
      setOpeningWorkoutId(null);
    }
  };

  const addEntryRow = () => {
    setNewEntries((prev) => [...prev, { workoutId: null, week: '', day: '' }]);
  };

  const updateEntry = (index, field, value) => {
    setNewEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry))
    );
  };

  const removeEntry = (index) => {
    setNewEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSyncWorkouts = async () => {
    if (!programme?.id) return;
    const selections = newEntries
      .filter((e) => e.workoutId)
      .map((e, idx) => ({
        id: e.workoutId,
        order: e.week ? Number(e.week) : idx + 1,
        week_day: e.day ? Number(e.day) : null,
      }));

    if (selections.length === 0) {
      Alert.alert(t(language, 'validationTitle'), t(language, 'selectWorkoutPlease'));
      return;
    }

    // Merge with existing, preserving duplicates
    const existing =
      (programme.workouts || []).map((w, idx) => ({
        id: w.id,
        order: w.pivot?.order ?? idx + 1,
        week_day: w.pivot?.week_day ?? null,
      })) || [];
    const merged = [...existing, ...selections];

    setSavingAdd(true);
    try {
      const updated = await programmeAPI.syncWorkouts(programme.id, merged);
      setProgramme(updated);
      hydrateWorkouts(updated, availableWorkouts);
      setNewEntries([]);
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert(t(language, 'errorTitle'), t(language, 'errorUpdateProgrammeWorkouts'));
    } finally {
      setSavingAdd(false);
    }
  };

  const handleRemoveWorkout = (workoutId) => {
    if (!programme?.id) return;
    Alert.alert(t(language, 'removeWorkoutTitle'), t(language, 'removeWorkoutConfirm'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      {
        text: t(language, 'remove'),
        style: 'destructive',
        onPress: async () => {
          const current = [...(programme.workouts || [])];
          const removeIndex = current.findIndex((w) => w.id === workoutId);
          if (removeIndex === -1) return;
          current.splice(removeIndex, 1); // remove only one occurrence

          const remaining =
            current.map((w, idx) => ({
              id: w.id,
              order: w.pivot?.order ?? idx + 1,
              week_day: w.pivot?.week_day ?? null,
            })) || [];

          setRemovingWorkoutId(workoutId);
          try {
            const updated = await programmeAPI.syncWorkouts(programme.id, remaining);
            setProgramme(updated);
            hydrateWorkouts(updated, availableWorkouts);
          } catch (e) {
            Alert.alert(t(language, 'errorTitle'), t(language, 'errorRemoveWorkout'));
          } finally {
            setRemovingWorkoutId(null);
          }
        },
      },
    ]);
  };

  const handleDeleteProgramme = () => {
    if (!programme?.id) return;
    Alert.alert(t(language, 'deleteProgramme'), t(language, 'deleteProgrammeConfirm'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      {
        text: t(language, 'delete'),
        style: 'destructive',
        onPress: async () => {
          setDeletingProgramme(true);
          try {
            await programmeAPI.delete(programme.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(t(language, 'errorTitle'), t(language, 'errorDeleteProgramme'));
          } finally {
            setDeletingProgramme(false);
          }
        },
      },
    ]);
  };

  const renderWorkoutCard = (item) => {
    const loadingThis = openingWorkoutId === item.id;
    const removingThis = removingWorkoutId === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.workoutCard}
        onPress={() => handleOpenWorkout(item)}
        activeOpacity={0.85}
      >
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutTitle}>{item.title || t(language, 'workoutPlaceholder', { id: item.id })}</Text>
        </View>
        <Text style={styles.workoutMeta}>
          {item.exercises
            ? t(language, 'exercisesCount', { count: item.exercises.length })
            : t(language, 'exercisesNotLoaded')}
        </Text>
        <TouchableOpacity
          style={styles.removeRow}
          onPress={() => handleRemoveWorkout(item.id)}
          disabled={removingThis}
          activeOpacity={0.8}
        >
          {removingThis ? (
            <ActivityIndicator color="#FF6B6B" />
          ) : (
            <View style={styles.removeRowInner}>
              <Icon name="times" size={12} color="#FF6B6B" />
            </View>
          )}
        </TouchableOpacity>
        {loadingThis ? <ActivityIndicator color="#FF3B30" style={{ marginTop: 6 }} /> : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!programme) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t(language, 'programmeNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>{t(language, 'programmeLabel')}</Text>
        <Text style={styles.title}>{programme.title}</Text>
        <Text style={styles.objective}>{programme.objectif || t(language, 'noObjectiveProvided')}</Text>
        {programme.description ? <Text style={styles.description}>{programme.description}</Text> : null}

        <View style={styles.metaRow}>
          {programme.duration_weeks ? (
            <View style={styles.metaPill}>
              <Icon name="clock" size={12} color="#FF3B30" />
              <Text style={styles.metaPillText}>
                {t(language, 'durationWeeksShort', { count: programme.duration_weeks })}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaPill}>
            <Icon name="dumbbell" size={12} color="#FF3B30" />
            <Text style={styles.metaPillText}>
              {t(language, 'workoutsCount', { count: programme.workouts?.length || 0 })}
            </Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setNewEntries([{ workoutId: null, week: '', day: '' }]);
              setAddModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Icon name="plus" size={14} color="#0B0B0F" />
            <Text style={styles.primaryButtonText}>{t(language, 'addWorkoutsCTA')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Programmes')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>{t(language, 'backToList')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Icon name="dumbbell" size={16} color="#FF3B30" />
        <Text style={styles.sectionTitle}>
          {t(language, 'workoutsByWeekDay', { count: programme.workouts?.length || 0 })}
        </Text>
      </View>

      {Object.keys(groupedWorkouts).length === 0 ? (
        <Text style={styles.emptyText}>{t(language, 'noWorkoutsAttached')}</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekTabs}
            style={{ marginBottom: 12 }}
          >
            {Object.keys(groupedWorkouts)
              .map((k) => Number(k))
              .sort((a, b) => a - b)
              .map((week) => {
                const active = week === selectedWeek;
                return (
                  <TouchableOpacity
                    key={week}
                    style={[styles.weekTab, active && styles.weekTabActive]}
                    onPress={() => setSelectedWeek(week)}
                  >
                    <Text style={[styles.weekTabText, active && styles.weekTabTextActive]}>
                      {t(language, 'weekLabel', { num: week })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>

          {selectedWeek !== null && (
            <View style={styles.weekContainer}>
              <Text style={styles.weekTitle}>{t(language, 'weekLabel', { num: selectedWeek })}</Text>
              <View style={styles.calendarContainer}>
                {days.map((d) => (
                  <View key={d.value} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{dayLabels[d.value]}</Text>
                    {groupedWorkouts[selectedWeek]?.[d.value]?.length ? (
                      groupedWorkouts[selectedWeek][d.value].map(renderWorkoutCard)
                    ) : (
                      <Text style={styles.emptyDayText}>{t(language, 'noWorkout')}</Text>
                    )}
                  </View>
                ))}
                {groupedWorkouts[selectedWeek]?.[0]?.length ? (
                  <View style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{t(language, 'unscheduled')}</Text>
                    {groupedWorkouts[selectedWeek][0].map(renderWorkoutCard)}
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t(language, 'addWorkoutsTitle')}</Text>
            {loadingAvailable ? (
              <ActivityIndicator color="#FF3B30" style={{ marginVertical: 10 }} />
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {newEntries.map((entry, idx) => (
                  <View key={idx} style={styles.entryContainer}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.label}>{t(language, 'workoutNumber', { num: idx + 1 })}</Text>
                      <TouchableOpacity onPress={() => removeEntry(idx)}>
                        <Text style={styles.removeText}>{t(language, 'remove')}</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {availableWorkouts.map((w) => {
                        const selected = entry.workoutId === w.id;
                        return (
                          <TouchableOpacity
                            key={w.id}
                            style={[styles.workoutChip, selected && styles.workoutChipSelected]}
                            onPress={() => updateEntry(idx, 'workoutId', w.id)}
                          >
                            <Text
                            style={[
                              styles.workoutChipText,
                              selected && styles.workoutChipTextSelected,
                            ]}
                          >
                              {w.title || t(language, 'workoutPlaceholder', { id: w.id })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    </ScrollView>
                    <View style={styles.entryRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>{t(language, 'weekOrderLabel')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 1"
                          placeholderTextColor="#888"
                          keyboardType="numeric"
                          value={String(entry.week || '')}
                          onChangeText={(text) => updateEntry(idx, 'week', text.replace(/[^0-9]/g, ''))}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.label}>{t(language, 'weekDayLabel')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 1"
                          placeholderTextColor="#888"
                          keyboardType="numeric"
                          value={String(entry.day || '')}
                          onChangeText={(text) => updateEntry(idx, 'day', text.replace(/[^0-9]/g, ''))}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.smallAddButton} onPress={addEntryRow}>
                  <Icon name="plus" size={12} color="#121212" />
                  <Text style={styles.smallAddButtonText}>{t(language, 'addAnother')}</Text>
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setAddModalVisible(false);
                      setNewEntries([]);
                    }}
                    disabled={savingAdd}
                  >
                    <Text style={styles.cancelText}>{t(language, 'cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSyncWorkouts}
                    disabled={savingAdd}
                  >
                    {savingAdd ? (
                      <ActivityIndicator color="#121212" />
                    ) : (
                      <Text style={styles.saveText}>{t(language, 'save')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteProgramme}
        disabled={deletingProgramme}
        activeOpacity={0.85}
      >
        {deletingProgramme ? (
          <ActivityIndicator color="#121212" />
        ) : (
          <>
            <Icon name="trash" size={14} color="#121212" />
            <Text style={styles.deleteButtonText}>{t(language, 'deleteProgramme')}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FF3B30', fontSize: 26, fontWeight: '900', marginBottom: 8 },
  objective: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  description: { color: '#CCCCCC', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heroCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    marginBottom: 16,
  },
  heroKicker: { color: '#9CA3AF', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 8 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F1016',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metaPillText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
  },
  primaryButtonText: { color: '#0B0B0F', fontWeight: '900', fontSize: 14 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0F1016',
  },
  secondaryButtonText: { color: '#E5E7EB', fontWeight: '800', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  calendarContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dayColumn: {
    width: '47%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 10,
  },
  dayLabel: { color: '#FF3B30', fontWeight: '800', marginBottom: 6 },
  workoutCard: {
    backgroundColor: '#0F1016',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F2A',
    marginBottom: 10,
  },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  orderPill: { backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  orderText: { color: '#121212', fontWeight: '800', fontSize: 12 },
  workoutMeta: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  removeRow: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333',
  },
  removeRowInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeRowText: { color: '#FF6B6B', fontWeight: '800', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic', marginTop: 8 },
  emptyDayText: { color: '#777', fontSize: 12, fontStyle: 'italic' },
  weekContainer: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#111118',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F2A',
  },
  weekTitle: { color: '#FFFFFF', fontWeight: '900', marginBottom: 8, fontSize: 14 },
  weekTabs: { flexDirection: 'row', paddingVertical: 4, gap: 8 },
  weekTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0F1016',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F2A',
  },
  weekTabActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  weekTabText: { color: '#9CA3AF', fontWeight: '700' },
  weekTabTextActive: { color: '#121212', fontWeight: '900' },
  errorText: { color: '#FF6F61', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: { color: '#FF3B30', fontSize: 18, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  entryContainer: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeText: { color: '#FF6B6B', fontWeight: '800' },
  label: { color: '#FF3B30', fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  entryRow: { flexDirection: 'row', marginTop: 6 },
  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  smallAddButtonText: { color: '#121212', fontWeight: '800', fontSize: 12 },
  workoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  workoutChipSelected: { backgroundColor: '#FF3B30' },
  workoutChipText: { color: '#FFFFFF', fontWeight: '600' },
  workoutChipTextSelected: { color: '#121212', fontWeight: '800' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333', marginRight: 8 },
  saveButton: { backgroundColor: '#FF3B30', marginLeft: 8 },
  cancelText: { color: '#9CA3AF', fontWeight: '800' },
  saveText: { color: '#121212', fontWeight: '900' },
  deleteButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  deleteButtonText: { color: '#121212', fontWeight: '900', fontSize: 14 },
});

export default ProgrammeDetailScreen;
