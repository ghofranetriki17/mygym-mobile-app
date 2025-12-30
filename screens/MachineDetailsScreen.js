import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image,
  TouchableOpacity,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const MachineDetailScreen = ({ route }) => {
  const { machine } = route.params;

  const openVideo = () => {
    if (machine.video_url) {
      Linking.openURL(machine.video_url);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {machine.image_url && (
        <Image 
          source={{ uri: machine.image_url }} 
          style={styles.machineImage} 
          resizeMode="cover"
        />
      )}
      
      <View style={styles.header}>
        <Text style={styles.machineName}>{machine.name}</Text>
        <Text style={styles.machineType}>{machine.type}</Text>
        
        {machine.description && (
          <Text style={styles.machineDescription}>{machine.description}</Text>
        )}
      </View>


      {machine.video_url && (
        <TouchableOpacity style={styles.videoButton} activeOpacity={0.8} onPress={openVideo}>
          <Icon name="play-circle" size={22} color="#FF3B30" />
          <Text style={styles.videoButtonText}>Voir la vidéo de démonstration</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212', // dark background
  },
  machineImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
  },
  header: {
    marginBottom: 25,
  },
  machineName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 6,
    letterSpacing: 1,
  },
  machineType: {
    fontSize: 18,
    color: '#CCCCCC',
    marginBottom: 12,
  },
  machineDescription: {
    fontSize: 16,
    color: '#AAAAAA',
    lineHeight: 24,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#1E1E1E',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FF3B30',
  },
  chargeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  chargeText: {
    fontSize: 16,
    marginLeft: 14,
    color: '#CCCCCC',
  },
  noDataText: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 10,
  },
  videoButtonText: {
    fontSize: 18,
    color: '#FF3B30',
    marginLeft: 14,
    fontWeight: '600',
  },
});

export default MachineDetailScreen;
