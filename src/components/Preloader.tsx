import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Image } from 'react-native';
import { Colors } from '../constants/Colors';

interface PreloaderProps {
  fullScreen?: boolean;
  size?: number;
  label?: string;
}

// Reusable shimmer skeleton for a restaurant card
export const RestaurantCardSkeleton: React.FC = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.skeletonMeta} />
      </View>
    </Animated.View>
  );
};

// Three-dot pulse wave loader (professional, branded)
export const PulseDotsLoader: React.FC<{ color?: string; size?: number }> = ({
  color = Colors.primary,
  size = 12,
}) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const makePulse = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

  useEffect(() => {
    Animated.parallel([
      makePulse(dot1, 0),
      makePulse(dot2, 150),
      makePulse(dot3, 300),
    ]).start();
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: size * 0.4,
    transform: [{ translateY: anim }],
  });

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

// Full-screen branded loader
const Preloader: React.FC<PreloaderProps> = ({
  fullScreen = true,
  label,
}) => {
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const content = (
    <View style={styles.content}>
      <Animated.Image
        source={require('../../assets/fiestaa-logo.png')}
        style={[
          styles.logo,
          { opacity: logoFade, transform: [{ scale: logoScale }] },
        ]}
        resizeMode="contain"
      />
      <View style={styles.dotsWrapper}>
        <PulseDotsLoader />
      </View>
      {label ? (
        <Animated.Text style={[styles.label, { opacity: logoFade }]}>
          {label}
        </Animated.Text>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreenContainer}>{content}</View>;
  }

  return content;
};

export default Preloader;

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 28,
  },
  dotsWrapper: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },

  // Skeleton card styles
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  skeletonImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  skeletonBody: {
    padding: 16,
    gap: 10,
  },
  skeletonTitle: {
    height: 16,
    width: '60%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  skeletonSubtitle: {
    height: 12,
    width: '40%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  skeletonMeta: {
    height: 12,
    width: '30%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 4,
  },
});
