import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultLang } from '../../localization';

/**
 * Simple hook to load/save the user's language preference.
 */
export const useLanguage = () => {
  const [language, setLanguage] = useState(defaultLang);
  const [loadingLanguage, setLoadingLanguage] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_language');
        if (stored) setLanguage(stored);
      } catch (e) {
        // ignore
      } finally {
        setLoadingLanguage(false);
      }
    })();
  }, []);

  const changeLanguage = async (code) => {
    setLanguage(code);
    try {
      await AsyncStorage.setItem('app_language', code);
    } catch (e) {
      // ignore
    }
  };

  return { language, changeLanguage, loadingLanguage };
};

export default useLanguage;
