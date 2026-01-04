import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { authAPI, tokenService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // Check for minimum length, at least one number, one uppercase, one lowercase
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    
    return {
      valid: minLength && hasNumber && hasUpper && hasLower,
      errors: {
        minLength,
        hasNumber,
        hasUpper,
        hasLower
      }
    };
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data;
      
      // Save both token and user data
      await tokenService.setToken(token);
      await AsyncStorage.setItem('userId', user.id.toString());
      await AsyncStorage.setItem('userName', user.name);
      await AsyncStorage.setItem('userEmail', user.email);
      
      // Set global variables for immediate use
      global.authToken = token;
      global.userId = user.id;
      global.userName = user.name;
      
      navigation.replace('Home');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      let errorMessage = 'Password must contain:\n';
      if (!passwordValidation.errors.minLength) errorMessage += '• At least 8 characters\n';
      if (!passwordValidation.errors.hasNumber) errorMessage += '• At least one number\n';
      if (!passwordValidation.errors.hasUpper) errorMessage += '• At least one uppercase letter\n';
      if (!passwordValidation.errors.hasLower) errorMessage += '• At least one lowercase letter\n';
      
      Alert.alert('Error', errorMessage);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({ 
        name, 
        email, 
        password, 
        password_confirmation: confirmPassword 
      });
      const { user, token } = response.data;
      
      // Save both token and user data
      await tokenService.setToken(token);
      await AsyncStorage.setItem('userId', user.id.toString());
      await AsyncStorage.setItem('userName', user.name);
      await AsyncStorage.setItem('userEmail', user.email);
      
      // Set global variables for immediate use
      global.authToken = token;
      global.userId = user.id;
      global.userName = user.name;
      
      navigation.replace('Home');
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anas Plus</Text>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, isLogin && styles.activeToggle]}
          onPress={() => setIsLogin(true)}
        >
          <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, !isLogin && styles.activeToggle]}
          onPress={() => setIsLogin(false)}
        >
          <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>Register</Text>
        </TouchableOpacity>
      </View>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      {!isLogin && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password"
          />
          <Text style={styles.passwordHint}>
            Password must be at least 8 characters with uppercase, lowercase, and number
          </Text>
        </>
      )}
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={isLogin ? handleLogin : handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>by Triki Ghofrane · 2025</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: '#121212', // dark background for energy & focus
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#FF3B30', // energetic red accent color
    textShadowColor: '#900000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 2,
    fontFamily: 'System', // can customize with a sporty font if you want
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignSelf: 'center',
    width: '80%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  activeToggle: {
    backgroundColor: '#FF3B30',
  },
  toggleText: {
    color: '#BBBBBB',
    fontWeight: '600',
    fontSize: 18,
  },
  activeToggleText: {
    color: 'white',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#222',
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  passwordHint: {
    fontSize: 13,
    color: '#FF6F61',
    marginBottom: 20,
    paddingHorizontal: 5,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF3B30',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#5a5a5a',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerNote: {
    marginTop: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
});


export default AuthScreen;
