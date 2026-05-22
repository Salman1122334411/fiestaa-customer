import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from './OrderInstructionsScreen.styles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

type RouteParams = {
  OrderInstructions: {
    restaurantId: string;
  };
};

export function OrderInstructionsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'OrderInstructions'>>();
  const insets = useSafeAreaInsets();
  
  const { restaurantId } = route.params || {};
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);

  const storageKey = `order_instructions_${restaurantId || 'default'}`;

  // Load saved instructions on mount
  useEffect(() => {
    const loadInstructions = async () => {
      try {
        const savedText = await AsyncStorage.getItem(storageKey);
        if (savedText !== null) {
          setInstructions(savedText);
        }
      } catch (error) {
        console.error('Failed to load instructions from storage:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInstructions();
  }, [storageKey]);

  // Save instructions to storage and go back
  const handleSave = async () => {
    try {
      if (instructions.trim() === '') {
        await AsyncStorage.removeItem(storageKey);
      } else {
        await AsyncStorage.setItem(storageKey, instructions);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save instructions to storage:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('checkout.instructions_title', 'Order Instructions')}</Text>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.instructionLabel}>
            {t('checkout.instructions_label', 'Additional Instructions')}
          </Text>
          <Text style={styles.descriptionText}>
            {t('checkout.instructions_desc', 'Add any special requests, allergies, delivery drop-off directions or additional info for your order.')}
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder={t('checkout.instructions_placeholder', 'Write here... e.g. Ring the bell twice, allergy to peanuts, etc.')}
            value={instructions}
            onChangeText={setInstructions}
            maxLength={500}
            placeholderTextColor="#9CA3AF"
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default OrderInstructionsScreen;
