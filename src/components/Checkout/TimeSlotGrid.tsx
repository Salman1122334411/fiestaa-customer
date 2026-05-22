import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Slot {
  id: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

interface TimeSlotGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSlotChange: (slotId: string, label: string) => void;
  isLoading?: boolean;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlotId,
  onSlotChange,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('checkout.fetching_slots')}</Text>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={32} color="#92400E" style={{ marginBottom: 10 }} />
        <Text style={styles.emptyText}>{t('checkout.no_slots_available')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const label = `${slot.startTime} - ${slot.endTime}`;

          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slotButton,
                isSelected && styles.selectedSlotButton,
                !slot.isAvailable && styles.disabledSlot,
              ]}
              disabled={!slot.isAvailable}
              onPress={() => onSlotChange(slot.id, label)}
              activeOpacity={0.9}
            >
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={isSelected ? Colors.primary : (slot.isAvailable ? '#6B7280' : '#9CA3AF')} 
                style={{ marginRight: 8 }}
              />
              <Text style={[
                styles.slotText,
                isSelected && styles.selectedText,
                !slot.isAvailable && styles.disabledText,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  selectedSlotButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05', // even more subtle
    borderWidth: 2,
  },
  disabledSlot: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    elevation: 0,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  selectedText: {
    color: Colors.primary,
    fontWeight: '800',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 12,
  },
  emptyText: {
    color: '#92400E',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
});
