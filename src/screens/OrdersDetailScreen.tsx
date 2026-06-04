import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { formatPrice } from "../utils/currency";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getOrderById, getRestaurantByIdFromAPI } from "../lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { Colors as BrandColors } from "../constants/Colors";
import { sendLocalNotification } from "../lib/notifications";
import { useRef } from "react";
import { formatDeliveryTimeLabel } from "../utils/deliveryTime";
import Preloader from "../components/Preloader";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options?: string;
  menuItem?: {
    image: string | null;
  };
}

interface RestaurantDetails {
  id: string;
  name: string;
  currency?: string;
  coverImage?: string;
  cuisineType?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  deliveryCharges?: number;
  deliveryTime?: string;
  phoneNumber?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  totalAmount: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  deliveryAddress: string;
  driverId: string | null;
  assignedDriver: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  estimatedTime: number | null;
  actualTime: number | null;
  driverRating: number | null;
  createdAt: string;
  updatedAt: string;
  orderItems?: OrderItem[];
  restaurant?: RestaurantDetails;
}

type RootStackParamList = {
  OrderDetails: { order: Order };
};

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;

const statusSteps = [
  { key: "PENDING", icon: "receipt-outline" as const },
  { key: "CONFIRMED", icon: "checkmark-circle-outline" as const },
  { key: "PREPARING", icon: "restaurant-outline" as const },
  { key: "OUT_FOR_DELIVERY", icon: "bicycle-outline" as const },
  { key: "DELIVERED", icon: "cube-outline" as const },
];

const statusI18nKey: Record<string, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const getHeroStatusIcon = (status: Order["status"]) => {
  switch (status) {
    case "DELIVERED":
      return "checkmark-done-circle";
    case "OUT_FOR_DELIVERY":
      return "bicycle";
    case "PREPARING":
      return "restaurant";
    case "CONFIRMED":
      return "checkmark-circle";
    case "CANCELLED":
      return "close-circle";
    default:
      return "receipt";
  }
};

export function OrderDetailsScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [currentOrder, setCurrentOrder] = useState<Order>(() => ({
    ...order,
    restaurant: order.restaurant || { id: "", name: t("orders.restaurant_fallback") },
    orderItems: order.orderItems || [],
  }));

  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState<RestaurantDetails | null>(null);

  const deliveryTimeDisplay = useMemo(() => {
    return formatDeliveryTimeLabel(
      (restaurantDetails as any)?.deliveryTime ?? currentOrder.estimatedTime,
      currentOrder.estimatedTime || 30,
      t("orders.details.mins")
    );
  }, [restaurantDetails, currentOrder.estimatedTime, t]);

  const currentStepIndex = Math.max(
    0,
    statusSteps.findIndex((step) => step.key === currentOrder.status)
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderData, restData] = await Promise.all([
        getOrderById(order.id),
        currentOrder.restaurantId ? getRestaurantByIdFromAPI(currentOrder.restaurantId) : Promise.resolve(null),
      ]);

      if (orderData) {
        setCurrentOrder((prev) => ({
          ...prev,
          ...(orderData as any),
          orderItems: (orderData.orderItems as any) || prev.orderItems || [],
        }));
      }

      if (restData) {
        setRestaurantDetails(restData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [order.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`order-details-${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Order", filter: `id=eq.${order.id}` },
        (payload) => {
          setCurrentOrder((prev) => ({
            ...prev,
            ...((payload.new as Order) || {}),
            orderItems: (payload.new as Order)?.orderItems || prev.orderItems || [],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (currentOrder?.status) {
      sendLocalNotification({
        title: t(`orders.statuses.${currentOrder.status.toLowerCase()}.header_title`, { defaultValue: "Order Update" }),
        body: t(`orders.statuses.${currentOrder.status.toLowerCase()}.header_desc`, { defaultValue: "Your order status has changed." }),
      });
    }
  }, [currentOrder?.status]);

  const parsedAddress = (() => {
    try {
      const addr = JSON.parse(currentOrder.deliveryAddress);
      return {
        main: addr.street_address || addr.street || t("orders.details.no_address"),
        sub: `${addr.city}, ${addr.state} ${addr.zipCode || addr.postal_code || ""}`.trim(),
      };
    } catch {
      return { main: currentOrder.deliveryAddress, sub: "" };
    }
  })();

  const fullAddress = parsedAddress.sub
    ? `${parsedAddress.main}, ${parsedAddress.sub}`
    : parsedAddress.main;

  const billSummary = useMemo(() => {
    const currency = currentOrder.restaurant?.currency;
    const subtotal = (currentOrder.orderItems || []).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxAmount = currentOrder.taxAmount ?? 0;
    const serviceChargeAmount = currentOrder.serviceChargeAmount ?? 0;
    const restaurantDelivery = restaurantDetails?.deliveryCharges ?? 0;
    const inferredDelivery = Math.max(
      0,
      currentOrder.totalAmount - subtotal - taxAmount - serviceChargeAmount
    );
    const deliveryFee =
      restaurantDelivery > 0 ? restaurantDelivery : inferredDelivery;

    return {
      currency,
      subtotal,
      deliveryFee,
      taxAmount,
      serviceChargeAmount,
      total: currentOrder.totalAmount,
    };
  }, [currentOrder, restaurantDetails]);

  const handleCallRestaurant = () => {
    const phone = restaurantDetails?.phoneNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const getStatusTitle = (status: string) => {
    const key = statusI18nKey[status] || "pending";
    return t(`orders.statuses.${key}.header_title`);
  };

  const getStatusDesc = (status: string) => {
    const key = statusI18nKey[status] || "pending";
    const desc = t(`orders.statuses.${key}.header_desc`);
    if (desc && !desc.startsWith("orders.statuses")) return desc;
    return t(`orders.statuses.${key}.bottom_subtitle`);
  };

  const getStepLabel = (stepKey: string) => {
    const key = statusI18nKey[stepKey] || "pending";
    return t(`orders.statuses.${key}.label`);
  };

  const timelineProgress =
    currentStepIndex <= 0
      ? 0
      : currentStepIndex / Math.max(statusSteps.length - 1, 1);

  if (loading && !currentOrder.id) {
    return <Preloader fullScreen label={t("common.processing")} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('OrdersScreen' as any);
          }
        }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t("orders.details.title")}</Text>
          <Text style={styles.headerSubtitle}>#{currentOrder.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <View
              style={[
                styles.statusIconCircle,
                currentOrder.status === "DELIVERED" && styles.statusIconCircleSuccess,
                currentOrder.status === "CANCELLED" && styles.statusIconCircleCancelled,
              ]}
            >
              <Ionicons
                name={getHeroStatusIcon(currentOrder.status) as any}
                size={32}
                color={BrandColors.primary}
              />
            </View>
          </View>

          <Text style={styles.statusTitle}>{getStatusTitle(currentOrder.status)}</Text>
          <Text style={styles.statusDesc}>{getStatusDesc(currentOrder.status)}</Text>

          {/* Order progress timeline */}
          <View style={styles.timelineSection}>
            <View style={styles.timelineTrackWrap}>
              <View style={styles.timelineTrackBg} />
              <View
                style={[
                  styles.timelineTrackFill,
                  { width: `${Math.min(100, timelineProgress * 100)}%` },
                ]}
              />
              <View style={styles.timelineIconsRow}>
                {statusSteps.map((step, index) => {
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <View key={step.key} style={styles.timelineStep}>
                      <View
                        style={[
                          styles.timelineIcon,
                          isActive && styles.timelineIconActive,
                          isCurrent && styles.timelineIconCurrent,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={15}
                          color={isActive ? "#fff" : "#9CA3AF"}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.timelineLabelsRow}>
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <View key={`${step.key}-label`} style={styles.timelineLabelWrap}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isActive && styles.timelineLabelActive,
                        isCurrent && styles.timelineLabelCurrent,
                      ]}
                      numberOfLines={2}
                    >
                      {getStepLabel(step.key)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Delivery Card */}
        <LinearGradient
          colors={[BrandColors.primary, "#FF7043", "#FF8A65"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.deliveryCard}
        >
          <View style={styles.deliveryCardDecor}>
            <Ionicons name="bicycle-outline" size={120} color="rgba(255,255,255,0.12)" />
          </View>

          <View style={styles.deliveryCardContent}>
            <Text style={styles.deliveryLabel}>
              {t("orders.details.estimated_delivery").toUpperCase()}
            </Text>
            <Text style={styles.deliveryTime}>{deliveryTimeDisplay}</Text>

            <View style={styles.priorityBadge}>
              <Ionicons name="flash-outline" size={14} color="#fff" />
              <Text style={styles.priorityText}>
                {t("orders.details.delivery_priority")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => setShowDetails(!showDetails)}
              activeOpacity={0.9}
            >
              <Text style={styles.viewDetailsText}>
                {showDetails
                  ? t("orders.details.hide_details")
                  : t("orders.details.view_order_details")}
              </Text>
              <Ionicons
                name={showDetails ? "chevron-down" : "chevron-forward"}
                size={18}
                color={BrandColors.primary}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {/* Order Details (Collapsible) */}
        {showDetails && (
          <View style={styles.detailsCard}>
            {(currentOrder.orderItems || []).map((item, idx) => (
              <View key={idx} style={[styles.detailRow, { alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 }}>
                  <Image
                    source={item.menuItem?.image ? { uri: item.menuItem.image } : require('../../assets/placeholder.png')}
                    style={{ width: 44, height: 44, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6' }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailName, { color: '#111827', fontWeight: '700', fontSize: 14 }]} numberOfLines={2}>
                      {item.quantity}x {item.name}
                    </Text>
                    {item.options ? (
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {(() => {
                          try {
                            const parsed = JSON.parse(item.options);
                            if (Array.isArray(parsed)) {
                              return parsed.map((opt: any) => opt.name || opt).join(", ");
                            } else if (typeof parsed === 'object' && parsed !== null) {
                              return Object.values(parsed).join(", ");
                            }
                            return item.options;
                          } catch {
                            return item.options;
                          }
                        })()}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.detailPrice}>{formatPrice(item.price * item.quantity, currentOrder.restaurant?.currency)}</Text>
              </View>
            ))}
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailTotalLabel}>{t("orders.details.total_amount")}</Text>
              <Text style={styles.detailTotalValue}>{formatPrice(currentOrder.totalAmount, currentOrder.restaurant?.currency)}</Text>
            </View>
          </View>
        )}
        {/* Restaurant Card */}
        <View style={styles.infoCard}>
          <Image
            source={{ uri: restaurantDetails?.coverImage || "https://via.placeholder.com/72" }}
            style={styles.restaurantLogo}
            resizeMode="cover"
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {currentOrder.restaurant?.name || t("orders.restaurant_fallback")}
            </Text>
            <View style={styles.restaurantMetaRow}>
              <Text style={styles.restaurantMetaText}>
                {restaurantDetails?.cuisineType || t("orders.restaurant_fallback")}
              </Text>
              <Text style={styles.restaurantMetaDot}>•</Text>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.restaurantMetaText}>
                {restaurantDetails?.rating != null
                  ? Number(restaurantDetails.rating).toFixed(1)
                  : "4.5"}
              </Text>
              <Text style={styles.restaurantMetaDot}>•</Text>
              <Text style={styles.restaurantMetaText}>{deliveryTimeDisplay}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallRestaurant}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color={BrandColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={20} color={BrandColors.primary} />
          </View>
          <View style={styles.infoCardBody}>
            <Text style={styles.sectionLabel}>
              {t("orders.details.delivery_address").toUpperCase()}
            </Text>
            <Text style={styles.addressLine} numberOfLines={3}>
              {fullAddress}
            </Text>
          </View>
        </View>

        {/* Notification Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={20} color={BrandColors.primary} />
          </View>
          <View style={styles.infoCardBody}>
            <Text style={styles.notificationTitle}>
              {t("orders.details.notification_title")}
            </Text>
            <Text style={styles.notificationDesc}>
              {t("orders.details.notification_desc")}
            </Text>
          </View>
          <View style={styles.notificationBell}>
            <Ionicons name="notifications" size={20} color="#fff" />
          </View>
        </View>

        {/* Bill Summary Card */}
        <View style={[styles.infoCard, styles.billCard]}>
          <View style={styles.billHeader}>
            <Ionicons name="receipt-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.sectionLabel}>
              {t("orders.details.bill_summary").toUpperCase()}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billRowLabel}>{t("orders.details.subtotal")}</Text>
            <Text style={styles.billRowValue}>
              {formatPrice(billSummary.subtotal, billSummary.currency)}
            </Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billRowLabel}>{t("orders.details.delivery_fee")}</Text>
            <Text style={styles.billRowValue}>
              {formatPrice(billSummary.deliveryFee, billSummary.currency)}
            </Text>
          </View>
          {billSummary.serviceChargeAmount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>{t("orders.details.service_charge")}</Text>
              <Text style={styles.billRowValue}>
                {formatPrice(billSummary.serviceChargeAmount, billSummary.currency)}
              </Text>
            </View>
          ) : null}
          {billSummary.taxAmount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>{t("orders.details.tax")}</Text>
              <Text style={styles.billRowValue}>
                {formatPrice(billSummary.taxAmount, billSummary.currency)}
              </Text>
            </View>
          ) : null}

          <View style={styles.billDashedLine} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>{t("orders.details.total_paid")}</Text>
            <Text style={styles.billTotalValue}>
              {formatPrice(billSummary.total, billSummary.currency)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_SURFACE = "#FFFBF8";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_SURFACE,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE7D6",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },

  // Status Card
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIconContainer: {
    alignItems: "center",
    marginBottom: 18,
  },
  statusIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  statusIconCircleSuccess: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  statusIconCircleCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  statusDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Timeline
  timelineSection: {
    paddingTop: 4,
  },
  timelineTrackWrap: {
    position: "relative",
    height: 40,
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  timelineTrackBg: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  timelineTrackFill: {
    position: "absolute",
    left: "10%",
    top: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.primary,
    maxWidth: "80%",
  },
  timelineIconsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  timelineStep: {
    flex: 1,
    alignItems: "center",
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  timelineIconActive: {
    backgroundColor: BrandColors.primary,
  },
  timelineIconCurrent: {
    backgroundColor: BrandColors.primary,
    borderColor: "#FFEDD5",
    transform: [{ scale: 1.08 }],
  },
  timelineLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 4,
  },
  timelineLabelWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
    minHeight: 32,
  },
  timelineLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
  timelineLabelActive: {
    color: "#374151",
    fontWeight: "600",
  },
  timelineLabelCurrent: {
    color: BrandColors.primary,
    fontWeight: "700",
  },

  // Delivery Card
  deliveryCard: {
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  deliveryCardDecor: {
    position: "absolute",
    right: -20,
    bottom: -24,
    opacity: 1,
  },
  deliveryCardContent: {
    zIndex: 1,
  },
  deliveryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  deliveryTime: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    gap: 6,
  },
  priorityText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  viewDetailsButton: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.primary,
  },

  // Details Card
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailName: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  detailTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  detailTotalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.primary,
  },

  // Info cards (restaurant, address, notification, bill)
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: BrandColors.gray[100],
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  restaurantMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  restaurantMetaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  restaurantMetaDot: {
    fontSize: 14,
    color: "#9CA3AF",
    marginHorizontal: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCardBody: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A8A29E",
    letterSpacing: 1,
    marginBottom: 6,
  },
  addressLine: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  notificationDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  notificationBell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  billCard: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  billHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billRowLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  billRowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  billDashedLine: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    marginVertical: 4,
    marginBottom: 16,
  },
  billTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  billTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: BrandColors.primary,
  },
});

export default OrderDetailsScreen;
