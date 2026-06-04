import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  Dimensions,
  Keyboard,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, searchRestaurants, searchMenuItems, getPopularFoodCategories } from "../lib/supabase";
import { useNavigation, useRoute, useFocusEffect, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useCart } from "../hooks/useCart";
import { Colors as BrandColors } from "../constants/Colors";
import { getRestaurantsFromAPI } from "../lib/api";
import { ShopByCategory } from "../components/ShopByCategory";
import { formatPrice } from "../utils/currency";
import Preloader, { PulseDotsLoader, RestaurantCardSkeleton } from "../components/Preloader";
import QuantitySelector from "../components/QuantitySelector";
import ProductDetailModal from "../components/ProductDetailModal";
import { styles } from "./HomeScreen.styles";
import { useLocation } from "../hooks/useLocation";
import { getDistance } from "../utils/geo";
import { useSettings } from "../hooks/useSettings";
import { resolveDeliveryCharge } from "../utils/delivery";
import { useDebounce } from "../hooks/useDebounce";

export type ExploreScreenParams = {
  storeType?: string;
  categoryName?: string;
};

type ExploreRouteProp = RouteProp<{ Explore: ExploreScreenParams }, 'Explore'>;

export function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<ExploreRouteProp>();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularMenuItems, setPopularMenuItems] = useState<any[]>([]);
  const [popularLoading, setPopularLoading] = useState<boolean>(true);
  const [popularFoodCategories, setPopularFoodCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null);
  const [categoryTitle, setCategoryTitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const storeType = route.params?.storeType ?? null;
      const name = route.params?.categoryName ?? null;
      setSelectedStoreType(storeType);
      setCategoryTitle(name);
      setSearchQuery('');
    }, [route.params?.storeType, route.params?.categoryName])
  );

  const getStoreType = useCallback((item: { storeType?: string; store_type?: string; Restaurant?: { storeType?: string; store_type?: string } }) => {
    const raw = item.storeType ?? item.store_type ?? item.Restaurant?.storeType ?? item.Restaurant?.store_type;
    return raw ? String(raw).toUpperCase() : '';
  }, []);

  const matchesStoreType = useCallback(
    (item: { storeType?: string; store_type?: string; Restaurant?: { storeType?: string; store_type?: string } }) => {
      if (!selectedStoreType) return true;
      return getStoreType(item) === selectedStoreType.toUpperCase();
    },
    [selectedStoreType, getStoreType]
  );

  const isCategoryBrowse = Boolean(selectedStoreType && categoryTitle);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [searchRestaurantsResults, setSearchRestaurantsResults] = useState<any[]>([]);
  const [searchMenuResults, setSearchMenuResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const { coords } = useLocation();
  const { deliveryRadius } = useSettings();
  const { cartItems, addToCart, removeFromCart } = useCart();
  const insets = useSafeAreaInsets();

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRestaurantsFromAPI();
      setRestaurants(data || []);
    } catch (error: any) {
      const { data: fallbackData } = await supabase
        .from("Restaurant")
        .select(`
          id, 
          name, 
          chainName, 
          address, 
          latitude, 
          longitude, 
          cuisineType, 
          segment, 
          city, 
          area, 
          rating, 
          coverImage, 
          deliveryTime, 
          minimumOrder, 
          deliveryCharges, 
          currency, 
          isActive, 
          acceptsScheduledOrders, 
          deliverySlotDuration, 
          preparationTime, 
          closedDate,
          storeType,
          DeliverySlot (id, dayOfWeek, startTime, endTime), 
          menuItems: MenuItem (id, label, price, image, description, category)
        `)
        .order("rating", { ascending: false });


      setRestaurants(fallbackData || []);
    } finally {
      setLoading(false);
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      console.log("[ExploreScreen] Fetching categories with coords:", coords);
      const data = await getPopularFoodCategories(coords?.latitude, coords?.longitude, 10);
      setPopularFoodCategories(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCategoriesLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    fetchRestaurants();
    if (!selectedStoreType) {
      fetchCategories();
    } else {
      setPopularFoodCategories([]);
      setCategoriesLoading(false);
    }
    const sub = supabase.channel("restaurants").on("postgres_changes", { event: "*", schema: "public", table: "Restaurant" }, () => {
      fetchRestaurants();
      if (!selectedStoreType) fetchCategories();
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchRestaurants, fetchCategories, selectedStoreType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  }, [fetchRestaurants]);

  // Robust Search Effect
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (debouncedSearch.trim().length >= 1) {
        setSearchLoading(true);
        try {
          if (coords) {
            let resResults = [];
            let itemResults = [];
            const radius = deliveryRadius || 50;
            const [localRes, localItems] = await Promise.all([
              searchRestaurants(debouncedSearch, coords.latitude, coords.longitude, radius),
              searchMenuItems(debouncedSearch, coords.latitude, coords.longitude, radius),
            ]);
            resResults = localRes;
            itemResults = localItems;

            // If no local matches, fallback to global to ensure we show results if they exist
            if (resResults.length === 0 && itemResults.length === 0) {
              const [globalRes, globalItems] = await Promise.all([
                searchRestaurants(debouncedSearch, coords.latitude, coords.longitude, 99999),
                searchMenuItems(debouncedSearch, coords.latitude, coords.longitude, 99999),
              ]);
              resResults = globalRes;
              itemResults = globalItems;
            }

            if (active) {
              setSearchRestaurantsResults(resResults);
              setSearchMenuResults(itemResults);
            }
          } else {
            if (active) {
              setSearchRestaurantsResults([]);
              setSearchMenuResults([]);
            }
          }
        } catch (error) {
          console.error(error);
        } finally {
          if (active) setSearchLoading(false);
        }
      } else {
        if (active) {
          setSearchRestaurantsResults([]);
          setSearchMenuResults([]);
          setSearchLoading(false);
        }
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [debouncedSearch, coords, deliveryRadius]);

  // Handle Category Filtering & Nearby List
  useEffect(() => {
    const effectiveCoords = coords;
    const radius = typeof deliveryRadius === 'string' ? parseFloat(deliveryRadius) : (deliveryRadius || 50);

    if (restaurants.length > 0 && !searchQuery.trim()) {
      let filtered = restaurants;

      if (selectedStoreType) {
        filtered = filtered.filter((item) => getStoreType(item) === selectedStoreType.toUpperCase());
      }

      let nearby: any[] = [];
      if (effectiveCoords) {
        nearby = filtered.filter((restaurant) => {
          if (!restaurant.latitude || !restaurant.longitude) return false;
          try {
            return getDistance(effectiveCoords.latitude, effectiveCoords.longitude, restaurant.latitude, restaurant.longitude) <= radius;
          } catch (error) {
            return false;
          }
        });
      }

      if (selectedStoreType) {
        setNearbyRestaurants(nearby.length > 0 ? nearby : effectiveCoords ? [] : filtered);
      } else {
        setNearbyRestaurants(nearby.length > 0 ? nearby : filtered.slice(0, 10));
      }
    } else if (searchQuery.trim()) {
      // Clear nearby if searching
      setNearbyRestaurants([]);
    } else {
      setNearbyRestaurants([]);
    }
  }, [coords, restaurants, deliveryRadius, selectedStoreType, searchQuery]);

  useEffect(() => {
    if (nearbyRestaurants.length === 0 || searchQuery.trim()) {
      setPopularMenuItems([]);
      setPopularLoading(false);
      return;
    }
    setPopularLoading(true);
    const allItems = nearbyRestaurants.flatMap((restaurant: any) => {
      const items = restaurant.menuItems || restaurant.MenuItem || restaurant.items || [];
      return items.map((item: any) => ({ ...item, Restaurant: restaurant, rating: restaurant.rating }));
    });
    setPopularMenuItems(allItems.filter((item: any) => item && (item.id || item.label)).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10));
    setPopularLoading(false);
  }, [nearbyRestaurants, searchQuery]);

  const handleSearchResultSelect = (type: 'restaurant' | 'menuItem', item: any) => {
    Keyboard.dismiss();
    if (type === 'restaurant') {
      navigation.navigate("RestaurantDetails", { restaurant: item });
    } else {
      setSelectedProduct(item);
      setIsProductModalVisible(true);
    }
  };

  const handleModalAddToCart = (menuItem: any, quantity: number, selectedOptions: any[] = []) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    const restaurant = menuItem.Restaurant || {
      id: menuItem.restaurantId,
      name: menuItem.restaurantName || t('orders.restaurant_fallback'),
      currency: menuItem.restaurantCurrency || t('common.currency_default')
    };

    addToCart({
      id: menuItem.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantCurrency: restaurant.currency,
      name: menuItem.label || menuItem.name,
      price: menuItem.price,
      quantity: quantity,
      image: menuItem.image,
      deliveryCharges: resolveDeliveryCharge(restaurant, fallbackDeliveryFee),
      selectedOptions: selectedOptions
    }, true);

    setIsProductModalVisible(false);
  };

  if (loading) return <Preloader fullScreen={true} />;

  // Match Home screen header height
  const EXPLORE_HEADER_HEIGHT = 135 + insets.top;

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      {/* Premium Polished Header — same height as Home, content centered vertically */}
      <LinearGradient
        colors={['#FFF7ED', '#FFFAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: EXPLORE_HEADER_HEIGHT,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          paddingHorizontal: 20,
          paddingTop: insets.top,
          paddingBottom: 8,
          position: 'relative',
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        <View style={{
          position: 'absolute',
          bottom: -10,
          right: -25,
          opacity: 0.12,
          transform: [{ rotate: '-10deg' }]
        }}>
          <Ionicons name="bag-handle-outline" size={190} color={BrandColors.primary} />
        </View>

        <View style={{ width: '100%', justifyContent: 'center' }}>
          {categoryTitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginRight: 10, padding: 2 }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <Text
                style={{
                  flex: 1,
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#111827',
                  lineHeight: 28,
                  letterSpacing: -0.5,
                }}
                numberOfLines={2}
              >
                {categoryTitle}
              </Text>
            </View>
          ) : (
            <View style={styles.brandTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: '#6B7280' }}>
                  {t('home.good_morning')}
                </Text>
                <Ionicons name="sunny" size={16} color="#F59E0B" style={{ marginLeft: 6 }} />
              </View>
              <View style={{ maxWidth: '85%' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 32, letterSpacing: -0.5 }}>
                  {t('home.what_looking_for')}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.searchBar, { marginTop: 12 }]}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={t('home.search_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim().length > 0) setSearchLoading(true);
              }}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          backgroundColor: '#fff'
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.length === 0 ? (
          <>
            {/* Food cuisine chips — only on general Explore, not when browsing a store category */}
            {!isCategoryBrowse && (
            <View style={styles.section}>
              {categoriesLoading ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}><PulseDotsLoader size={8} /></View>
              ) : popularFoodCategories.length > 0 ? (
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ width: '100%', marginTop: 8 }}
                    contentContainerStyle={{ 
                      paddingBottom: 8, 
                      gap: 16, 
                      flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' 
                    }}
                  >
                  {popularFoodCategories.map((cat, index) => (
                    <TouchableOpacity 
                      key={`${cat.id}-${index}`} 
                      style={{ 
                        width: 60, 
                        height: 85, 
                        alignItems: 'center',
                        justifyContent: 'flex-start'
                      }} 
                      onPress={() => {
                        setSearchQuery(cat.name);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        width: 55,
                        height: 55,
                        borderRadius: 14,
                        overflow: 'hidden',
                        backgroundColor: '#F3F4F6',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        marginBottom: 6,
                      }}>
                        <Image 
                          source={{ uri: cat.image || 'https://via.placeholder.com/150' }} 
                          style={{ width: '100%', height: '100%' }} 
                          resizeMode="cover" 
                        />
                      </View>
                      <Text style={{ 
                        color: '#4B5563', 
                        fontWeight: '700', 
                        fontSize: 10, 
                        textAlign: 'center', 
                      }} numberOfLines={2}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Inline See All for Categories */}
                  <TouchableOpacity 
                    style={{ 
                      width: 60, 
                      height: 85, 
                      alignItems: 'center',
                      justifyContent: 'flex-start'
                    }} 
                    onPress={() => {}} // Already on explore, maybe just scroll to top?
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 55,
                      height: 55,
                      borderRadius: 14,
                      backgroundColor: '#FFF1F2',
                      borderWidth: 1,
                      borderColor: BrandColors.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6,
                    }}>
                      <Ionicons name="arrow-up" size={20} color={BrandColors.primary} />
                    </View>
                    <Text style={{ 
                      color: BrandColors.primary, 
                      fontWeight: '800', 
                      fontSize: 10, 
                      textAlign: 'center', 
                    }}>{t('common.back_to_top', 'Top')}</Text>
                  </TouchableOpacity>
                </ScrollView>
                </View>
              ) : null}
            </View>
            )}

            {/* Popular Products */}
            <View style={[styles.section, { marginTop: isCategoryBrowse ? 20 : 32 }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {isCategoryBrowse
                      ? t('home.products_in_category', { category: categoryTitle })
                      : t('home.popular_dishes')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => (navigation as any).navigate("Restaurants")} activeOpacity={0.7}>
                  <Text style={styles.seeAllButton}>{t('home.see_all')}</Text>
                </TouchableOpacity>
              </View>
              {popularLoading ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}><PulseDotsLoader size={8} /></View>
              ) : popularMenuItems.length > 0 ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={{ width: '100%', marginTop: isCategoryBrowse ? 10 : 16 }}
                    contentContainerStyle={[
                      styles.popularDishes, 
                      { 
                        paddingBottom: isCategoryBrowse ? 4 : 20,
                        flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' 
                      }
                    ]}
                  >
                  {popularMenuItems.map((dish) => (
                    <TouchableOpacity key={dish.id} style={styles.modernDishCard} onPress={() => { setSelectedProduct(dish); setIsProductModalVisible(true); }}>
                      <View style={styles.dishImageBg}>
                        <Image source={{ uri: dish.image || 'https://via.placeholder.com/150' }} style={styles.dishImage} resizeMode="contain" />
                        <QuantitySelector
                          initialQuantity={cartItems.find(item => item.id === dish.id)?.quantity || 0}
                          onUpdate={(newQty) => handleModalAddToCart(dish, newQty)}
                          containerStyle={styles.dishQuantitySelector}
                          size="small"
                        />
                      </View>
                      <View style={styles.dishCardInfo}>
                        <Text style={styles.dishName} numberOfLines={1}>{dish.label || t('home.unknown_dish')}</Text>
                        <View style={styles.dishMeta}>
                          <Text style={styles.dishPrice}>{formatPrice(dish.price || 0, dish.Restaurant?.currency)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                </View>
              ) : (
                <Text style={styles.noDataText}>
                  {isCategoryBrowse
                    ? t('home.no_products_in_category', { category: categoryTitle })
                    : t('home.no_popular_dishes')}
                </Text>
              )}
            </View>

            {/* Nearby Restaurants */}
            <View style={[styles.section, { marginTop: isCategoryBrowse ? 12 : 32 }]}>
              <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {isCategoryBrowse
                      ? t('home.stores_in_category', { category: categoryTitle })
                      : t('home.nearby_restaurants')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("Restaurants")}>
                  <Text style={styles.seeAllButton}>{t('home.see_all')}</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 8 }}>
                  <RestaurantCardSkeleton />
                  <RestaurantCardSkeleton />
                  <RestaurantCardSkeleton />
                </View>
              ) : nearbyRestaurants.length > 0 ? (
                nearbyRestaurants.map((restaurant) => (
                  <TouchableOpacity key={restaurant.id} style={styles.restaurantCard} onPress={() => navigation.navigate("RestaurantDetails", { restaurant })} activeOpacity={1}>
                    <Image source={{ uri: restaurant.coverImage || 'https://via.placeholder.com/350x200' }} style={styles.restaurantImage} defaultSource={require('../../assets/placeholder.png')} />
                    <View style={styles.restaurantInfo}>
                      <View style={styles.restaurantHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
                          <Text style={styles.restaurantCuisine} numberOfLines={1}>{restaurant.cuisineType} • {restaurant.segment}</Text>
                        </View>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.ratingText}>{restaurant.rating ? Number(restaurant.rating).toFixed(1) : '5.0'}</Text>
                        </View>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>
                          {t('restaurant.delivery')}: {restaurant.deliveryTime || t('common.delivery_time_range_default')} {t('common.min')}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="cash-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>
                          {t('restaurant.min_order')}: {formatPrice(restaurant.minimumOrder || 0, restaurant.currency)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noDataText}>
                  {isCategoryBrowse
                    ? t('home.no_stores_in_category', { category: categoryTitle })
                    : t('home.no_nearby_restaurants')}
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={{ flex: 1, paddingTop: 12 }}>
            {searchLoading ? (
              <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
                <PulseDotsLoader />
                <Text style={[styles.searchEmptyText, { marginTop: 4 }]}>
                  {t('home.searching_deliciousness')}
                </Text>
              </View>
            ) : searchRestaurantsResults.length === 0 && searchMenuResults.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 10, paddingHorizontal: 30 }}>
                {/* Premium Component-based Illustration */}
                <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: '#FFF7ED',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFF7ED', opacity: 0.5 }} />
                    <Ionicons name="sparkles" size={24} color="#FFEDD5" style={{ position: 'absolute', top: 10, right: -20 }} />
                    <View style={{ position: 'absolute', bottom: 20, left: -10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FED7AA' }} />
                    <View style={{
                      width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', elevation: 5, shadowColor: '#EA580C',
                      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: '#FFEDD5',
                    }}>
                      <Ionicons name="search" size={38} color="#EA580C" />
                    </View>
                    <View style={{
                      position: 'absolute', bottom: -5, right: -5, backgroundColor: '#fff', padding: 8, borderRadius: 16,
                      elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
                      borderWidth: 1, borderColor: '#F3F4F6',
                    }}>
                      <MaterialCommunityIcons name="store-search-outline" size={24} color="#EA580C" />
                    </View>
                  </View>
                </View>

                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                  {t('search.no_results_found')}
                </Text>
                <Text style={styles.searchEmptyText}>
                  {t('search.no_results_subtitle')}
                </Text>

                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={{
                    backgroundColor: BrandColors.primary, width: '100%', paddingVertical: 16, borderRadius: 30,
                    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 12,
                    elevation: 4, shadowColor: BrandColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('home.search_again')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Matching Stores */}
                {searchRestaurantsResults.filter(matchesStoreType).length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>{t('search.restaurants')}</Text>
                      </View>
                    </View>
                    {searchRestaurantsResults.filter(matchesStoreType).map((restaurant) => (
                      <TouchableOpacity key={restaurant.id} style={styles.restaurantCard} onPress={() => handleSearchResultSelect('restaurant', restaurant)} activeOpacity={1}>
                        <Image source={{ uri: restaurant.coverImage || 'https://via.placeholder.com/350x200' }} style={styles.restaurantImage} defaultSource={require('../../assets/placeholder.png')} />
                        <View style={styles.restaurantInfo}>
                          <View style={styles.restaurantHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
                              <Text style={styles.restaurantCuisine}>{restaurant.cuisineType} • {restaurant.area}</Text>
                            </View>
                            <View style={styles.ratingContainer}>
                              <Ionicons name="star" size={16} color="#FFD700" />
                              <Text style={styles.ratingText}>{restaurant.rating ? Number(restaurant.rating).toFixed(1) : '5.0'}</Text>
                            </View>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color="#6B7280" />
                            <Text style={styles.metaText}>
                              {t('restaurant.delivery')}: {restaurant.deliveryTime || t('common.delivery_time_range_default')} {t('common.min')}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="cash-outline" size={16} color="#6B7280" />
                            <Text style={styles.metaText}>
                              {t('restaurant.min_order')}: {formatPrice(restaurant.minimumOrder || 0, restaurant.currency)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Matching Items */}
                {searchMenuResults.filter(matchesStoreType).length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>{t('search.menu_items')}</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[styles.popularDishes, { paddingHorizontal: 20 }]}
                    >
                      {searchMenuResults.filter(matchesStoreType).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.modernDishCard}
                          onPress={() => handleSearchResultSelect('menuItem', item)}
                          activeOpacity={0.9}
                        >
                          <View style={styles.dishImageBg}>
                            <Image
                              source={{ uri: item.image || 'https://via.placeholder.com/150' }}
                              style={styles.dishImage}
                              resizeMode="contain"
                            />
                            <QuantitySelector
                              initialQuantity={cartItems.find(i => i.id === item.id)?.quantity || 0}
                              onUpdate={(newQty) => handleModalAddToCart(item, newQty)}
                              containerStyle={styles.dishQuantitySelector}
                              size="small"
                            />
                          </View>
                          <View style={styles.dishCardInfo}>
                            <Text style={styles.dishName} numberOfLines={1}>{item.label || item.name}</Text>
                            <View style={styles.dishMeta}>
                              <Text style={styles.dishPrice}>{formatPrice(item.price, item.restaurantCurrency)}</Text>
                              <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={14} color="#FFD700" />
                                <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
                              </View>
                            </View>
                            <Text style={styles.dishRestaurantName} numberOfLines={1}>
                              {item.restaurantName}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <ProductDetailModal
        isVisible={isProductModalVisible}
        onClose={() => setIsProductModalVisible(false)}
        product={selectedProduct}
        restaurant={selectedProduct?.Restaurant || {
          id: selectedProduct?.restaurantId,
          name: selectedProduct?.restaurantName,
          currency: selectedProduct?.restaurantCurrency || t('common.currency_default'),
          deliveryTime: t('common.delivery_time_range_default'),
          deliveryCharges: resolveDeliveryCharge(selectedProduct, Number(t('common.delivery_fee_default')))
        }}
        onAddToCart={handleModalAddToCart}
        initialQuantity={cartItems.find(i => i.id === selectedProduct?.id)?.quantity || 0}
      />
    </View>
  );
}
