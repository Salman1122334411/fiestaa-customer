import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../utils/currency";
import QuantitySelector from "./QuantitySelector";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Colors as BrandColors } from "../constants/Colors";
import { getMenuItemAddons, AddonGroup, AddonOption } from "../lib/supabase";
import { ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { calculateItemSubtotal } from "../hooks/useCart";
import { resolveDeliveryCharge } from "../utils/delivery";
import { formatDeliveryTimeLabel } from "../utils/deliveryTime";
import { Bold } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

interface ProductDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  product: any;
  restaurant: any;
  onAddToCart: (product: any, quantity: number, selectedOptions: AddonOption[]) => void;
  initialQuantity?: number;
  initialSelectedOptions?: AddonOption[];
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isVisible,
  onClose,
  product,
  restaurant,
  onAddToCart,
  initialQuantity = 0,
  initialSelectedOptions = [],
}) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const insets = useSafeAreaInsets();

  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, AddonOption[]>>({});
  const [loadingAddons, setLoadingAddons] = useState(false);

  useEffect(() => {
    if (isVisible && product?.id) {
      setQuantity(initialQuantity || 1);
      fetchAddons();
    }
  }, [isVisible, initialQuantity, product?.id]);

  const fetchAddons = async () => {

    setLoadingAddons(true);
    try {
      const groups = await getMenuItemAddons(product.id, restaurant.id);
      console.log(`[Modal Diagnostic] Discovered ${groups.length} addon groups for ${product.label}`);
      groups.forEach(g => console.log(`  - Group "${g.displayName || g.name}" has ${g.options?.length || 0} options.`));
      setAddonGroups(groups);

      // Initialize options from hydration (cart) or defaults
      const initialSelections: Record<string, AddonOption[]> = {};

      if (initialSelectedOptions && initialSelectedOptions.length > 0) {
        // Hydrate from existing cart selections
        initialSelectedOptions.forEach(opt => {
          if (!initialSelections[opt.addonGroupId]) {
            initialSelections[opt.addonGroupId] = [];
          }
          initialSelections[opt.addonGroupId].push(opt);
        });
      } else {
        // Fallback to defaults if no previous configuration exists
        groups.forEach(group => {
          const defaults = group.options.filter(opt => opt.isDefault);
          if (defaults.length > 0) {
            initialSelections[group.id] = defaults;
          }
        });
      }
      setSelectedOptions(initialSelections);
    } catch (error) {
      console.error("Error fetching addons in modal:", error);
    } finally {
      setLoadingAddons(false);
    }
  };

  const handleOptionSelect = (group: AddonGroup, option: AddonOption) => {
    setSelectedOptions(prev => {
      const currentGroupSelections = prev[group.id] || [];
      const isAlreadySelected = currentGroupSelections.some(opt => opt.id === option.id);

      // If user changes addons, reset quantity to 1 as requested
      setQuantity(1);

      if (group.selectionType === 'SINGLE') {
        return { ...prev, [group.id]: [option] };
      } else {
        if (isAlreadySelected) {
          return {
            ...prev,
            [group.id]: currentGroupSelections.filter(opt => opt.id !== option.id)
          };
        } else {
          // Check maxSelections limit
          if (group.maxSelections && currentGroupSelections.length >= group.maxSelections) {
            return prev;
          }
          return {
            ...prev,
            [group.id]: [...currentGroupSelections, option]
          };
        }
      }
    });
  };

  const isGroupValid = (group: AddonGroup) => {
    const selections = selectedOptions[group.id] || [];
    if (group.isRequired && selections.length === 0) return false;
    if (group.minSelections && selections.length < group.minSelections) return false;
    return true;
  };

  const isFormValid = () => {
    return addonGroups.every(group => isGroupValid(group));
  };

  const getAllSelectedOptions = () => {
    const all: AddonOption[] = [];
    for (const groupId in selectedOptions) {
      if (Array.isArray(selectedOptions[groupId])) {
        all.push(...selectedOptions[groupId]);
      }
    }
    return all;
  };

  if (!product || !restaurant) return null;

  const allSelectedOptions = getAllSelectedOptions();
  const itemTotalWithAddons = calculateItemSubtotal(product.price, quantity, allSelectedOptions);

  // High-visibility diagnostic log
  console.log(`[MATH DEBUG] ${product.label}: Qty=${quantity}, Result=${itemTotalWithAddons}`);

  const grandTotal = itemTotalWithAddons;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={styles.container}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Section: Cream Background Image */}
            <View style={styles.imageContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color="#000" />
              </TouchableOpacity>

              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.restaurantSubName}>{restaurant.name}</Text>

              {/* Title & Rating Row */}
              <View style={styles.titleRow}>
                <Text style={styles.productName}>{product.label}</Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#FF3D00" style={{ marginRight: 4 }} />
                  <Text style={styles.ratingText}>{restaurant.rating || "4.5"}</Text>
                </View>
              </View>

              {/* Price */}
              <Text style={styles.productPrice}>
                {formatPrice(product.price, restaurant.currency)}
              </Text>

              {product.description && (
                <Text style={styles.productDescription}>{product.description}</Text>
              )}

              {/* Delivery Time */}
              <View style={styles.deliveryTimeRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.deliveryTimeText}>
                  {formatDeliveryTimeLabel(
                    restaurant.deliveryTime || t('common.delivery_time_range_default'),
                    30,
                    t('orders.details.mins')
                  )}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Addon Groups */}
              {loadingAddons ? (
                <View style={styles.addonLoadingContainer}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.addonLoadingText}>{t('common.loading_addons')}</Text>
                </View>
              ) : (
                addonGroups.map((group) => (
                  <View key={group.id} style={styles.addonCard}>
                    <View style={styles.addonGroupHeader}>
                      <View>
                        <Text style={styles.addonGroupName}>
                          {group.displayName || group.name}
                          {group.isRequired && <Text style={styles.requiredAsterisk}> *</Text>}
                        </Text>
                        <Text style={styles.addonGroupSub}>
                          {group.selectionType === 'SINGLE'
                            ? t('product_modal.select_one', 'Select one')
                            : t('product_modal.select_multiple', 'Select multiple')}
                          {group.maxSelections ? ` (${t('product_modal.max_selections', { count: group.maxSelections })})` : ''}
                        </Text>
                      </View>
                      {!isGroupValid(group) && (
                        <View style={styles.errorBadge}>
                          <Text style={styles.errorBadgeText}>{t('common.required', 'Required')}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.optionsList}>
                      {group.options.map((option) => {
                        const isSelected = (selectedOptions[group.id] || []).some(opt => opt.id === option.id);

                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={styles.optionRow}
                            onPress={() => handleOptionSelect(group, option)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.optionInfo}>
                              {group.selectionType === 'SINGLE' ? (
                                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                                  {isSelected && <View style={styles.radioButtonInner} />}
                                </View>
                              ) : (
                                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                              )}
                              <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                                {option.name}
                              </Text>
                            </View>
                            {group.selectionType === 'SINGLE' ? (
                              <Text style={styles.optionPrice}>
                                {formatPrice(product.price + option.priceAdjustment, restaurant.currency)}
                              </Text>
                            ) : Number(option.priceAdjustment) > 0 ? (
                              <Text style={styles.optionPrice}>
                                +{formatPrice(option.priceAdjustment, restaurant.currency)}
                              </Text>
                            ) : (
                              <Text style={styles.optionPriceFree}>
                                {formatPrice(0, restaurant.currency)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}

              <View style={styles.divider} />

              {/* Grand Total Row */}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>{t('product_modal.grand_total', 'Grand Total :')}</Text>
                <Text style={styles.grandTotalValue}>{formatPrice(grandTotal, restaurant.currency)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Button Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.quantityPillContainer}>
              <TouchableOpacity
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                style={styles.quantityPillBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.quantityPillText}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(q => q + 1)}
                style={styles.quantityPillBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.addToCartButtonPill,
                !isFormValid() && styles.disabledButton
              ]}
              onPress={() => {
                if (isFormValid()) {
                  const options = getAllSelectedOptions();
                  console.log(`[Modal Submit] Item: ${product.label}, Qty: ${quantity}, Options Count: ${options.length}`);
                  onAddToCart(product, quantity, options);
                }
              }}
              disabled={!isFormValid()}
              activeOpacity={0.9}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addToCartText}>{t('product_modal.add_to_cart')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: "#FAF6F0",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    maxHeight: height * 0.95,
    overflow: 'hidden',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    height: 300,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blurButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 32,
    paddingTop: 24,
    marginTop: -36,
    paddingBottom: 12,
  },
  restaurantSubName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5EF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 30,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BrandColors.primary,
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  deliveryTimeText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 0,
    marginBottom: 16,
  },
  deliveryChargesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryChargesLabel: {
    fontSize: 15,
    color: BrandColors.primary,
    fontWeight: '700',
  },
  deliveryChargesValue: {
    fontSize: 15,
    color: BrandColors.primary,
    fontWeight: '700',
  },
  addonLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  addonLoadingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  addonCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  addonGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addonGroupName: {
    fontSize: 16,
    fontWeight: '850',
    color: '#1F2937',
  },
  requiredAsterisk: {
    color: '#FF3D00',
  },
  addonGroupSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  errorBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  errorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: BrandColors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  optionName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  optionNameSelected: {
    color: '#111827',
    fontWeight: '700',
  },
  optionPrice: {
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: '700',
  },
  optionPriceFree: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quantityPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    borderRadius: 24,
    height: 48,
    width: 110,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  quantityPillBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityPillText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  addToCartButtonPill: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    flex: 1,
    borderRadius: 24,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ProductDetailModal;
