import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SchedulingDatePicker } from './SchedulingDatePicker';
import { TimeSlotGrid } from './TimeSlotGrid';
import { getDeliverySlots, getRestaurantByIdFromAPI } from '../../lib/api';
import { format } from 'date-fns';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DeliveryTimingCardProps {
  restaurantId: string;
  onTimingChange: (isScheduled: boolean, date: Date | null, slot: string | null) => void;
  t: (key: string) => string;
}

export const DeliveryTimingCard: React.FC<DeliveryTimingCardProps> = ({
  restaurantId,
  onTimingChange,
  t,
}) => {
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [supportsScheduling, setSupportsScheduling] = useState(true);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Fetch initial slots on mount to confirm availability
  useEffect(() => {
    const initScheduling = async () => {
      try {
        setCapabilityLoading(true);
        // We always assume scheduling is possible if the restaurant exists, 
        // as the web app shows it as available.
        setSupportsScheduling(true);
      } catch (error) {
        console.error('Error initializing scheduling:', error);
      } finally {
        setCapabilityLoading(false);
      }
    };

    if (restaurantId) {
      initScheduling();
    }
  }, [restaurantId]);

  // Fetch slots whenever the date changes
  useEffect(() => {
    if (isScheduled && supportsScheduling) {
      fetchSlots();
    }
  }, [selectedDate, isScheduled, supportsScheduling]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setSlotsError(null);
      const data = await getDeliverySlots(restaurantId, selectedDate);
      
      setSlots(data || []);

      // If we got data, but the currently selected slot is no longer in the list, reset it
      if (selectedSlotId && !data?.find((s: any) => s.id === selectedSlotId)) {
        handleSlotChange(null, null);
      }
    } catch (error) {
      console.error('Error fetching delivery slots from Web API:', error);
      setSlotsError(t('checkout.scheduling_unavailable'));
      setSlots([]);
      handleSlotChange(null, null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (scheduled: boolean) => {
    if (scheduled && !supportsScheduling) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsScheduled(scheduled);
    if (!scheduled) {
      onTimingChange(false, null, null);
    } else {
      onTimingChange(true, selectedDate, selectedSlotLabel);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Notify parent immediately of date change, slot reset
    onTimingChange(isScheduled, date, null);
  };

  const handleSlotChange = (slotId: string | null, label: string | null) => {
    setSelectedSlotId(slotId);
    setSelectedSlotLabel(label);
    onTimingChange(isScheduled, selectedDate, label);
  };

  return (
    <View style={styles.container}>

      <View style={styles.timingContainer}>
        {/* Standard / Deliver Now Card */}
        <TouchableOpacity
          style={[
            styles.timingCard,
            !isScheduled && styles.activeTimingCard,
          ]}
          onPress={() => handleToggle(false)}
          activeOpacity={0.9}
        >
          <View style={styles.timingTextContent}>
            <Text style={styles.timingTitle}>
              {t('checkout.deliver_now', 'Deliver Now')}
            </Text>
            <Text style={styles.timingSubtext}>
              {t('checkout.fastest_delivery', 'Fastest delivery')}
            </Text>
          </View>
          <View style={[styles.radioOuter, !isScheduled && styles.radioOuterSelected]}>
            {!isScheduled && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
        </TouchableOpacity>

        {/* Schedule for Later Card */}
        <TouchableOpacity
          style={[
            styles.timingCard,
            isScheduled && styles.activeTimingCard,
            !supportsScheduling && styles.disabledTimingCard,
          ]}
          onPress={() => supportsScheduling && handleToggle(true)}
          activeOpacity={supportsScheduling ? 0.9 : 1}
        >
          <View style={styles.timingTextContent}>
            <Text style={styles.timingTitle}>
              {t('checkout.schedule_later', 'Schedule for Later')}
            </Text>
            <Text style={styles.timingSubtext}>
               {t('checkout.pick_your_time', 'Pick your time')}
            </Text>
          </View>
          <View style={[styles.radioOuter, isScheduled && styles.radioOuterSelected]}>
            {isScheduled && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
        </TouchableOpacity>
      </View>

      {isScheduled && (
        <View style={styles.schedulingContent}>
          <Text style={styles.detailsLabel}>{t('checkout.select_date')}</Text>
          <SchedulingDatePicker 
            selectedDate={selectedDate} 
            onDateChange={handleDateChange} 
          />
          
          <Text style={styles.detailsLabel}>{t('checkout.available_slots')}</Text>
          {slotsError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
              <Text style={styles.errorText}>{slotsError}</Text>
            </View>
          ) : (
            <TimeSlotGrid 
              slots={slots} 
              selectedSlotId={selectedSlotId} 
              onSlotChange={handleSlotChange}
              isLoading={loading}
            />
          )}
        </View>
      )}
    </View>
  );
};

const TEXT_GRAY = '#6B7280';

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#222627',
    letterSpacing: -0.5,
  },
  timingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  timingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  activeTimingCard: {
    borderColor: '#333333',
  },
  timingTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
    textAlign: 'left',
  },
  timingSubtext: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'left',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    backgroundColor: '#333333',
    borderColor: '#333333',
  },
  schedulingContent: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEE7D6',
  },
  detailsLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  disabledTimingCard: {
    backgroundColor: '#F9FAFB',
    opacity: 0.5,
  },
  disabledTimingTitle: {
    color: '#D1D5DB',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
});
