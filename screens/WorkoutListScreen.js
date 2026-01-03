import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { workoutAPI, exerciseAPI, machineAPI, branchAPI } from '../services/api';

const WorkoutListScreen = ({ navigation }) => {
  // États généraux
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' ou 'oldest'

  // États modal création workout
  const [modalWorkoutVisible, setModalWorkoutVisible] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    title: '',
    notes: '',
    duration: '',
    water_consumption: '',
  });

  // États modal création exercise
  const [modalExerciseVisible, setModalExerciseVisible] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);

  // Form exercise
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', order: '' });
  const [coachName, setCoachName] = useState('');
  const [instructions, setInstructions] = useState('');

  // Datas machines, mouvements, charges
  const [machines, setMachines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [charges, setCharges] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [trainingLocation, setTrainingLocation] = useState(null); // 'home' or 'branch'
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // États d'enregistrement
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savingExercise, setSavingExercise] = useState(false);

  // Chargement des workouts
  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Charge branches + mouvements + reset form exercise quand le modal s'ouvre
  useEffect(() => {
    if (modalExerciseVisible) {
      loadBranches();
      loadMovements();
      resetExerciseForm();
    }
  }, [modalExerciseVisible]);

  // Charge charges quand une machine est sélectionnée
  useEffect(() => {
    if (selectedMachine) {
      loadCharges(selectedMachine.id);
    } else {
      setCharges([]);
      setSelectedCharge(null);
    }
  }, [selectedMachine]);

  // Filtered and sorted workouts avec useMemo pour optimisation
  const filteredAndSortedWorkouts = useMemo(() => {
    let filtered = workouts;

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = workouts.filter(workout => 
        workout.title.toLowerCase().includes(query) ||
        (workout.notes && workout.notes.toLowerCase().includes(query)) ||
        (workout.date && workout.date.toLowerCase().includes(query))
      );
    }

    // Trier par date
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0);
      const dateB = new Date(b.date || b.created_at || 0);
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Plus récent en premier
      } else {
        return dateA - dateB; // Plus ancien en premier
      }
    });

    return sorted;
  }, [workouts, searchQuery, sortOrder]);

  const formatWorkoutDate = (workout) => {
    const raw = workout.date || workout.created_at;
    if (!raw) return 'Date N/A';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return raw;
    }
  };

  // Fonction fetch workouts
  const fetchWorkouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workoutAPI.getAll();
      setWorkouts(data);
    } catch (e) {
      setError('Failed to load workouts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load branches pour choix de localisation
  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await branchAPI.getAll();
      setBranches(response.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Load machines selon localisation (home = toutes, branch = filtrées)
  const loadMachinesForLocation = async (branchId = null) => {
    setLoadingMachines(true);
    try {
      let data;
      if (branchId) {
        const response = await machineAPI.getByBranch(branchId);
        data = response.data?.data || response.data || [];
      } else {
        data = await machineAPI.getAll();
      }
      setMachines(data);
      setSelectedMachine(null);
      setCharges([]);
      setSelectedCharge(null);
    } catch {
      Alert.alert('Error', 'Failed to load machines');
      setMachines([]);
    } finally {
      setLoadingMachines(false);
    }
  };

  // Load coaches pour branch sélectionnée
  const loadCoachesForBranch = async (branchId) => {
    setLoadingCoaches(true);
    try {
      const data = await branchAPI.getCoaches(branchId);
      const list =
        (Array.isArray(data?.data?.data) && data?.data?.data) ||
        (Array.isArray(data?.data) && data?.data) ||
        (Array.isArray(data) && data) ||
        [];
      setCoaches(list);
    } catch {
      Alert.alert('Error', 'Failed to load coaches for this branch');
      setCoaches([]);
    } finally {
      setLoadingCoaches(false);
    }
  };

  // Load movements pour exercise form
  const loadMovements = async () => {
    try {
      const data = await exerciseAPI.getMovements();
      setMovements(data);
    } catch {
      Alert.alert('Error', 'Failed to load movements');
    }
  };

  // Load charges selon machine sélectionnée
  const loadCharges = async (machineId) => {
    setLoadingCharges(true);
    try {
      const data = await exerciseAPI.getChargesForMachine(machineId);
      setCharges(data);
    } catch {
      Alert.alert('Error', 'Failed to load charges for selected machine');
    } finally {
      setLoadingCharges(false);
    }
  };

  // Reset formulaire création exercise
  const resetExerciseForm = () => {
    setNewExercise({ name: '', sets: '', reps: '' });
    setCoachName('');
    setInstructions('');
    setSelectedMachine(null);
    setSelectedMovement(null);
    setSelectedCharge(null);
    setSelectedCoach(null);
    setSelectedBranch(null);
    setTrainingLocation(null);
    setMachines([]);
    setCharges([]);
    setCoaches([]);
  };

  // Reset formulaire création workout
  const resetWorkoutForm = () => {
    setNewWorkout({
      title: '',
      notes: '',
      duration: '',
      water_consumption: '',
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  // Gestion input workout
  const handleWorkoutInputChange = (field, value) => {
    setNewWorkout((prev) => ({ ...prev, [field]: value }));
  };

  // Gestion input exercise
  const handleExerciseInputChange = (field, value) => {
    setNewExercise((prev) => ({ ...prev, [field]: value }));
  };

  // Gestion localisation pour machines
  const handleSelectHome = () => {
    setTrainingLocation('home');
    setSelectedBranch(null);
    setSelectedCoach(null);
    setCoachName('');
    setCoaches([]);
    loadMachinesForLocation(null);
  };

  const handleSelectBranch = (branch) => {
    setTrainingLocation('branch');
    setSelectedBranch(branch);
    setSelectedCoach(null);
    setCoachName('');
    loadMachinesForLocation(branch.id);
    loadCoachesForBranch(branch.id);
  };

  // Création workout
  const createWorkout = async () => {
    if (!newWorkout.title.trim()) {
      Alert.alert('Validation', 'Le titre du workout est requis');
      return;
    }
    setSavingWorkout(true);
    try {
      await workoutAPI.create({
        title: newWorkout.title.trim(),
        notes: newWorkout.notes.trim() || null,
        duration: Number(newWorkout.duration) || null,
        water_consumption: Number(newWorkout.water_consumption) || null,
      });
      Alert.alert('Succès', 'Workout créé avec succès');
      setModalWorkoutVisible(false);
      resetWorkoutForm();
      fetchWorkouts();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le workout');
    } finally {
      setSavingWorkout(false);
    }
  };

  // Création + attachement exercice au workout sélectionné
  const createAndAttachExercise = async () => {
    if (!selectedWorkoutId) {
      Alert.alert('Validation', 'Veuillez sélectionner un workout d\'abord');
      return;
    }
    if (!newExercise.name.trim() || !newExercise.sets || !newExercise.reps) {
      Alert.alert('Validation', 'Nom, sets et reps sont requis pour l\'exercice');
      return;
    }

    setSavingExercise(true);

    const exerciseData = {
      name: newExercise.name.trim(),
      title: coachName.trim() || null, // stored as text for traceability
      sets: Number(newExercise.sets),
      reps: Number(newExercise.reps),
      machine_id: selectedMachine ? selectedMachine.id : null,
      movement_id: selectedMovement ? selectedMovement.id : null,
      charge_id: selectedCharge ? selectedCharge.id : null,
      instructions: instructions.trim() || null,
    };

    try {
      // 1. Créer l'exercice
      const createdExercise = await exerciseAPI.create(exerciseData);
      // 2. Attacher à workout sélectionné
      await workoutAPI.attachExerciseToWorkout(Number(selectedWorkoutId), createdExercise.id);

      Alert.alert('Succès', 'Exercice créé et attaché avec succès');
      setModalExerciseVisible(false);
      resetExerciseForm();
      fetchWorkouts();
    } catch (e) {
      Alert.alert('Erreur', "Impossible de créer ou attacher l'exercice");
    } finally {
      setSavingExercise(false);
    }
  };

  // Composant SelectInput simple
  const SelectInput = ({ label, data, selectedValue, onSelect, keyExtractor, labelExtractor, emptyMessage }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        style={styles.selectContainerScroll}
        contentContainerStyle={styles.selectContainerContent}
        nestedScrollEnabled={true}
        horizontal={false}
      >
        {data.length === 0 ? (
          <Text style={styles.noDataText}>{emptyMessage || 'No options available'}</Text>
        ) : (
          data.map((item) => {
            const key = String(keyExtractor(item));
            const selected = selectedValue?.id === keyExtractor(item);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {labelExtractor(item)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // Rendu d'un workout dans la liste
  const renderWorkoutItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.workoutCard,
        selectedWorkoutId === item.id && { borderColor: '#1E90FF', borderWidth: 3 },
      ]}
      onPress={() => setSelectedWorkoutId(item.id)}         // tap simple = sélection
      onLongPress={() => navigation.navigate('WorkoutDetails', { workout: item })}
      activeOpacity={0.85}
    >
      <View style={styles.cardIconContainer}>
        <Icon name="dumbbell" size={28} color="#FF3B30" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.workoutTitle}>{item.title.toUpperCase()}</Text>
        <Text style={styles.workoutDate}>{formatWorkoutDate(item)}</Text>
        <Text style={styles.workoutNotes} numberOfLines={2}>
          "{item.notes || 'No notes'}"
        </Text>
        <View style={styles.metaRow}>
          {item.duration ? (
            <View style={styles.metaPill}>
              <Icon name="stopwatch" size={12} color="#FF3B30" />
              <Text style={styles.metaText}>{item.duration} min</Text>
            </View>
          ) : null}
          {item.water_consumption ? (
            <View style={styles.metaPill}>
              <Icon name="tint" size={12} color="#1E90FF" />
              <Text style={styles.metaText}>{item.water_consumption} L</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Icon name="chevron-right" size={22} color="#FF3B30" />
    </TouchableOpacity>
  );

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
        <TouchableOpacity style={styles.retryButton} onPress={fetchWorkouts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MY WORKOUTS</Text>
      <Text style={styles.subTitle}>Curated list of your sessions with quick stats</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#FF3B30"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Icon name="times-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Sort Button */}
        <TouchableOpacity style={styles.sortButton} onPress={toggleSortOrder}>
          <Icon 
            name={sortOrder === 'newest' ? 'sort-amount-down' : 'sort-amount-up'} 
            size={16} 
            color="#FF3B30" 
          />
          <Text style={styles.sortButtonText}>
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results counter */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredAndSortedWorkouts.length} workout{filteredAndSortedWorkouts.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredAndSortedWorkouts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWorkoutItem}
        contentContainerStyle={{ paddingBottom: 30 }}
        extraData={selectedWorkoutId}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="search" size={50} color="#555" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No workouts match your search' : 'No workouts found'}
            </Text>
            {searchQuery.trim() && (
              <TouchableOpacity style={styles.clearSearchButtonLarge} onPress={clearSearch}>
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Bouton créer un workout */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalWorkoutVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={18} color="#121212" />
        <Text style={styles.addButtonText}>Create Workout</Text>
      </TouchableOpacity>

      {/* Bouton créer et attacher exercice */}
      <TouchableOpacity
        style={[styles.addButton, !selectedWorkoutId && { backgroundColor: '#888' }]}
        onPress={() => {
          if (selectedWorkoutId) {
            setModalExerciseVisible(true);
          } else {
            Alert.alert('Please select a workout first.');
          }
        }}
        activeOpacity={selectedWorkoutId ? 0.8 : 1}
        disabled={!selectedWorkoutId}
      >
        <Icon name="plus" size={18} color="#121212" />
        <Text style={styles.addButtonText}>Create & Attach Exercise</Text>
      </TouchableOpacity>

      {/* Modal création workout */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalWorkoutVisible}
        onRequestClose={() => setModalWorkoutVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create New Workout</Text>

                <View style={styles.inputWithIcon}>
                  <Icon name="dumbbell" size={18} color="#FF3B30" />
                  <TextInput
                    style={styles.input}
                    placeholder="Title *"
                    placeholderTextColor="#999"
                    value={newWorkout.title}
                    onChangeText={(text) => handleWorkoutInputChange('title', text)}
                    returnKeyType="next"
                    selectionColor="#FF3B30"
                    autoFocus
                  />
                </View>

                <View style={[styles.inputWithIcon, { height: 90 }]}>
                  <Icon name="sticky-note" size={18} color="#FF3B30" />
                  <TextInput
                    style={[styles.input, { height: 90 }]}
                    placeholder="Notes"
                    placeholderTextColor="#999"
                    value={newWorkout.notes}
                    onChangeText={(text) => handleWorkoutInputChange('notes', text)}
                    multiline
                    returnKeyType="next"
                    selectionColor="#FF3B30"
                  />
                </View>

                <View style={styles.inputWithIcon}>
                  <Icon name="stopwatch" size={18} color="#FF3B30" />
                  <TextInput
                    style={styles.input}
                    placeholder="Duration (minutes)"
                    placeholderTextColor="#999"
                    value={newWorkout.duration}
                    onChangeText={(text) => handleWorkoutInputChange('duration', text)}
                    keyboardType="numeric"
                    returnKeyType="next"
                    selectionColor="#FF3B30"
                  />
                </View>

                <View style={styles.inputWithIcon}>
                  <Icon name="tint" size={18} color="#1E90FF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Water consumption (L)"
                    placeholderTextColor="#999"
                    value={newWorkout.water_consumption}
                    onChangeText={(text) => handleWorkoutInputChange('water_consumption', text)}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={createWorkout}
                    selectionColor="#FF3B30"
                  />
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={() => setModalWorkoutVisible(false)}
                    style={[styles.modalButton, styles.cancelButton]}
                    activeOpacity={0.8}
                    disabled={savingWorkout}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createWorkout}
                    style={[styles.modalButton, styles.saveButton]}
                    activeOpacity={0.8}
                    disabled={savingWorkout}
                  >
                    {savingWorkout ? (
                      <ActivityIndicator color="#121212" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal création exercise */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalExerciseVisible}
        onRequestClose={() => setModalExerciseVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Exercise</Text>
                <Text style={{ color: 'white', marginBottom: 10 }}>
                  Selected Workout ID: {selectedWorkoutId || 'None'}
                </Text>

                {/* Exercise Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Exercise Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter exercise name"
                    placeholderTextColor="#999"
                    value={newExercise.name}
                    onChangeText={(text) => handleExerciseInputChange('name', text)}
                    autoFocus
                    selectionColor="#FF3B30"
                  />
                </View>

                {/* Localisation pour filtrer les machines */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Where are you training?</Text>
                  <View style={styles.locationButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.locationButton,
                        trainingLocation === 'home' && styles.locationButtonActive,
                      ]}
                      onPress={handleSelectHome}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name="home"
                        size={16}
                        color={trainingLocation === 'home' ? '#121212' : '#FF3B30'}
                      />
                      <Text
                        style={[
                          styles.locationButtonText,
                          trainingLocation === 'home' && styles.locationButtonTextActive,
                        ]}
                      >
                        At Home
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    Pick your branch to see its machines, or choose Home to load everything.
                  </Text>
                </View>

                {loadingBranches ? (
                  <ActivityIndicator size="small" color="#FF3B30" style={{ marginBottom: 12 }} />
                ) : (
                  <SelectInput
                    label="Select Branch (gym)"
                    data={branches}
                    selectedValue={selectedBranch}
                    onSelect={handleSelectBranch}
                    keyExtractor={(item) => item.id}
                    labelExtractor={(item) => item.name || `Branch ${item.id}`}
                    emptyMessage="No branches available"
                  />
                )}

                {/* Coach name (for traceability, no relation) */}
                {trainingLocation === 'branch' && (
                  loadingCoaches ? (
                    <ActivityIndicator size="small" color="#FF3B30" style={{ marginVertical: 10 }} />
                  ) : (
                    <SelectInput
                      label="Coach Name (select)"
                      data={coaches}
                      selectedValue={selectedCoach}
                      onSelect={(coach) => {
                        setSelectedCoach(coach);
                        setCoachName(coach.name || coach.full_name || '');
                      }}
                      keyExtractor={(item) => item.id}
                      labelExtractor={(item) => item.name || item.full_name || `Coach ${item.id}`}
                      emptyMessage={selectedBranch ? 'No coaches for this branch' : 'Select a branch first'}
                    />
                  )
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Coach Name (manual)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter coach name or type your own"
                    placeholderTextColor="#999"
                    value={coachName}
                    onChangeText={(text) => {
                      setCoachName(text);
                      setSelectedCoach(null);
                    }}
                    selectionColor="#FF3B30"
                  />
                  <Text style={styles.helperText}>Selection is stored as plain text for traceability.</Text>
                </View>

                {/* Select Machine */}
                {loadingMachines ? (
                  <ActivityIndicator size="small" color="#FF3B30" style={{ marginVertical: 10 }} />
                ) : (
                  <SelectInput
                    label="Select Machine"
                    data={machines}
                    selectedValue={selectedMachine}
                    onSelect={setSelectedMachine}
                    keyExtractor={(item) => item.id}
                    labelExtractor={(item) => item.name}
                    emptyMessage={
                      trainingLocation
                        ? 'No machines available for this location'
                        : 'Select where you are training to load machines'
                    }
                  />
                )}

                {/* Select Movement */}
                <SelectInput
                  label="Select Movement"
                  data={movements}
                  selectedValue={selectedMovement}
                  onSelect={setSelectedMovement}
                  keyExtractor={(item) => item.id}
                  labelExtractor={(item) => item.name || item.title || `Movement ${item.id}`}
                />

                {/* Select Charge */}
                {loadingCharges ? (
                  <ActivityIndicator size="small" color="#FF3B30" style={{ marginVertical: 10 }} />
                ) : (
                  <SelectInput
                    label="Select Charge"
                    data={charges}
                    selectedValue={selectedCharge}
                    onSelect={setSelectedCharge}
                    keyExtractor={(item) => item.id}
                    labelExtractor={(item) => `${item.weight || 0} kg`}
                  />
                )}

                {/* Sets and Reps */}
                <View style={styles.inputGroupRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Sets *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Sets"
                      placeholderTextColor="#999"
                      value={newExercise.sets}
                      onChangeText={(text) => handleExerciseInputChange('sets', text)}
                      keyboardType="numeric"
                      selectionColor="#FF3B30"
                    />
                  </View>
                  
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Reps *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Reps"
                      placeholderTextColor="#999"
                      value={newExercise.reps}
                      onChangeText={(text) => handleExerciseInputChange('reps', text)}
                      keyboardType="numeric"
                      selectionColor="#FF3B30"
                    />
                  </View>
                </View>

                {/* Instructions */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Instructions (optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    placeholder="Enter instructions"
                    placeholderTextColor="#999"
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    numberOfLines={4}
                    selectionColor="#FF3B30"
                  />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: '#ccc' }]}
                    onPress={() => setModalExerciseVisible(false)}
                    disabled={savingExercise}
                  >
                    <Text style={[styles.submitButtonText, { color: '#333' }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={createAndAttachExercise}
                    disabled={savingExercise}
                  >
                    {savingExercise ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Add Exercise</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 15,
    color: '#FF3B30',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 18,
  },

  // --- NEW SEARCH & SORT STYLES ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 5,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  sortButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  resultsContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  resultsText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#777',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 15,
    textAlign: 'center',
  },
  clearSearchButtonLarge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  clearSearchButtonText: {
    color: '#121212',
    fontWeight: '700',
    fontSize: 16,
  },

  workoutCard: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    padding: 18,
    marginBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  workoutTitle: { fontSize: 20, fontWeight: '900', color: '#FF3B30', marginBottom: 6 },
  workoutDate: { fontSize: 14, color: '#CCCCCC', marginBottom: 8, fontWeight: '600' },
  workoutNotes: { fontSize: 13, fontStyle: 'italic', color: '#999', marginBottom: 6 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metaText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 40,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  addButtonText: { color: '#121212', fontWeight: '900', fontSize: 20, marginLeft: 10 },
  errorText: { color: '#FF6F61', fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: '700' },
  retryButton: { backgroundColor: '#FF3B30', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  retryButtonText: { color: '#121212', fontWeight: '900', fontSize: 18 },

  // Modal
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.43,
    shadowRadius: 9.51,
    elevation: 15,
  },
  modalTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20, color: '#FF3B30', textAlign: 'center' },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderRadius: 40,
    backgroundColor: '#2A2A2A',
    fontWeight: '600',
    fontSize: 17,
    marginLeft: 10,
  },

  inputGroup: { marginBottom: 15 },
  label: { fontWeight: '700', color: '#FF3B30', marginBottom: 6, fontSize: 15 },

  inputGroupRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  inputHalf: { flex: 1, marginRight: 10 },
  submitButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 40,
    width: '48%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: { fontWeight: '900', fontSize: 18, color: '#fff' },

  cancelButton: { backgroundColor: '#333' },
  cancelButtonText: { fontWeight: '900', fontSize: 18, color: '#999' },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },

  // Localisation (home / branch)
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  locationButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  locationButtonText: {
    color: '#E5E7EB',
    fontWeight: '800',
    fontSize: 15,
  },
  locationButtonTextActive: {
    color: '#121212',
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },

  // --- UPDATED SELECT INPUT STYLE (machines, movements, charges) ---
  selectContainerScroll: {
    maxHeight: 140,
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectContainerContent: {
    paddingVertical: 4,
    flexDirection: 'row',      // horizontal layout for pills
    flexWrap: 'wrap',          // wrap pills to next line if needed
    justifyContent: 'flex-start',
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 6,
    marginHorizontal: 6,
    backgroundColor: '#3A3A3A',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    alignSelf: 'flex-start',
  },
  optionSelected: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  optionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#121212',
    fontWeight: '900',
  },

  noDataText: { color: '#777', textAlign: 'center', fontStyle: 'italic' },
});


export default WorkoutListScreen;
