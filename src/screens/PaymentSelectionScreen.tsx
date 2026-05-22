import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { styles } from './PaymentSelectionScreen.styles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Wallet, CreditCard } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';

type RouteParams = {
  PaymentSelection: {
    restaurantId: string;
  };
};

export function PaymentSelectionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PaymentSelection'>>();
  const insets = useSafeAreaInsets();
  
  const { restaurantId } = route.params || {};
  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [loading, setLoading] = useState(true);

  const storageKey = `payment_method_${restaurantId || 'default'}`;

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedMethod = await AsyncStorage.getItem(storageKey);
        if (savedMethod !== null) {
          setSelectedMethod(savedMethod);
        }
      } catch (error) {
        console.error('Failed to load payment method:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreference();
  }, [storageKey]);

  // Save selection and go back
  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(storageKey, selectedMethod);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save payment method:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('checkout.payment_title', 'Payment Method')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionLabel}>
          {t('checkout.choose_payment_method', 'Choose Payment Method')}
        </Text>
        <Text style={styles.descriptionText}>
          {t('checkout.choose_payment_desc', 'Please select how you would like to pay for this order.')}
        </Text>

        {/* COD Card */}
        <TouchableOpacity
          style={[styles.optionCard, selectedMethod === 'cod' && styles.activeOptionCard]}
          onPress={() => setSelectedMethod('cod')}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconContainer, selectedMethod === 'cod' && styles.activeOptionIconContainer]}>
            <Wallet size={20} color={selectedMethod === 'cod' ? BrandColors.primary : '#4B5563'} strokeWidth={2.2} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>{t('checkout.cod', 'Cash on Delivery (COD)')}</Text>
            <Text style={styles.optionSub}>{t('checkout.cod_subtitle', 'Pay with cash upon arrival')}</Text>
          </View>
          <View style={[styles.radioOuter, selectedMethod === 'cod' && styles.radioOuterSelected]}>
            {selectedMethod === 'cod' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Card */}
        <TouchableOpacity
          style={[styles.optionCard, selectedMethod === 'card' && styles.activeOptionCard]}
          onPress={() => setSelectedMethod('card')}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconContainer, selectedMethod === 'card' && styles.activeOptionIconContainer]}>
            <CreditCard size={20} color={selectedMethod === 'card' ? BrandColors.primary : '#4B5563'} strokeWidth={2.2} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>{t('checkout.card', 'Card')}</Text>
            <Text style={styles.optionSub}>{t('checkout.card_subtitle', 'Pay securely using VISA ...4564')}</Text>
          </View>
          <View style={[styles.radioOuter, selectedMethod === 'card' && styles.radioOuterSelected]}>
            {selectedMethod === 'card' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PaymentSelectionScreen;
