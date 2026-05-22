import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { modalStyles } from './SaveLocationModal.styles';
import { useLocation } from '../hooks/useLocation';
import { useAddress } from '../hooks/useAddress';
import { supabase } from "../lib/supabase";
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';
import { PRESET_ADDRESSES } from '../constants/Addresses';
import {
  MapPin,
  Building2,
  Map as MapIcon,
  Phone,
  Home,
  Briefcase,
  Tag,
  PenLine,
  Save,
  X
} from 'lucide-react-native';

interface SaveLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onAddressAdded?: () => void;
}

export default function SaveLocationModal({
  visible,
  onClose,
  onAddressAdded,
}: SaveLocationModalProps) {
  const { fetchLocation, currentLocation, coords, setManualLocation, isFetching, isManual } = useLocation();
  const { addAddress } = useAddress();

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const [address, setAddress] = useState({
    label: '',
    zipCode: '',
    phoneNumber: '',
    streetAddress: '',
    city: '',
    state: '',
    isDefault: false,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [selectedLabelPreset, setSelectedLabelPreset] = useState<string | null>(null);
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (!isManual) {
        setSelectedQuickPreset('current-location');
      } else if (PRESET_ADDRESSES.length > 0) {
        const waltonPreset = PRESET_ADDRESSES[0];
        setSelectedQuickPreset(waltonPreset.id);
        setAddress((prev) => ({
          ...prev,
          streetAddress: waltonPreset.streetAddress,
          city: waltonPreset.city,
          state: waltonPreset.state,
          latitude: waltonPreset.latitude,
          longitude: waltonPreset.longitude,
        }));
      }
    } else {
      setAddress({
        label: '',
        zipCode: '',
        phoneNumber: '',
        streetAddress: '',
        city: '',
        state: '',
        isDefault: false,
        latitude: null,
        longitude: null,
      });
      setValidationErrors({});
      setDefaultAddress(false);
      setSelectedLabelPreset(null);
      setSelectedQuickPreset(null);
    }
  }, [visible, isManual]);

  useEffect(() => {
    if (
      visible &&
      selectedQuickPreset === 'current-location' &&
      currentLocation &&
      coords &&
      !isFetching &&
      !currentLocation.includes('Error') &&
      currentLocation !== 'Fetching current location...'
    ) {
      const parts = currentLocation.split(',');
      setAddress((prev) => ({
        ...prev,
        streetAddress: parts[0] ? parts[0].trim() : '',
        city: parts[1] ? parts[1].trim() : '',
        state: parts[2] ? parts[2].trim() : '',
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
    }
  }, [currentLocation, visible, coords, isFetching, selectedQuickPreset]);

  const validate = () => {
    let errors: Record<string, string> = {};

    if (!address.label.trim()) errors.label = t('save_location.error_label');
    if (!address.streetAddress.trim()) errors.streetAddress = t('save_location.error_street');
    if (!address.city.trim()) errors.city = t('save_location.error_city');
    
    if (!address.phoneNumber.trim()) {
      errors.phoneNumber = t('save_location.error_phone');
    } else if (!/^\d{10,11}$/.test(address.phoneNumber.trim())) {
      errors.phoneNumber = t('save_location.error_phone_format');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
 
  const handleQuickSelect = (preset: any) => {
    setSelectedQuickPreset(preset.id);
    setAddress((prev) => ({
      ...prev,
      streetAddress: preset.streetAddress,
      city: preset.city,
      state: preset.state,
      latitude: preset.latitude,
      longitude: preset.longitude,
    }));
    setValidationErrors({});
  };
 
  const handleCurrentLocationClick = () => {
    setSelectedQuickPreset('current-location');
    setLoadingLocation(true);
    fetchLocation(true)
      .catch(() => Alert.alert(t('common.error'), t('save_location.error_fetch')))
      .finally(() => setLoadingLocation(false));
  };

  const handleSetAppLocation = (preset: any) => {
    setManualLocation(preset.label, { latitude: preset.latitude, longitude: preset.longitude });
    Alert.alert(t('common.success'), t('profile_setup.location_simulated', { location: preset.label }));
  };

  const handleSave = async () => {
    if (!validate()) return;

    const newAddress = {
      ...address,
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
      isDefault: defaultAddress,
      zipCode: address.zipCode || '00000', 
    };

    try {
      if (defaultAddress) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return Alert.alert(t('common.error'), t('save_location.user_not_logged_in'));
        
        await supabase
          .from("Address")
          .update({ isDefault: false })
          .eq("userId", session.user.id);
      }

      await addAddress(newAddress);
      onAddressAdded && onAddressAdded();
      Alert.alert(t('common.success'), t('save_location.success_save'));
      onClose();
    } catch (error) {
      console.error("Error saving address:", error);
      Alert.alert(t('common.error'), t('save_location.error_save'));
    }
  };

  const labelPresets = [
    { id: 'Home', label: t('addresses.home'), icon: Home },
    { id: 'Office', label: t('addresses.office'), icon: Briefcase },
    { id: 'Custom', label: t('addresses.custom'), icon: PenLine },
  ];

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
              {/* Header */}
              <View style={modalStyles.headerRow}>
                <View style={modalStyles.headerIconContainer}>
                  <MapPin size={20} color={BrandColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.modalTitle}>{t('save_location.title') || 'Save Address'}</Text>
                </View>
              </View>

              {/* Quick Select */}
              <Text style={modalStyles.sectionHeader}>{t('addresses.quick_select')}</Text>
              <View style={modalStyles.quickSelectContainer}>
                <TouchableOpacity 
                  style={[
                    modalStyles.quickSelectChip,
                    selectedQuickPreset === 'current-location' && modalStyles.quickSelectChipActive
                  ]}
                  onPress={handleCurrentLocationClick}
                  activeOpacity={0.7}
                >
                  {loadingLocation ? <ActivityIndicator size="small" color={BrandColors.primary} /> : <MapPin size={16} color={BrandColors.primary} />}
                  <Text
                    style={[
                      modalStyles.quickSelectChipText,
                      selectedQuickPreset === 'current-location' && modalStyles.quickSelectChipTextActive
                    ]}
                  >
                    {t('addresses.current_location')}
                  </Text>
                </TouchableOpacity>
                
                {PRESET_ADDRESSES.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      modalStyles.quickSelectChip,
                      selectedQuickPreset === preset.id && modalStyles.quickSelectChipActive
                    ]}
                    onPress={() => handleQuickSelect(preset)}
                    onLongPress={() => handleSetAppLocation(preset)}
                    delayLongPress={300}
                    activeOpacity={0.7}
                  >
                    <Home
                      size={16}
                      color={selectedQuickPreset === preset.id ? BrandColors.primary : "#6B7280"}
                    />
                    <Text
                      style={[
                        modalStyles.quickSelectChipText,
                        selectedQuickPreset === preset.id && modalStyles.quickSelectChipTextActive
                      ]}
                    >
                      {t('addresses.walton')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address Details */}
              <Text style={modalStyles.sectionHeader}>{t('addresses.address_details')}</Text>
              <View style={[modalStyles.inputContainer, validationErrors.streetAddress && modalStyles.inputError]}>
                <MapPin size={20} color="#6B7280" style={modalStyles.inputIcon} />
                <View style={modalStyles.inputWrapper}>
                  <Text style={modalStyles.inputLabelText}>{t('addresses.street_address')}</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder={t('addresses.street_address_placeholder')}
                    value={address.streetAddress}
                    onChangeText={(text) => setAddress((prev) => ({ ...prev, streetAddress: text }))}
                  />
                </View>
              </View>
              {validationErrors.streetAddress && <Text style={modalStyles.errorText}>{validationErrors.streetAddress}</Text>}

              <View style={modalStyles.rowContainer}>
                <View style={modalStyles.flex1}>
                  <View style={[modalStyles.inputContainer, validationErrors.city && modalStyles.inputError]}>
                    <Building2 size={20} color="#6B7280" style={modalStyles.inputIcon} />
                    <View style={modalStyles.inputWrapper}>
                      <Text style={modalStyles.inputLabelText}>{t('addresses.city')}</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder={t('addresses.city_placeholder_alt')}
                        value={address.city}
                        onChangeText={(text) => setAddress((prev) => ({ ...prev, city: text }))}
                      />
                    </View>
                  </View>
                  {validationErrors.city && <Text style={modalStyles.errorText}>{validationErrors.city}</Text>}
                </View>

                <View style={modalStyles.flex1}>
                  <View style={[modalStyles.inputContainer]}>
                    <MapIcon size={20} color="#6B7280" style={modalStyles.inputIcon} />
                    <View style={modalStyles.inputWrapper}>
                      <Text style={modalStyles.inputLabelText}>{t('addresses.state_optional')}</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder={t('profile_setup.state')}
                        value={address.state}
                        onChangeText={(text) => setAddress((prev) => ({ ...prev, state: text }))}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Label */}
              <Text style={modalStyles.sectionHeader}>{t('addresses.label_optional')}</Text>
              <View style={modalStyles.labelChipsContainer}>
                {labelPresets.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = selectedLabelPreset === preset.id || (address.label === preset.id && !selectedLabelPreset);
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[modalStyles.labelChip, isActive && modalStyles.labelChipActive]}
                      onPress={() => {
                        setSelectedLabelPreset(preset.id);
                        if (preset.id !== 'Custom') {
                          setAddress((prev) => ({ ...prev, label: preset.id }));
                        } else {
                          setAddress((prev) => ({ ...prev, label: '' }));
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon size={16} color={isActive ? BrandColors.primary : "#6B7280"} />
                      <Text style={[modalStyles.labelChipText, isActive && modalStyles.labelChipTextActive]}>{preset.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              
              {selectedLabelPreset === 'Custom' && (
                <View style={[modalStyles.inputContainer, { marginTop: 12 }, validationErrors.label && modalStyles.inputError]}>
                  <Tag size={20} color="#6B7280" style={modalStyles.inputIcon} />
                  <View style={modalStyles.inputWrapper}>
                    <Text style={modalStyles.inputLabelText}>{t('addresses.custom_label')}</Text>
                    <TextInput
                      style={modalStyles.input}
                      placeholder={t('addresses.custom_label_placeholder')}
                      value={address.label}
                      onChangeText={(text) => setAddress((prev) => ({ ...prev, label: text }))}
                    />
                  </View>
                </View>
              )}
              {validationErrors.label && <Text style={[modalStyles.errorText, { marginTop: 4 }]}>{validationErrors.label}</Text>}

              {/* Contact Info */}
              <Text style={modalStyles.sectionHeader}>{t('addresses.contact_information')}</Text>
              <View style={[modalStyles.inputContainer, validationErrors.phoneNumber && modalStyles.inputError]}>
                <Phone size={20} color="#6B7280" style={modalStyles.inputIcon} />
                <View style={modalStyles.inputWrapper}>
                  <Text style={modalStyles.inputLabelText}>{t('addresses.phone_number')}</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder={t('addresses.phone_number_placeholder')}
                    keyboardType="phone-pad"
                    value={address.phoneNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '');
                      setAddress((prev) => ({ ...prev, phoneNumber: cleaned }));
                    }}
                  />
                </View>
              </View>
              {validationErrors.phoneNumber && <Text style={modalStyles.errorText}>{validationErrors.phoneNumber}</Text>}

              {/* Default Address Toggle */}
              <View style={modalStyles.defaultContainer}>
                <View style={modalStyles.defaultTextContainer}>
                  <Text style={modalStyles.defaultText}>{t('addresses.set_default')}</Text>
                  <Text style={modalStyles.defaultSubText}>{t('addresses.primary_address_desc')}</Text>
                </View>
                <Switch
                  trackColor={{ false: "#E5E7EB", true: BrandColors.primary }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#E5E7EB"
                  onValueChange={() => setDefaultAddress(!defaultAddress)}
                  value={defaultAddress}
                />
              </View>

              <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                <Save size={20} color="#FFFFFF" />
                <Text style={modalStyles.saveButtonText}>{t('save_location.save_btn') || 'Save Address'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={modalStyles.cancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
