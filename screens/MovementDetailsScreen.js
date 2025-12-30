import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';

const MovementDetailsScreen = ({ route }) => {
  const { movement } = route.params;

  const openVideo = () => {
    if (movement.video_url) {
      Linking.openURL(movement.video_url).catch(() =>
        Alert.alert('Erreur', 'Impossible d\'ouvrir la video')
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>{movement.name || 'Sans nom'}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {movement.description || 'Aucune description disponible'}
        </Text>
      </View>

      {movement.video_url && (
        <TouchableOpacity style={styles.videoButton} onPress={openVideo}>
          <Text style={styles.videoButtonText}>Voir la video</Text>
          <Text style={styles.videoButtonSub}>S\'ouvre dans le navigateur</Text>
        </TouchableOpacity>
      )}

      {movement.exercises?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exercices associés</Text>
          {movement.exercises.map((ex) => (
            <View key={ex.id} style={styles.exerciseItem}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseInfo}>
                {ex.sets} séries × {ex.reps} reps
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  header: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#FF3B30', marginBottom: 12 },
  description: { fontSize: 16, color: '#DDD', lineHeight: 24 },
  videoButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 40,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  videoButtonText: { color: '#121212', fontSize: 16, fontWeight: '900' },
  videoButtonSub: { color: '#121212', fontSize: 12, fontWeight: '700', marginTop: 4 },
  exerciseItem: {
    backgroundColor: '#2A2A2A',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  exerciseName: { fontSize: 16, fontWeight: '900', color: '#1E90FF', marginBottom: 6 },
  exerciseInfo: { fontSize: 14, color: '#CCC' },
});

export default MovementDetailsScreen;
