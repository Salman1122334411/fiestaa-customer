import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as BrandColors } from '../constants/Colors';

interface QuantitySelectorProps {
  initialQuantity: number;
  onUpdate: (quantity: number) => void;
  containerStyle?: any;
  size?: 'small' | 'medium';
  alwaysExpanded?: boolean;
  showQuantitySuffix?: boolean;
  variant?: 'default' | 'checkout';
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  initialQuantity,
  onUpdate,
  containerStyle,
  size = 'small',
  alwaysExpanded = false,
  showQuantitySuffix = false,
  variant = 'default',
}) => {
  const isSmall = size === 'small';
  const isCheckout = variant === 'checkout';
  const [mode, setMode] = useState<'idle' | 'expanded' | 'badge'>(
    alwaysExpanded ? 'expanded' : (initialQuantity > 0 ? 'badge' : 'idle')
  );
  const [quantity, setQuantity] = useState(initialQuantity);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuantity(initialQuantity);
    if (alwaysExpanded) {
      setMode('expanded');
      return;
    }
    if (initialQuantity === 0) {
      setMode('idle');
    } else if (mode === 'idle') {
      setMode('badge');
    }
  }, [initialQuantity, alwaysExpanded]);

  const startTimer = () => {
    if (alwaysExpanded) return;
    stopTimer();
    timerRef.current = setTimeout(() => {
      if (quantity > 0) {
        setMode('badge');
      } else {
        setMode('idle');
      }
    }, 3000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleIncrement = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onUpdate(newQty);
    setMode('expanded');
    startTimer();
  };

  const handleDecrement = () => {
    if (quantity === 0) return;
    const newQty = quantity - 1;
    setQuantity(newQty);
    onUpdate(newQty);
    if (newQty === 0) {
      setMode(alwaysExpanded ? 'expanded' : 'idle');
      stopTimer();
    } else {
      setMode('expanded');
      startTimer();
    }
  };

  const handlePressMode = () => {
    if (mode === 'idle') {
      handleIncrement();
    } else if (mode === 'badge') {
      setMode('expanded');
      startTimer();
    }
  };

  const quantityLabel = showQuantitySuffix ? `${quantity}x` : `${quantity}`;
  const iconColor = '#111827';

  if (mode === 'idle') {
    return (
      <TouchableOpacity
        style={[
          styles.baseContainer,
          isSmall ? styles.idleContainerSmall : styles.idleContainer,
          containerStyle,
        ]}
        onPress={handlePressMode}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={isSmall ? 18 : 24} color={iconColor} />
      </TouchableOpacity>
    );
  }

  if (mode === 'badge') {
    return (
      <TouchableOpacity
        style={[
          styles.baseContainer,
          isSmall ? styles.badgeContainerSmall : styles.badgeContainer,
          containerStyle,
        ]}
        onPress={handlePressMode}
        activeOpacity={0.8}
      >
        <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall]}>{quantity}</Text>
      </TouchableOpacity>
    );
  }

  if (isCheckout) {
    return (
      <View
        style={[
          isSmall ? styles.checkoutPillSmall : styles.checkoutPill,
          containerStyle,
        ]}
      >
        <TouchableOpacity
          style={isSmall ? styles.checkoutActionBtnSmall : styles.checkoutActionBtn}
          onPress={handleDecrement}
          activeOpacity={0.7}
        >
          {quantity === 1 ? (
            <Ionicons
              name="trash-outline"
            size={isSmall ? 14 : 18}
            color={BrandColors.text}
          />
        ) : (
          <Ionicons
            name="remove"
            size={isSmall ? 14 : 18}
              color={BrandColors.text}
            />
          )}
        </TouchableOpacity>

        <Text style={[styles.checkoutQuantityText, isSmall && styles.checkoutQuantityTextSmall]}>
          {quantityLabel}
        </Text>

        <TouchableOpacity
          style={isSmall ? styles.checkoutActionBtnSmall : styles.checkoutActionBtn}
          onPress={handleIncrement}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={isSmall ? 14 : 18} color={BrandColors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.baseContainer,
        isSmall ? styles.expandedContainerSmall : styles.expandedContainer,
        containerStyle,
      ]}
    >
      <TouchableOpacity
        style={isSmall ? styles.actionBtnSmall : styles.actionBtn}
        onPress={handleDecrement}
        activeOpacity={0.7}
      >
        {quantity === 1 ? (
          <Ionicons name="trash-outline" size={isSmall ? 14 : 18} color={iconColor} />
        ) : (
          <Ionicons name="remove" size={isSmall ? 16 : 20} color={iconColor} />
        )}
      </TouchableOpacity>

      <Text style={[styles.quantityText, isSmall && styles.quantityTextSmall]}>
        {quantity}
      </Text>

      <TouchableOpacity
        style={isSmall ? styles.actionBtnSmall : styles.actionBtn}
        onPress={handleIncrement}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={isSmall ? 16 : 20} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  idleContainer: {
    width: 40,
    height: 40,
  },
  idleContainerSmall: {
    width: 30,
    height: 30,
  },
  badgeContainer: {
    width: 40,
    height: 40,
    backgroundColor: BrandColors.primary,
  },
  badgeContainerSmall: {
    width: 28,
    height: 28,
    backgroundColor: BrandColors.primary,
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  badgeTextSmall: {
    fontSize: 12,
  },
  expandedContainer: {
    flexDirection: 'row',
    width: 100,
    height: 40,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedContainerSmall: {
    flexDirection: 'row',
    width: 80,
    height: 30,
    paddingHorizontal: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSmall: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  quantityTextSmall: {
    fontSize: 14,
  },
  checkoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  checkoutPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 18,
    paddingHorizontal: 2,
    paddingVertical: 3,
    flexShrink: 0,
  },
  checkoutActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkoutActionBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkoutQuantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.text,
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  checkoutQuantityTextSmall: {
    fontSize: 12,
    marginHorizontal: 4,
    minWidth: 18,
  },
});

export default QuantitySelector;
