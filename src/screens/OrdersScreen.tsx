import React, { useCallback, useEffect, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
  StyleProp,
  ViewStyle,
} from "react-native";
import { styles, searchBarStyles } from "./OrdersScreen.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "react-native";
import { formatPrice } from "../utils/currency";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useCart } from "../hooks/useCart";
import { useTranslation } from "react-i18next";
import Preloader from "../components/Preloader";
import { Colors as BrandColors } from "../constants/Colors";
import { getUserOrders } from "../lib/api";


interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  menuItem?: {
    image: string | null;
  };
}

interface Restaurant {
  id: string;
  name: string;
  deliveryCharges?: number;
  currency?: string;
  coverImage?: string;
}

export interface Order {
  id: string;
  userId: string;
  status:
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKUP_CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
  totalAmount: number;
  deliveryAddress: string;
  driverId: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  estimatedTime: number | null;
  actualTime: number | null;
  driverRating: number | null;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  restaurant?: Restaurant;
}

// ----------------------
// SearchBar Component
// ----------------------
const SearchBar = memo(
  ({
    searchQuery,
    onChangeText,
  }: {
    searchQuery: string;
    onChangeText: (text: string) => void;
  }) => {
    const { t } = useTranslation();
    return (
      <View style={searchBarStyles.container}>
        <Ionicons
          name="search"
          size={24}
          color="#6B7280"
          style={searchBarStyles.searchIcon}
        />
        <TextInput
          style={searchBarStyles.input}
          placeholder={t('orders.search_placeholder')}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onChangeText}
          underlineColorAndroid="transparent"
          returnKeyType="search"
          multiline={false}
          numberOfLines={1}
        />
      </View>
    );
  }
);


// ----------------------
// Debounce Hook
// ----------------------
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ----------------------
// OrdersScreen Component
// ----------------------
export function OrdersScreen({ navigation }: { navigation: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchTerm = useDebounce(searchQuery, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollY = new Animated.Value(0);
  const insets = useSafeAreaInsets();

  // Hook from useCart
  const addToCart = useCart((state) => state.addToCart);
  const { t, i18n } = useTranslation();

  const handleReorder = (order: Order) => {
    order.orderItems.forEach((item) => {
      addToCart({
        id: (item as any).menuItemId || item.id,
        restaurantId: order.restaurant?.id || "",
        restaurantName: order.restaurant?.name || t('orders.ref_prefix') + order.id,
        restaurantCurrency: order.restaurant?.currency,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.menuItem?.image || undefined,
        deliveryCharges: order.restaurant?.deliveryCharges,
        isTaxIncluded: (order.restaurant as any)?.isTaxIncluded,
        serviceChargeRate: (order.restaurant as any)?.serviceChargeRate,
        taxRate: (order.restaurant as any)?.taxRate
      });
    });
    navigation.navigate("CartTab");
  };


  // ----------------------
  // Fetch Orders
  // ----------------------
  const fetchOrders = useCallback(
    async (searchTerm: string = "") => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setIsSearching(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        console.log("DEBUG: Fetching orders through Vercel API for user ID:", user.id);
        
        // Use the centralized Vercel API for order history (limit to 20)
        const data = await getUserOrders(user.id, undefined, 20);
        
        
        // Ensure data is an array
        const allOrders = Array.isArray(data) ? data : (data?.data || []);

        // Apply client-side search filtering if a search term is provided
        let filteredOrders = allOrders;
        if (searchTerm) {
          filteredOrders = allOrders.filter((order: any) => 
            (order.restaurant?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.orderItems?.some((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }

        // Map data to match local Order interface if necessary and limit to 20
        const formattedOrders = filteredOrders.map((order: any) => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
        })).slice(0, 20);
        
        setOrders(formattedOrders);
      } catch (error) {
        console.error("Error fetching orders from API:", error);
        Alert.alert(t('common.error'), t('orders.load_error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setIsSearching(false);
        setIsInitialLoad(false);
      }
    },
    [isInitialLoad, t]
  );

  // Fetch orders when the debounced search term changes.
  useEffect(() => {
    fetchOrders(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchOrders]);

  // ----------------------
  // Realtime Subscription for Orders
  // ----------------------
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel("orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Order",
            filter: `userId=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime order update:", payload);
            // Re-fetch orders to reflect realtime updates
            fetchOrders(debouncedSearchTerm);
          }
        )
        .subscribe();
    }
    setupRealtime();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [fetchOrders, debouncedSearchTerm]);

  // ----------------------
  // Helpers for Order Card
  // ----------------------
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return "#FCD34D";
      case "CONFIRMED":
        return "#60A5FA";
      case "PREPARING":
      case "READY_FOR_PICKUP":
      case "PICKUP_CONFIRMED":
        return "#818CF8";
      case "OUT_FOR_DELIVERY":
        return "#34D399";
      case "DELIVERED":
        return "#10B981";
      case "CANCELLED":
        return BrandColors.primary;
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return "time-outline";
      case "CONFIRMED":
        return "checkmark-circle-outline";
      case "PREPARING":
      case "READY_FOR_PICKUP":
      case "PICKUP_CONFIRMED":
        return "restaurant-outline";
      case "OUT_FOR_DELIVERY":
        return "bicycle-outline";
      case "DELIVERED":
        return "checkmark-done-circle-outline";
      case "CANCELLED":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };
  const formatStatus = (status: string) => {
    const fallback: Record<string, string> = {
      PENDING: 'Order Placed',
      CONFIRMED: 'Order Confirmed',
      PREPARING: 'Preparing',
      READY_FOR_PICKUP: 'Ready for Pickup',
      PICKUP_CONFIRMED: 'Pickup Confirmed',
      OUT_FOR_DELIVERY: 'Out For Delivery',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return t(`orders.statuses.${status.toLowerCase()}.label` as any, fallback[status] || status);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderDetails", { order: item })}
      activeOpacity={0.7}
    >
      {/* Restaurant Header with Icon and Status */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantIconContainer}>
          {(item.restaurant?.coverImage && item.restaurant.coverImage.trim() !== "") || (item.orderItems?.[0]?.menuItem?.image) ? (
            <Image
              source={{ uri: item.restaurant?.coverImage && item.restaurant.coverImage.trim() !== "" ? item.restaurant.coverImage : item.orderItems[0].menuItem?.image || "" }}
              style={{ width: "100%", height: "100%", borderRadius: 16 }}
              resizeMode="cover"
              onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
            />
          ) : (
            <Ionicons name="restaurant" size={24} color="#9CA3AF" />
          )}
        </View>
        <View style={styles.headerContent}>
          <View style={styles.restaurantRow}>
            <Text style={styles.restaurantName} numberOfLines={1} ellipsizeMode="tail">
              {item.restaurant ? item.restaurant.name : t('orders.restaurant_fallback')}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.status === "PENDING"
                    ? "#FFF5F0"
                    : item.status === "OUT_FOR_DELIVERY"
                      ? "#EFF6FF"
                      : item.status === "DELIVERED"
                        ? "#F0FDF4"
                        : (item.status === "CONFIRMED" || item.status === "PREPARING" || item.status === "READY_FOR_PICKUP" || item.status === "PICKUP_CONFIRMED")
                          ? "#EEF2FF"
                          : "#FEF2F2"
                },
              ]}
            >
              <Text style={[
                styles.statusText,
                {
                  color: item.status === "PENDING"
                    ? BrandColors.primary
                    : item.status === "OUT_FOR_DELIVERY"
                      ? "#2563EB"
                      : item.status === "DELIVERED"
                        ? "#16A34A"
                        : (item.status === "CONFIRMED" || item.status === "PREPARING" || item.status === "READY_FOR_PICKUP" || item.status === "PICKUP_CONFIRMED")
                          ? "#4F46E5"
                          : "#DC2626"
                }
              ]}>
                {formatStatus(item.status)}
              </Text>
            </View>
          </View>
          <View style={styles.orderMetaRow}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.deliveryAddress}
            </Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Ionicons name="wallet-outline" size={14} color="#9CA3AF" />
            <Text style={styles.paymentText}>{t('orders.payment_cod')}</Text>
          </View>
        </View>
      </View>

      {/* Dashed Divider */}
      <View style={styles.dashedDivider} />

      {/* Order Items Section */}
      <View style={styles.orderItemsSection}>
        <Text style={styles.orderItemsTitle}>{t('orders.order_items')}</Text>
        {(item.orderItems || []).map((orderItem, index) => (
          <View key={`item-${orderItem.id || index}`} style={styles.orderItemContainer}>
            <View style={styles.orderItemRow}>
              <View style={styles.orderItemNameContainer}>
                <Text style={styles.orderItemQuantity}>{orderItem.quantity}×</Text>
                <Text style={styles.orderItemName} numberOfLines={1} ellipsizeMode="tail">
                  {orderItem.name}
                </Text>
              </View>
              <Text style={styles.orderItemPrice}>
                {formatPrice(orderItem.price * orderItem.quantity, item.restaurant?.currency)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Total Amount Container */}
      <View style={styles.totalAmountContainer}>
        <Text style={styles.totalAmountLabel}>{t('orders.total_amount')}</Text>
        <View style={styles.totalAmountRightContent}>
          <Text style={styles.totalAmount}>{formatPrice(item.totalAmount, item.restaurant?.currency)}</Text>
          {item.restaurant?.deliveryCharges !== undefined && (
            <Text style={styles.deliveryIncludedText}>
              {t('orders.incl_delivery', { price: formatPrice(item.restaurant.deliveryCharges, item.restaurant.currency) })}
            </Text>
          )}
        </View>
      </View>

      {/* Reorder Button */}
      <TouchableOpacity
        style={styles.reorderButton}
        onPress={(e) => {
          e.stopPropagation();
          handleReorder(item);
        }}
      >
        <Ionicons name="refresh-outline" size={18} color="#fff" />
        <Text style={styles.reorderButtonText}>{t('orders.reorder_items')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ----------------------
  // (Optional) Animated header height interpolation
  // ----------------------
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 130],
    extrapolate: "clamp",
  });

  // ----------------------
  // Render
  // ----------------------
  if (loading) {
    return (
      <Preloader fullScreen={true} />
    );
  }


  return (
    <View style={styles.container}>
      {/* Premium Your Orders Header */}
      <View style={[styles.header, { 
        height: 185 + insets.top, 
        paddingTop: insets.top + 12,
        backgroundColor: '#FFF7ED',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden'
      }]}>
        
        {/* Decorative Background Elements */}
        <View style={{ position: 'absolute', right: 10, bottom: 10, opacity: 0.1 }}>
          <Ionicons name="bag-handle-outline" size={110} color="#EA580C" />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Header Icon */}
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#FFedd5',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#FED7AA'
          }}>
            <MaterialCommunityIcons name="shopping" size={20} color="#EA580C" />
          </View>

          <Text style={styles.heroTitle}>
            {t("orders.your_orders", { defaultValue: "Your Orders" })}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t("orders.reorder_fav", { defaultValue: "Reorder your favorites anytime" })}
          </Text>
        </View>
      </View>

      {/* Orders list */}
      <Animated.FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 60 + insets.bottom, paddingTop: 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>{t('orders.no_orders')}</Text>
            <TouchableOpacity
              style={styles.browseButton}
              activeOpacity={1}
              onPress={() => navigation.navigate("HomeTab", { screen: "Restaurants" })}
            >
              <Text style={styles.browseButtonText}>{t('orders.browse_restaurants')}</Text>
            </TouchableOpacity>
          </View>
        }

        ListHeaderComponent={
          <View style={styles.loadingContainer}>
            {isSearching && !refreshing && (
              <ActivityIndicator size="small" color={BrandColors.primary} />
            )}
          </View>
        }
      />
    </View>
  );
}

// ----------------------
// Styles
// ----------------------

export default OrdersScreen;

