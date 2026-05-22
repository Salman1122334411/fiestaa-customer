import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { styles } from './CheckoutScreen.styles';
import { useNavigation, RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { MapPin, ShoppingBag, Phone, Gift, Receipt, CreditCard } from 'lucide-react-native';
import MapView from 'react-native-maps';
import { supabase, getRestaurantById } from '../lib/supabase';
import { useCart, calculateItemSubtotal, getCartItemKey } from '../hooks/useCart';
import cuid from 'cuid';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';
import { DeliveryTimingCard } from '../components/Checkout/DeliveryTimingCard';
import { createOrder } from '../lib/api';
import { OrderSuccessModal } from '../components/Checkout/OrderSuccessModal';
import { resolveDeliveryCharge } from '../utils/delivery';
import Preloader from '../components/Preloader';
import QuantitySelector from '../components/QuantitySelector';

// Use the same naming convention as in CartScreen
type Address = {
  id: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
};

type RootStackParamList = {
  Orders: undefined;
  CheckoutScreen: {
    deliveryAddress: any;
    restaurantId?: string;
  };
  MainTabs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckoutScreen'>;
type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'CheckoutScreen'>;

export function CheckoutScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckoutScreenRouteProp>();
  const { deliveryAddress } = route.params;

  console.log("CheckoutScreen mounted");
  console.log("Received deliveryAddress:", deliveryAddress);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const { cartItems, clearCart, clearRestaurantCart, getTotal, addToCart, removeFromCart } = useCart();
  const activeRestaurantId = route.params.restaurantId;
  const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
  
  // Filter items for the target restaurant
  const filteredItems = activeRestaurantId 
    ? cartItems.filter(item => item.restaurantId === activeRestaurantId)
    : cartItems;

  console.log("Cart items in CheckoutScreen:", cartItems.length, "Filtered items:", filteredItems.length);
  
  // Recalculate totals for the filtered items
  const subtotal = filteredItems.reduce((acc, item) => 
    acc + calculateItemSubtotal(item.price, item.quantity, item.selectedOptions), 0);
    
  const [verifiedDeliveryFee, setVerifiedDeliveryFee] = useState<number | null>(null);
  const [fullRestaurant, setFullRestaurant] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const verifyRestaurantData = async () => {
      const restaurantIdToCheck = activeRestaurantId || filteredItems[0]?.restaurantId;
      if (!restaurantIdToCheck) {
        if (isMounted) {
          setVerifiedDeliveryFee(null);
          setFullRestaurant(null);
        }
        return;
      }
      try {
        console.log(`[CheckoutScreen] Verifying restaurant data for ${restaurantIdToCheck}...`);
        const restaurant = await getRestaurantById(restaurantIdToCheck);
        if (isMounted) {
          setFullRestaurant(restaurant);
          const fee = resolveDeliveryCharge(restaurant, fallbackDeliveryFee);
          setVerifiedDeliveryFee(fee);
          console.log(`[CheckoutScreen] Data verified. acceptsScheduledOrders: ${restaurant?.acceptsScheduledOrders}`);
        }
      } catch (error) {
        console.error("[CheckoutScreen] Failed to verify restaurant data:", error);
        if (isMounted) {
          setVerifiedDeliveryFee(null);
          setFullRestaurant(null);
        }
      }
    };
    verifyRestaurantData();
    return () => {
      isMounted = false;
    };
  }, [activeRestaurantId, filteredItems[0]?.restaurantId, fallbackDeliveryFee]);

  const deliveryFee = verifiedDeliveryFee ?? (
    filteredItems.length > 0
      ? resolveDeliveryCharge(filteredItems[0], fallbackDeliveryFee)
      : fallbackDeliveryFee
  );

  // New Charges Logic - Use fullRestaurant if available, fallback to firstItem
  const taxRate = fullRestaurant?.taxRate ?? fullRestaurant?.tax_rate ?? filteredItems[0]?.taxRate ?? 0;
  const serviceChargeRate = fullRestaurant?.serviceChargeRate ?? fullRestaurant?.service_charge_rate ?? filteredItems[0]?.serviceChargeRate ?? 0;
  const isTaxIncluded = fullRestaurant?.isTaxIncluded ?? fullRestaurant?.is_tax_included ?? filteredItems[0]?.isTaxIncluded ?? false;

  const serviceChargeAmount = subtotal * (serviceChargeRate / 100);
  const taxAmount = isTaxIncluded ? 0 : subtotal * (taxRate / 100);
    
  const finalTotal = subtotal + deliveryFee + serviceChargeAmount + taxAmount;

  console.log("DEBUG: CheckoutScreen delivery calculation", {
    cartDeliveryCharges: cartItems.length > 0 ? cartItems[0].deliveryCharges : 'no items',
    finalDeliveryFee: deliveryFee
  });

  // Get restaurant currency from filtered items
  const restaurantCurrency = filteredItems.length > 0 ? filteredItems[0].restaurantCurrency : undefined;

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Scheduled Order State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledSlot, setScheduledSlot] = useState<string | null>(null);

  // Gift State
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  
  // Accordion Expand/Collapse State
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const footerButtonGap = 12;

  // Load saved data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSavedData = async () => {
        const restaurantIdToCheck = activeRestaurantId || filteredItems[0]?.restaurantId;
        if (!restaurantIdToCheck) return;
        try {
          const savedInstructions = await AsyncStorage.getItem(`order_instructions_${restaurantIdToCheck}`);
          if (isMounted) {
            setOrderInstructions(savedInstructions || '');
          }
          const savedPayment = await AsyncStorage.getItem(`payment_method_${restaurantIdToCheck}`);
          if (isMounted) {
            setPaymentMethod(savedPayment || 'cod');
          }
        } catch (err) {
          console.error('[CheckoutScreen] Failed to load saved data:', err);
        }
      };
      loadSavedData();
      return () => {
        isMounted = false;
      };
    }, [activeRestaurantId, filteredItems[0]?.restaurantId])
  );


  const handlePlaceOrder = async () => {
    console.log("handlePlaceOrder initiated");
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Place Order failed: No user");
        throw new Error('User not authenticated');
      }
      console.log("User authenticated:", user.id);

      // Group items by restaurant
      const restaurantGroups = cartItems.reduce((acc, item) => {
        const key = item.restaurantId;
        if (!acc[key]) {
          acc[key] = {
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            items: [],
            total: 0,
          };
        }
        acc[key].items.push(item);
        acc[key].total += calculateItemSubtotal(item.price, item.quantity, item.selectedOptions);
        return acc;
      }, {} as Record<string, any>);

      console.log("Restaurant groups prepared:", Object.keys(restaurantGroups));

      // Create orders via the Vercel API for the specific restaurant
      const restaurantToProcess = activeRestaurantId || Object.keys(restaurantGroups)[0];
      const group = restaurantGroups[restaurantToProcess];

      if (!group) {
        throw new Error('No items found for the selected restaurant');
      }

      // Create the full delivery address string
      const deliveryAddressString = `${deliveryAddress.streetAddress}, ${deliveryAddress.city}, ${deliveryAddress.state}, ${deliveryAddress.zipCode}`;

      console.log("Creating order through Vercel API...", { restaurantId: restaurantToProcess });

      // Prepare the order payload for the Vercel API
      const orderPayload = {
        userId: user.id,
        restaurantId: restaurantToProcess,
        items: group.items.map((item: any) => {
          return {
            menuItemId: item.id,
            quantity: item.quantity,
            price: calculateItemSubtotal(item.price, 1, item.selectedOptions), // Item unit price with addons
            name: item.name,
            options: item.selectedOptions || null,
          };
        }),
        totalAmount: finalTotal,
        selectedAddress: deliveryAddressString,
        paymentMethod: paymentMethod,
        phoneNumber: deliveryAddress.phoneNumber,
        scheduledDate: isScheduled ? scheduledDate?.toISOString() : null,
        scheduledSlot: isScheduled ? scheduledSlot : null,
        recipientName: isGift && recipientName.trim() !== '' ? recipientName : null,
        recipientPhone: isGift && recipientPhone.trim() !== '' ? recipientPhone : null,
        orderVertical: "RESTAURANT", // Explicitly set based on backend schema
        taxAmount: taxAmount,
        serviceChargeAmount: serviceChargeAmount,
      };

      try {
        const createdOrder = await createOrder(orderPayload);
        console.log("Order created successfully through API:", createdOrder.id);
        setLastOrderId(createdOrder.id);
      } catch (apiError: any) {
        console.error("API Order creation failed:", apiError);
        const errorMsg = apiError.message || 'Restaurant is not accepting orders at this time.';
        throw new Error(errorMsg);
      }

      clearRestaurantCart(restaurantToProcess); // Clear only the checked-out restaurant's items
      console.log("Restaurant-specific cart cleared:", restaurantToProcess);

      // Show Custom Success Modal instead of Alert and Reset
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Order placement error:', error);
      Alert.alert(
        t('common.error'), 
        error.message || t('checkout.error_message')
      );
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <Preloader fullScreen label={t('checkout.processing')} />;
  }

  // Define a default map region if delivery address has coordinates, otherwise some defaults
  const mapRegion = {
    latitude: deliveryAddress?.latitude || 37.78825,
    longitude: deliveryAddress?.longitude || -122.4324,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
  };

  return (
    <View style={styles.container}>
      {/* Custom Orange Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('checkout.title', 'Checkout')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Decorative Map View */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          />
        </View>

        <View style={styles.sectionPadding}>
          {/* Delivery Time Header */}
          <View style={styles.deliveryTimeHeaderRow}>
            <View style={styles.deliveryTimeTitleContainer}>
              <Ionicons name="time-outline" size={22} color="#333" />
              <Text style={styles.deliveryTimeTitle}>Delivery Time</Text>
            </View>
            <Text style={styles.deliveryTimeValue}>20-25 min</Text>
          </View>

          {/* Timing Toggles */}
          <DeliveryTimingCard 
            restaurantId={activeRestaurantId || (filteredItems.length > 0 ? filteredItems[0].restaurantId : '')}
            onTimingChange={(scheduled, date, slot) => {
              setIsScheduled(scheduled);
              setScheduledDate(date);
              setScheduledSlot(slot);
            }}
            t={t}
          />
        </View>

        {/* List Info (Address, Door, Phone, Gift) */}
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.listRow} onPress={() => navigation.navigate('Addresses' as any)}>
            <View style={styles.listIconContainer}>
              <MapPin size={22} color="#000000" strokeWidth={2.2} />
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle} numberOfLines={1}>{deliveryAddress.streetAddress}</Text>
              <Text style={styles.listSub} numberOfLines={1}>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.listRow} 
            onPress={() => navigation.navigate('OrderInstructions' as any, { restaurantId: activeRestaurantId || filteredItems[0]?.restaurantId })}
          >
            <View style={styles.listIconContainer}>
              <ShoppingBag size={20} color="#000000" strokeWidth={2.2} />
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>Leave it at my door</Text>
              <Text style={styles.listSub} numberOfLines={1}>Add more Details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listRow}>
            <View style={styles.listIconContainer}>
              <Phone size={20} color="#000000" strokeWidth={2.2} />
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{deliveryAddress.phoneNumber || 'Add phone number'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.listRow, { borderBottomWidth: 0 }]} 
            onPress={() => setIsGift(!isGift)}
          >
            <View style={styles.listIconContainer}>
              <Gift size={20} color="#000000" strokeWidth={2.2} />
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>Send as a gift</Text>
            </View>
            <Ionicons name={isGift ? "chevron-down" : "chevron-forward"} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Gift Input fields (If active) */}
        {isGift && (
          <View style={styles.giftExpandedContainer}>
            <Text style={styles.inputLabel}>{t('checkout.recipient_name_placeholder', 'Recipient Name')}</Text>
            <TextInput
              style={styles.textInputProminent}
              placeholder="e.g. John Doe"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholderTextColor="#9CA3AF"
            />
            
            <Text style={styles.inputLabel}>{t('checkout.recipient_phone_placeholder', 'Recipient Phone')}</Text>
            <TextInput
              style={styles.textInputProminent}
              placeholder="(99) 9999-9999"
              value={recipientPhone}
              onChangeText={(text) => setRecipientPhone(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              maxLength={15}
            />
          </View>
        )}

        {/* Payment Section (Separated) */}
        <View style={styles.thickSeparator} />
        <TouchableOpacity 
          style={styles.paymentRowContainer} 
          onPress={() => navigation.navigate('PaymentSelection' as any, { restaurantId: activeRestaurantId || filteredItems[0]?.restaurantId })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.listIconContainer}>
              <CreditCard size={20} color="#000000" strokeWidth={2.2} />
            </View>
            <Text style={styles.listTitle}>payment</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {paymentMethod === 'cod' ? (
              <Text style={[styles.listSub, { marginTop: 0, marginRight: 8 }]}>
                Cash on Delivery (COD)
              </Text>
            ) : (
              <View style={styles.paymentMethodDetails}>
                <View style={styles.paymentCardIcon}>
                  <Text style={styles.paymentCardText}>VISA</Text>
                </View>
                <Text style={styles.paymentCardNumber}>...4564</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
        <View style={styles.thickSeparator} />


        {/* Order Summary */}
        <TouchableOpacity 
          style={styles.summaryHeader}
          onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.summaryTitleContainer}>
            <Receipt size={20} color="#000000" strokeWidth={2.2} />
            <Text style={styles.summaryTitle}>Order Summary ({cartItems.length} Items)</Text>
          </View>
          <Ionicons name={isSummaryExpanded ? "chevron-down" : "chevron-forward"} size={20} color="#000000" />
        </TouchableOpacity>

        {isSummaryExpanded && (
          <>
            <View style={styles.itemsSubHeaderRow}>
              <Text style={styles.itemsSubHeader}>Items</Text>
              <TouchableOpacity
                style={styles.exploreItemsButton}
                onPress={() => {
                  const restaurantIdToReturn =
                    activeRestaurantId || filteredItems[0]?.restaurantId;
                  navigation.navigate('HomeTab' as any, {
                    screen: 'Restaurants',
                    params: {
                      fromCheckout: true,
                      checkoutParams: {
                        deliveryAddress: route.params.deliveryAddress,
                        restaurantId: restaurantIdToReturn,
                      },
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreItemsButtonText}>
                  {t('navigation.explore', 'Explore')}
                </Text>
              </TouchableOpacity>
            </View>
            {filteredItems.map((item, index) => (
              <View key={`${item.id}-${getCartItemKey(item.id, item.selectedOptions)}`} style={styles.itemRow}>
                {item.image ? <Image source={{ uri: item.image }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{formatPrice(calculateItemSubtotal(item.price, 1, item.selectedOptions), restaurantCurrency)}</Text>
                </View>
                <QuantitySelector
                  variant="checkout"
                  initialQuantity={item.quantity}
                  alwaysExpanded
                  showQuantitySuffix
                  size="small"
                  containerStyle={styles.checkoutQuantityPill}
                  onUpdate={(newQty) => {
                    if (newQty > item.quantity) {
                      addToCart({ ...item, quantity: 1 });
                    } else if (newQty < item.quantity) {
                      removeFromCart(item.id, item.selectedOptions);
                    }
                  }}
                />
              </View>
            ))}
          </>
        )}

        {/* Receipt Details */}
        <View style={styles.receiptContainer}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Subtotal</Text>
            <Text style={styles.receiptValue}>{formatPrice(subtotal, restaurantCurrency)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Delivery Fee</Text>
            <Text style={styles.receiptValue}>{formatPrice(deliveryFee, restaurantCurrency)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Fee & Estimated Tax</Text>
            <Text style={styles.receiptValue}>{formatPrice(taxAmount + serviceChargeAmount, restaurantCurrency)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptDiscountLabel}>Discount</Text>
            <Text style={styles.receiptDiscountValue}>-{formatPrice(0, restaurantCurrency)}</Text>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(finalTotal, restaurantCurrency)}</Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Floating Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingTop: footerButtonGap,
            paddingBottom:
              footerButtonGap + (tabBarHeight > 0 ? 0 : insets.bottom),
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.placeOrderBtn} 
          onPress={handlePlaceOrder}
          activeOpacity={0.9}
        >
          <Text style={styles.placeOrderText}>{t('checkout.place_order', 'Place Order')}</Text>
          <Text style={styles.placeOrderTotal}>{formatPrice(finalTotal, restaurantCurrency)}</Text>
        </TouchableOpacity>
      </View>

      <OrderSuccessModal
        isVisible={showSuccessModal}
        orderId={lastOrderId || undefined}
        onTrack={() => {
          setShowSuccessModal(false);
          navigation.popToTop();
          if (lastOrderId) {
            navigation.navigate('OrdersTab' as any, {
              screen: 'OrderDetails',
              params: { order: { id: lastOrderId, restaurantId: cartItems[0]?.restaurantId } }
            });
          } else {
            navigation.navigate('HomeTab' as any);
          }
        }}
        onHome={() => {
          setShowSuccessModal(false);
          navigation.popToTop();
          navigation.navigate('HomeTab' as any);
        }}
      />
    </View>
  );
}

export default CheckoutScreen;
