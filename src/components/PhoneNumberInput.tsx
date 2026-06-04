import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as BrandColors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { AsYouType, parsePhoneNumber, CountryCode } from 'libphonenumber-js';

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: (Country & { labelKey: string })[] = [
  { name: 'Australia', labelKey: 'countries.AU', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Austria', labelKey: 'countries.AT', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', labelKey: 'countries.AZ', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Bahrain', labelKey: 'countries.BH', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Belarus', labelKey: 'countries.BY', code: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Canada', labelKey: 'countries.CA', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Cyprus', labelKey: 'countries.CY', code: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { name: 'Egypt', labelKey: 'countries.EG', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'France', labelKey: 'countries.FR', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Georgia', labelKey: 'countries.GE', code: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Germany', labelKey: 'countries.DE', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'Iran', labelKey: 'countries.IR', code: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Ireland', labelKey: 'countries.IE', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Jordan', labelKey: 'countries.JO', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', labelKey: 'countries.KZ', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kuwait', labelKey: 'countries.KW', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Latvia', labelKey: 'countries.LV', code: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', labelKey: 'countries.LB', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Moldova', labelKey: 'countries.MD', code: 'MD', dialCode: '+373', flag: '🇲🇩' },
  { name: 'Netherlands', labelKey: 'countries.NL', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', labelKey: 'countries.NZ', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Oman', labelKey: 'countries.OM', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', labelKey: 'countries.PK', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Qatar', labelKey: 'countries.QA', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Russia', labelKey: 'countries.RU', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', labelKey: 'countries.SA', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Singapore', labelKey: 'countries.SG', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Syria', labelKey: 'countries.SY', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Turkey', labelKey: 'countries.TR', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Ukraine', labelKey: 'countries.UA', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', labelKey: 'countries.AE', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', labelKey: 'countries.GB', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'United States', labelKey: 'countries.US', code: 'US', dialCode: '+1', flag: '🇺🇸' },
];

interface PhoneNumberInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  error?: string;
  editable?: boolean;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  placeholder,
  error,
  editable = true,
}) => {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<(Country & { labelKey: string })>(
    COUNTRIES.find((c) => c.code === 'PK') ?? COUNTRIES[0]
  );
  const [localNumber, setLocalNumber] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync value when it changes
  useEffect(() => {
    if (value) {
      try {
        const normalized = value.startsWith('+') ? value : `+${value.replace(/^\+/, '')}`;
        const phoneNumber = parsePhoneNumber(normalized);
        if (phoneNumber && phoneNumber.country) {
          const matched = COUNTRIES.find((c) => c.code === phoneNumber.country);
          if (matched) {
            setSelectedCountry(matched);
            setLocalNumber(phoneNumber.formatNational());
            return;
          }
        }
      } catch (e) {
        // Fallback to manual matching
      }

      // Fallback matching
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sortedCountries.find((c) => value.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        const national = value.slice(matched.dialCode.length);
        setLocalNumber(new AsYouType(matched.code as CountryCode).input(national));
      } else {
        setLocalNumber(value);
      }
    } else {
      setLocalNumber('');
    }
  }, [value]);

  const handleCountrySelect = (country: (Country & { labelKey: string })) => {
    setSelectedCountry(country);
    setIsModalVisible(false);
    setSearchQuery('');
    
    // Re-format existing number for the new country
    const formatted = new AsYouType(country.code as CountryCode).input(localNumber);
    setLocalNumber(formatted);
    onChange(`${country.dialCode}${formatted.replace(/\s+/g, '')}`);
  };

  const handleNumberChange = (text: string) => {
    // If user starts with +, they might be pasting a full international number
    if (text.startsWith('+')) {
      try {
        const phoneNumber = parsePhoneNumber(text);
        if (phoneNumber) {
          const matchedCountry = COUNTRIES.find(c => c.code === phoneNumber.country);
          if (matchedCountry) {
            setSelectedCountry(matchedCountry);
            const nationalNumber = phoneNumber.formatNational();
            setLocalNumber(nationalNumber);
            onChange(phoneNumber.number);
            return;
          }
        }
      } catch (e) {
        // Ignore parsing errors for incomplete numbers
      }
    }

    const formatter = new AsYouType(selectedCountry.code as CountryCode);
    const formatted = formatter.input(text);
    setLocalNumber(formatted);
    
    // Send cleaned version (no spaces) to parent
    const cleaned = formatted.replace(/\s+/g, '');
    onChange(`${selectedCountry.dialCode}${cleaned}`);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      t(c.labelKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        {/* Country Selector */}
        <TouchableOpacity
          style={[styles.countrySelector, error ? styles.inputError : null]}
          onPress={() => setIsModalVisible(true)}
          disabled={!editable}
          activeOpacity={0.7}
        >
          <View style={styles.countryContent}>
            <Text style={styles.flag}>{selectedCountry.flag}</Text>
            <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* Local Number Input */}
        <TextInput
          style={[styles.phoneNumberInput, error ? styles.inputError : null]}
          value={localNumber}
          onChangeText={handleNumberChange}
          placeholder={placeholder || t('signup.phone_placeholder')}
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          editable={editable}
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('profile.select_country')}</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.modalFlag}>{item.flag}</Text>
                  <Text style={styles.modalCountryName}>{t(item.labelKey)}</Text>
                  <Text style={styles.modalDialCode}>{item.dialCode}</Text>
                  {selectedCountry.code === item.code && (
                    <Ionicons name="checkmark" size={20} color={BrandColors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF' }}>{t('search.no_countries_found')}</Text>
                </View>
              )}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    height: 50,
    gap: 12,
  },
  countrySelector: {
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primary,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    minWidth: 100,
  },
  countryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  phoneNumberInput: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primary,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  inputError: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FEF2F2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  modalCountryName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  modalDialCode: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 60,
  },
});

export default PhoneNumberInput;
