import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import BranchDetailScreen from './screens/BranchDetailScreen';
import MachineListScreen from './screens/MachineListScreen';
import MachineDetailScreen from './screens/MachineDetailScreen';
import UserProgressScreen from './screens/UserProgressScreen'; // Correct path
import WorkoutListScreen from './screens/WorkoutListScreen';
import WorkoutDetailsScreen from './screens/WorkoutDetailsScreen';
import ExerciseDetailsScreen from './screens/ExerciseDetailsScreen';
import MachineDetailsScreen from './screens/MachineDetailsScreen';
import MovementDetailsScreen from './screens/MovementDetailsScreen';
import AddExerciseScreen from './screens/AddExerciseScreen';
import CoachDetailScreen from './screens/CoachDetailScreen';
import SessionDetail from './screens/SessionDetail';
import BranchMapScreen from './screens/BranchMapScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProgrammesScreen from './screens/ProgrammesScreen';
import ProgrammeDetailScreen from './screens/ProgrammeDetailScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Our Branches' }} 
        />
        <Stack.Screen
          name="BranchMap"
          component={BranchMapScreen}
          options={{ title: 'Map view' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
        
<Stack.Screen
  name="WorkoutList"
  component={WorkoutListScreen}
  options={{ title: 'My Workouts' }}
/>
<Stack.Screen
  name="Programmes"
  component={ProgrammesScreen}
  options={{ title: 'Programmes' }}
/>

<Stack.Screen
  name="ProgrammeDetail"
  component={ProgrammeDetailScreen}
  options={{ title: 'Programme Details' }}
/>

        <Stack.Screen 
          name="BranchDetail" 
          component={BranchDetailScreen} 
          options={({ route }) => ({ title: route.params.branch.name })} 
        />
          <Stack.Screen 
          name="MachineDetails" 
          component={MachineDetailsScreen} 
        />
        <Stack.Screen
  name="WorkoutDetails"
  component={WorkoutDetailsScreen}
  options={{ title: 'Workout Details' }}
/>
<Stack.Screen 
  name="ExerciseDetails" 
  component={ExerciseDetailsScreen} 
  options={{ title: 'Exercise Details' }} 
/>
 <Stack.Screen 
          name="SessionDetail" 
          component={SessionDetail} 
          options={{ title: 'Détails de la session' }}
        />
<Stack.Screen name="CoachDetail" component={CoachDetailScreen} />

       <Stack.Screen 
          name="MachineList" 
          component={MachineListScreen} 
          options={({ route }) => ({ title: `${route.params.branch.name} Machines` })}
        />
         <Stack.Screen 
    name="MovementDetails" 
    component={MovementDetailsScreen} 
    options={{ title: 'Movement Details' }}
  />
        <Stack.Screen 
          name="MachineDetail" 
          component={MachineDetailScreen} 
          options={({ route }) => ({ title: route.params.machine.name })}
        />
        <Stack.Screen name="UserProgress" component={UserProgressScreen} />
<Stack.Screen name="AddExercise" component={AddExerciseScreen} />

      </Stack.Navigator>
      
    </NavigationContainer>
  );
}
