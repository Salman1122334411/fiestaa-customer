import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { styles } from "./CartScreen.styles";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart, calculateItemSubtotal } from "../hooks/useCart";
import { formatPrice } from "../utils/currency";
import { useTranslation } from "react-i18next";
import { Colors as BrandColors } from "../constants/Colors";
import { useAddress } from "../hooks/useAddress";
import { ClearCartModal } from "../components/ClearCartModal";
import { useSettings } from "../hooks/useSettings";
import { getRestaurantById } from "../lib/supabase";
import * as Location from 'expo-location';
import { getDistance } from "../utils/geo";

export const CartScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { deliveryRadius } = useSettings();
  const { cartItems, removeFromCart, addToCart, clearCart, getTotal } = useCart();
  const { selectedAddress, fetchAddresses } = useAddress();

  useEffect(() => {
    fetchAddresses();
  }, []);

   const [loading, setLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [restaurantDeliveryTimes, setRestaurantDeliveryTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDeliveryTimes = async () => {
      const times: Record<string, string> = {};
      const uniqueRestaurantIds = [...new Set(cartItems.map(i => i.restaurantId))];
      await Promise.all(uniqueRestaurantIds.map(async (id) => {
        try {
          const restaurantData = await getRestaurantById(id);
          if (restaurantData && restaurantData.deliveryTime) {
            times[id] = restaurantData.deliveryTime;
          }
        } catch (e) {
          console.error("Error fetching delivery time for", id, e);
        }
      }));
      setRestaurantDeliveryTimes(times);
    };

    if (cartItems.length > 0) {
      fetchDeliveryTimes();
    }
  }, [cartItems]);

  // Group items by restaurant
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = {
        name: item.restaurantName,
        items: [],
        restaurantCurrency: item.restaurantCurrency || 'USD',
      };
    }
    acc[item.restaurantId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; items: any[]; restaurantCurrency: string }>);

  const handleCheckout = async (restaurantId: string) => {
    try {
      setLoading(true);
      
      if (!selectedAddress) {
        Alert.alert(t('common.error'), t('cart.no_address_message'));
        return;
      }

      const restaurantData = await getRestaurantById(restaurantId);
      if (!restaurantData) throw new Error("Failed to fetch restaurant data");

      if (!restaurantData.latitude || !restaurantData.longitude) {
        Alert.alert(t('common.error'), t('cart.location_missing'));
        return;
      }

      let distance = 0;
      if (selectedAddress.latitude && selectedAddress.longitude) {
        distance = getDistance(
          selectedAddress.latitude,
          selectedAddress.longitude,
          restaurantData.latitude,
          restaurantData.longitude
        );
      }

      const maxRadius = deliveryRadius > 0 ? deliveryRadius : 10;
      if (distance > maxRadius) {
        Alert.alert(
          t('cart.out_of_range_title'),
          t('cart.out_of_range_message', { distance: distance.toFixed(1), maxRadius })
        );
        return;
      }

      navigation.navigate("CheckoutScreen", {
        deliveryAddress: selectedAddress,
        restaurantId: restaurantId,
      });
    } catch (error) {
      console.error("Checkout prep error:", error);
      Alert.alert(t('common.error'), t('cart.checkout_error'));
    } finally {
      setLoading(false);
    }
  };

   const handleClearCart = () => {
    setShowClearModal(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setShowClearModal(false);
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollViewContent, 
            { flex: 1, justifyContent: 'center' }
          ]}
        >
          <View style={styles.emptyCartContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyCartText}>{t('cart.empty')}</Text>
            
            {/* Promotion card moved inside empty container for better centering */}
            <View style={[styles.promoCard, { width: '100%', marginTop: 40 }]}>
              <View style={styles.promoIconContainer}>
                <Ionicons name="restaurant" size={32} color={BrandColors.primary} />
              </View>
              <Text style={styles.promoTitle}>{t('cart.hungry_for_more')}</Text>
              <Text style={styles.promoSubtitle}>
                {t('cart.explore_new_flavors')}
              </Text>
              <TouchableOpacity style={styles.promoButton} onPress={() => navigation.navigate('HomeTab')}>
                <Text style={styles.promoButtonText}>{t('cart.start_new_cart')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.subHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeOrdersLabel}>{t('cart.active_orders_label')}</Text>
          <Text style={styles.activeOrdersCount}>
            {t('cart.active_orders_progress', { count: Object.keys(groupedItems).length })}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearCart} style={styles.clearCartButton}>
          <Text style={styles.clearCartText}>{t('cart.clear')}</Text>
          <Ionicons name="trash-outline" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedItems).map(([restaurantId, group]) => {
          const { name, items } = group;
          const subtotal = items.reduce((sum, item) => 
            sum + calculateItemSubtotal(item.price, item.quantity, item.selectedOptions), 0
          );

          return (
            <View key={restaurantId} style={styles.summaryCard}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <View style={[styles.badgePill, { backgroundColor: '#FEF3C7', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.badgeText, { color: '#D97706' }]}>{t('cart.hot_and_fresh')}</Text>
                  </View>
                  <Text style={styles.restaurantName} numberOfLines={1}>{name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[styles.itemCountText, { marginBottom: 0 }]}>
                      {t('cart.items_waiting', { count: items.length })}
                    </Text>
                    {restaurantDeliveryTimes[restaurantId] && (
                      <>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginHorizontal: 6 }}>•</Text>
                        <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 2 }} />
                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
                          {restaurantDeliveryTimes[restaurantId]} {t('common.min')}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.subtotalContainer}>
                  <Text style={styles.subtotalValue}>
                    {formatPrice(
                      subtotal + 
                      (items[0].serviceChargeRate ? subtotal * (items[0].serviceChargeRate / 100) : 0) + 
                      ((!items[0].isTaxIncluded && items[0].taxRate) ? subtotal * (items[0].taxRate / 100) : 0), 
                      items[0].restaurantCurrency
                    )}
                  </Text>
                  <Text style={styles.subtotalLabel}>{t('cart.total_per_restaurant')}</Text>
                </View>
              </View>

              {/* Fee Breakdown */}
              <View style={{ paddingHorizontal: 0, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>{t('cart.subtotal')}</Text>
                  <Text style={{ fontSize: 12, color: '#111827' }}>{formatPrice(subtotal, items[0].restaurantCurrency)}</Text>
                </View>
                
                {items[0].serviceChargeRate > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{t('cart.service_charge')} ({items[0].serviceChargeRate}%)</Text>
                    <Text style={{ fontSize: 12, color: '#111827' }}>{formatPrice(subtotal * (items[0].serviceChargeRate / 100), items[0].restaurantCurrency)}</Text>
                  </View>
                )}

                {items[0].taxRate > 0 && !items[0].isTaxIncluded && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{t('cart.tax')} ({items[0].taxRate}%)</Text>
                    <Text style={{ fontSize: 12, color: '#111827' }}>{formatPrice(subtotal * (items[0].taxRate / 100), items[0].restaurantCurrency)}</Text>
                  </View>
                )}

                {items[0].isTaxIncluded && items[0].taxRate > 0 && (
                  <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                    * {t('cart.tax_included_hint', { rate: items[0].taxRate })}
                  </Text>
                )}
              </View>

              {/* Compact Item List (replacing Avatar Group) */}
              <View style={styles.compactList}>
                {items.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={styles.compactItem}>
                    <Image source={{ uri: item.image }} style={styles.compactItemImage} />
                    <View style={styles.compactItemInfo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.compactItemName} numberOfLines={1}>
                          {item.quantity}x {item.name}
                        </Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.id, item.selectedOptions)}>
                          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>{t('common.remove')}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.compactItemPrice}>
                        {formatPrice(calculateItemSubtotal(item.price, item.quantity, item.selectedOptions), items[0].restaurantCurrency)}
                      </Text>
                    </View>
                  </View>
                ))}
                {items.length > 3 && (
                  <Text style={styles.moreItemsText}>
                    + {t('cart.items_waiting', { count: items.length - 3 })}
                  </Text>
                )}
              </View>

              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => handleCheckout(restaurantId)}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>{t('cart.continue_to_checkout')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Support Section */}
        <View style={styles.promoCard}>
          <View style={styles.promoIconContainer}>
            <Ionicons name="cart" size={32} color={BrandColors.primary} />
          </View>
          <Text style={styles.promoTitle}>{t('cart.hungry_for_more')}</Text>
          <Text style={styles.promoSubtitle}>
            {t('cart.explore_new_flavors')}
          </Text>
          <TouchableOpacity 
            style={styles.promoButton}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.promoButtonText}>{t('cart.start_new_cart')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ClearCartModal 
        isVisible={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={confirmClearCart}
      />
    </View>
  );
};
