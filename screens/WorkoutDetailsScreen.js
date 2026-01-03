import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { workoutAPI, exerciseAPI } from '../services/api';

const getAchievementNote = (value) => {
  if (value === 100) return 'Completed';
  if (value >= 76) return 'Nearly complete';
  if (value >= 51) return 'Almost done';
  if (value >= 26) return 'Getting there';
  if (value >= 1) return 'Just started';
  return 'Not started';
};

const WorkoutDetailsScreen = ({ route, navigation }) => {
  const { workout: initialWorkout, workoutId } = route.params || {};
  const [workout, setWorkout] = useState(initialWorkout || null);
  const [orderEdits, setOrderEdits] = useState({});
  const [loading, setLoading] = useState(!initialWorkout);
  const [error, setError] = useState(null);

  useEffect(() => {
    const needFetch = !workout?.exercises && (workoutId || workout?.id);
    if (!needFetch) return;
    const id = workoutId || workout?.id;
    const fetchWorkout = async () => {
      setLoading(true);
      try {
        const data = await workoutAPI.getById(id);
        setWorkout(data);
        setError(null);
      } catch (e) {
        setError('Failed to load workout details');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkout();
  }, [workoutId, workout]);

  const completionRate = useMemo(() => {
    const total = workout?.exercises?.length || 0;
    if (!total) return 0;
    const done = workout.exercises.filter((ex) => ex.pivot?.is_done).length;
    return Math.round((done / total) * 100);
  }, [workout]);

  const updateExercisePivot = async (exerciseId, updatedFields) => {
    try {
      await workoutAPI.updateExercisePivot(workout.id, exerciseId, updatedFields);
      setWorkout((prevWorkout) => ({
        ...prevWorkout,
        exercises: prevWorkout.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, pivot: { ...ex.pivot, ...updatedFields } } : ex
        ),
      }));
    } catch (error) {
      console.error('Failed to update pivot:', error);
      Alert.alert('Error', 'Failed to update exercise data.');
    }
  };

  const toggleDoneStatus = async (exerciseId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateExercisePivot(exerciseId, { is_done: newStatus });
    } catch (error) {
      console.error('Failed to toggle done status:', error);
      Alert.alert('Error', 'Could not update exercise status. Please try again.');
    }
  };

  const updateOrder = async (exerciseId) => {
    const newOrderStr = orderEdits[exerciseId];
    const newOrder = parseInt(newOrderStr, 10);
    if (Number.isNaN(newOrder)) {
      Alert.alert('Invalid input', 'Please enter a valid number for order.');
      return;
    }

    const currentOrder = workout.exercises.find((ex) => ex.id === exerciseId)?.pivot?.order;
    if (newOrder === currentOrder) return;

    try {
      await updateExercisePivot(exerciseId, { order: newOrder });
      Alert.alert('Success', 'Order updated!');
    } catch (error) {
      console.error('Failed to update order:', error);
      Alert.alert('Error', 'Failed to update order. Please try again.');
    }
  };

  const handleDeleteExercise = (exerciseId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to REMOVE this exercise from the workout AND DELETE it permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workoutAPI.removeExercise(workout.id, exerciseId);
              await exerciseAPI.delete(exerciseId);

              setWorkout((prevWorkout) => ({
                ...prevWorkout,
                exercises: prevWorkout.exercises.filter((ex) => ex.id !== exerciseId),
              }));

              Alert.alert('Success', 'Exercise removed and deleted successfully.');
            } catch (error) {
              console.error('Failed to delete exercise:', error);
              Alert.alert('Error', 'Failed to remove and delete exercise. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderExercise = ({ item }) => {
    const isDone = item.pivot?.is_done;
    const cardStyle = isDone ? styles.cardDone : styles.cardPending;

    return (
      <View style={[styles.cardBase, cardStyle]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.title}>{item.name}</Text>
            {item.title ? <Text style={styles.subtitle}>{item.title}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.doneToggle, isDone ? styles.doneToggleActive : styles.doneToggleInactive]}
            onPress={() => toggleDoneStatus(item.id, isDone)}
          >
            <Text style={styles.doneToggleText}>{isDone ? 'Done' : 'Pending'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Order</Text>
            <TextInput
              style={styles.orderInput}
              keyboardType="numeric"
              value={
                orderEdits[item.id] !== undefined
                  ? String(orderEdits[item.id])
                  : String(item.pivot?.order || '')
              }
              onChangeText={(text) => {
                const cleanText = text.replace(/[^0-9]/g, '');
                setOrderEdits((prev) => ({ ...prev, [item.id]: cleanText }));
              }}
              onEndEditing={() => updateOrder(item.id)}
              returnKeyType="done"
              placeholder="0"
              placeholderTextColor="#777"
            />
          </View>

          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Sets x Reps</Text>
            <Text style={styles.detailChipValue}>
              {item.sets} x {item.reps}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Achievement</Text>
            <View style={styles.achievementInputRow}>
              <TextInput
                style={styles.achievementInput}
                keyboardType="numeric"
                defaultValue={item.pivot?.achievement?.toString() || '0'}
                onEndEditing={(e) => {
                  const val = parseFloat(e.nativeEvent.text);
                  if (!Number.isNaN(val) && val >= 0 && val <= 100) {
                    updateExercisePivot(item.id, { achievement: val });
                  } else {
                    Alert.alert('Invalid', 'Achievement must be between 0 and 100');
                  }
                }}
              />
              <Text style={styles.achievementPercent}>%</Text>
            </View>
            {typeof item.pivot?.achievement === 'number' && (
              <Text style={styles.achievementNote}>{getAchievementNote(item.pivot.achievement)}</Text>
            )}
          </View>

          {item.pivot?.is_done ? (
            <View style={[styles.statusPill, styles.statusPillDone]}>
              <Text style={styles.statusPillText}>Completed</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, styles.statusPillPending]}>
              <Text style={styles.statusPillText}>In progress</Text>
            </View>
          )}
        </View>

        {item.movement && (
          <TouchableOpacity
            style={styles.relatedItem}
            onPress={() => navigation.navigate('MovementDetails', { movement: item.movement })}
          >
            <Text style={styles.relatedLabel}>Movement</Text>
            <Text style={styles.relatedValue}>{item.movement.name} {'>'}</Text>
          </TouchableOpacity>
        )}

        {item.machine && (
          <TouchableOpacity
            style={styles.relatedItem}
            onPress={() => navigation.navigate('MachineDetails', { machine: item.machine })}
          >
            <Text style={styles.relatedLabel}>Machine</Text>
            <Text style={styles.relatedValue}>{item.machine.name} {'>'}</Text>
          </TouchableOpacity>
        )}

        {item.charge && (
          <TouchableOpacity
            style={styles.relatedItem}
            onPress={() => navigation.navigate('ChargeDetails', { charge: item.charge })}
          >
            <Text style={styles.relatedLabel}>Charge</Text>
            <Text style={styles.relatedValue}>{item.charge.name || item.charge.weight}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteExercise(item.id)}>
          <Text style={styles.deleteButtonText}>Delete Exercise</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>Workout: {workout.title}</Text>
          <Text style={styles.notes}>{workout.notes || 'No notes'}</Text>
          <View style={styles.heroBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Duration</Text>
              <Text style={styles.badgeValue}>{workout.duration || 0} min</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Water</Text>
              <Text style={styles.badgeValue}>{workout.water_consumption || 0} L</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Type</Text>
              <Text style={styles.badgeValue}>{workout.is_rest_day ? 'Rest day' : 'Workout'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressRing}>
          <Text style={styles.progressValue}>{completionRate}%</Text>
          <Text style={styles.progressLabel}>Done</Text>
        </View>
      </View>

      <FlatList
        data={workout.exercises || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExercise}
        ListEmptyComponent={<Text style={styles.emptyText}>No exercises found.</Text>}
        scrollEnabled={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  heroCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    backgroundColor: '#171717',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 18,
    gap: 12,
  },
  header: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
    color: '#FF3B30',
    letterSpacing: 1,
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badgeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F1F1F',
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginTop: 4,
  },
  progressValue: { color: 'white', fontSize: 18, fontWeight: '900' },
  progressLabel: { color: '#FF3B30', fontSize: 11, fontWeight: '700' },
  cardBase: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#171717',
  },
  cardDone: {
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardPending: {
    borderColor: '#ff5c39',
    shadowColor: '#ff5c39',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },
  doneToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  doneToggleActive: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22c55e',
  },
  doneToggleInactive: {
    backgroundColor: 'rgba(255,92,57,0.12)',
    borderColor: '#ff5c39',
  },
  doneToggleText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  detailChip: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
  },
  detailChipLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailChipValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  orderInput: {
    color: 'white',
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#FF3B30',
    width: 60,
    paddingVertical: 4,
    textAlign: 'center',
  },
  achievementInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementInput: {
    color: 'white',
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#FF3B30',
    width: 60,
    paddingVertical: 4,
    textAlign: 'center',
  },
  achievementPercent: { color: '#FF3B30', fontWeight: '900' },
  achievementNote: {
    marginTop: 6,
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 12,
  },
  statusPill: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 90,
  },
  statusPillDone: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22c55e',
  },
  statusPillPending: {
    backgroundColor: 'rgba(255,92,57,0.12)',
    borderColor: '#ff5c39',
  },
  statusPillText: { color: 'white', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  relatedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 20,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  relatedLabel: {
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
  },
  relatedValue: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '900',
  },
  setsRepsContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  setsReps: {
    backgroundColor: '#FF3B30',
    color: '#121212',
    fontWeight: '900',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
    marginTop: 60,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 14,
    backgroundColor: '#1F1F1F',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '900',
    fontSize: 16,
  },
});

export default WorkoutDetailsScreen;
