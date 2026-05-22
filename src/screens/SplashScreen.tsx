import React, { useEffect, useCallback } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { styles } from './SplashScreen.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export function SplashScreenComponent() {
  const { t } = useTranslation();
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const startAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFFFF']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>{t('splash.title')}</Text>
        <Text style={styles.subtitle}>{t('splash.subtitle')}</Text>
        
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/fiestaa-logo.png')}
            style={styles.foodImage}
            resizeMode="contain"
          />
          <View style={styles.decorationLeft}>
            <Ionicons name="leaf" size={24} color="#22C55E" />
          </View>
          <View style={styles.decorationRight}>
            <Ionicons name="sunny" size={24} color="#F59E0B" />
          </View>
          <View style={styles.decorationBottom}>
            <Ionicons name="flame" size={24} color="#EF4444" />
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}