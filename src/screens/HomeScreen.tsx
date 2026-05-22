import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  ImageBackground,
  Animated,
  useWindowDimensions,
} from "react-native";

import { StatusBar } from "expo-status-bar";
import { styles } from "./HomeScreen.styles";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, searchRestaurants, searchMenuItems, getPopularFoodCategories, getCuisineCategories } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { HomeScreenSkeleton, PopularDishesSkeleton, NearbyRestaurantsSkeleton, SearchItemsSkeleton } from "../../components/skeleton";
import { useLocation } from "../hooks/useLocation";
import SaveLocationModal from "./SaveLocationModal";
import { getDistance } from "../utils/geo";
import ProfileSetupModal from "./ProfileSetupModal";
import { formatPrice } from "../utils/currency";
import { useDebounce } from "../hooks/useDebounce";
import { useSettings } from "../hooks/useSettings";
import { useTranslation } from "react-i18next";
import Preloader, { PulseDotsLoader } from "../components/Preloader";
import { useCart, getCartItemKey } from "../hooks/useCart";
import { useAuth } from "../contexts/AuthContext";
import QuantitySelector from "../components/QuantitySelector";
import ProductDetailModal from "../components/ProductDetailModal";
import { Colors as BrandColors } from "../constants/Colors";
import { getStoreCategoryBackground } from "../constants/StoreCategoryColors";
import { getRestaurantsFromAPI } from "../lib/api";
import { ShopByCategory } from "../components/ShopByCategory";
import { resolveDeliveryCharge } from "../utils/delivery";


interface MenuItem {
  id: string;
  label: string;
  price: number;
  image: string;
  restaurantId: string;
  Restaurant?: any;
  rating?: number;
}

const STORE_CATEGORIES = [
  { id: 'RESTAURANT', name: 'Restaurants', image: require('../../assets/StoreCategory/restaurants.webp'), type: 'RESTAURANT' },
  { id: 'GROCERY', name: 'Groceries', image: require('../../assets/StoreCategory/groceries.webp'), type: 'GROCERY' },
  { id: 'BAKERY', name: 'Patisserie', image: require('../../assets/StoreCategory/patisserie.webp'), type: 'BAKERY' },
  { id: 'APPAREL', name: 'Apparel', image: require('../../assets/StoreCategory/apparel.webp'), type: 'APPAREL' },
  { id: 'ELECTRONICS', name: 'Electronics', image: require('../../assets/StoreCategory/electronics.webp'), type: 'ELECTRONICS' },
  { id: 'FLOWER_SHOP', name: 'Flowers', image: require('../../assets/StoreCategory/flowers.webp'), type: 'FLOWER_SHOP' },
  { id: 'HEALTH_WELLBEING', name: 'Health & Wellbeing', image: require('../../assets/StoreCategory/health.webp'), type: 'HEALTH_WELLBEING' },
  { id: 'HOME_DIY', name: 'Home & DIY', image: require('../../assets/StoreCategory/home2.webp'), type: 'HOME_DIY' },
  { id: 'STATIONERY', name: 'Stationery', image: require('../../assets/StoreCategory/stationery.webp'), type: 'STATIONERY' },
];

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [allNearbyRestaurants, setAllNearbyRestaurants] = useState<any[]>([]);
  const [popularMenuItems, setPopularMenuItems] = useState<MenuItem[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [popularLoading, setPopularLoading] = useState<boolean>(true);
  const [cuisineCategories, setCuisineCategories] = useState<any[]>([]);
  const [cuisinesLoading, setCuisinesLoading] = useState<boolean>(true);
  const [popularFoodCategories, setPopularFoodCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultAddressCoords, setDefaultAddressCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { currentLocation, fetchLocation, coords } = useLocation();
  const insets = useSafeAreaInsets();
  const { deliveryRadius } = useSettings();
  const { cartItems, addToCart, removeFromCart, findLatestItemByProductId } = useCart();

  // Inline search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [searchRestaurantsResults, setSearchRestaurantsResults] = useState<any[]>([]);
  const [searchMenuResults, setSearchMenuResults] = useState<any[]>([]);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null); // null means "All"
  const searchInputRef = useRef<TextInput>(null);
  const showDropdown = searchQuery.trim().length > 0;

  // Animation values — only the location pill collapses on scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header shrinks by the top row (~45px) + location pill (~35px)
  const HEADER_MAX_HEIGHT = 135 + insets.top;
  const HEADER_MIN_HEIGHT = 75 + insets.top; // Significantly smaller to hide top elements

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  // Top row (Logo + Profile) fades and collapses
  const topRowOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const topRowHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [45, 0],
    extrapolate: 'clamp',
  });

  // Location pill fades and collapses
  const locationOpacity = scrollY.interpolate({
    inputRange: [10, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const locationHeight = scrollY.interpolate({
    inputRange: [10, 80],
    outputRange: [30, 0],
    extrapolate: 'clamp',
  });

  const searchPaddingBottom = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [6, 12],
    extrapolate: 'clamp',
  });

  const OFFERS = [
    {
      id: "1",
      title: t('home.offer_first_order_title'),
      description: t('home.offer_first_order_desc'),
      colors: [BrandColors.primary, BrandColors.secondary] as const,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  };

  useEffect(() => {
    // Only fetch location automatically if we don't have any location data yet
    if (!coords && !defaultAddressCoords) {
      fetchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        supabase
          .from("User")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              setShowProfileModal(true);
            } else {
              setShowProfileModal(false);
            }
          });
      }
    }, [user])
  );

  useEffect(() => {
    if (!user) return;
    const userSubscription = supabase
      .channel("user-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "User",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setUserName(payload.new.name);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
    };
  }, [user]);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRestaurantsFromAPI();
      setRestaurants(data || []);
    } catch (error: any) {
      console.error("Error fetching restaurants from Web API:", error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("Restaurant")
        .select(`
          id, 
          name, 
          cuisineType, 
          area, 
          rating, 
          coverImage, 
          deliveryTime, 
          minimumOrder,
          currency,
          isActive,
          preparationTime,
          menuItems: MenuItem (id, label, price, image, description, category)
        `)
        .order("rating", { ascending: false });

      if (!fallbackError) {
        setRestaurants(fallbackData || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.id);
      fetchDefaultAddress(user.id);
    }

    const loadData = async () => {
      try {
        const [categories, cuisines] = await Promise.all([
          getPopularFoodCategories(coords?.latitude, coords?.longitude, 10),
          getCuisineCategories(8)
        ]);
        setPopularFoodCategories(categories || []);
        setCuisineCategories(cuisines || []);
      } catch (e) {
        console.error("Error loading home data:", e);
      } finally {
        setCategoriesLoading(false);
        setCuisinesLoading(false);
      }
    };

    fetchRestaurants();
    loadData();
  }, [user, fetchRestaurants, coords, defaultAddressCoords]);

  // Inline search
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (debouncedSearch.trim().length >= 1) {
        setSearchLoading(true);
        try {
          const effectiveCoords = coords || defaultAddressCoords;
          if (effectiveCoords) {
            const [restaurantResults, menuItemResults] = await Promise.all([
              searchRestaurants(debouncedSearch, effectiveCoords.latitude, effectiveCoords.longitude, deliveryRadius || 10),
              searchMenuItems(debouncedSearch, effectiveCoords.latitude, effectiveCoords.longitude, deliveryRadius || 10),
            ]);
            if (active) {
              setSearchRestaurantsResults(restaurantResults);
              setSearchMenuResults(menuItemResults);
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
  }, [debouncedSearch, coords, defaultAddressCoords, deliveryRadius]);

  const handleSearchResultSelect = (type: 'restaurant' | 'menuItem', item: any) => {
    Keyboard.dismiss();
    if (type === 'restaurant') {
      navigation.navigate("RestaurantDetails", { restaurant: item });
    } else {
      setSelectedProduct(item);
      setIsProductModalVisible(true);
    }
  };

  const renderSearchResults = () => {
    return (
      <View style={{ flex: 1, paddingTop: 12 }}>
        {searchLoading ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
            <PulseDotsLoader />
            <Text style={[styles.searchEmptyText, { marginTop: 4 }]}>
              {t('home.searching_deliciousness')}
            </Text>
          </View>
        ) : searchRestaurantsResults.length === 0 && searchMenuResults.length === 0 ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Ionicons name="search-outline" size={64} color="#E5E7EB" />
            <Text style={[styles.searchEmptyText, { fontSize: 18, marginTop: 16 }]}>
              {t('search.no_results')}
            </Text>
            <Text style={{ color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
              {t('search.no_results_subtitle')}
            </Text>
          </View>
        ) : (
          <>
            {/* Matching Stores */}
            {searchRestaurantsResults.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>{t('search.restaurants')}</Text>
                  </View>
                </View>
                {searchRestaurantsResults.map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={styles.restaurantCard}
                    onPress={() => handleSearchResultSelect('restaurant', restaurant)}
                    activeOpacity={1}
                  >
                    <Image
                      source={{ uri: restaurant.coverImage || '' }}
                      style={styles.restaurantImage}
                      defaultSource={require('../../assets/placeholder.png')}
                    />
                    <View style={styles.restaurantInfo}>
                      <View style={styles.restaurantHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
                          <Text style={styles.restaurantCuisine}>{restaurant.cuisineType} • {restaurant.area}</Text>
                        </View>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.ratingText}>{restaurant.rating}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Matching Items */}
            {searchMenuResults.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>{t('search.menu_items')}</Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {searchMenuResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.modernDishCard, { width: '48%', marginRight: 0, marginBottom: 16 }]}
                        onPress={() => handleSearchResultSelect('menuItem', item)}
                        activeOpacity={0.9}
                      >
                        <View style={[styles.dishImageBg, { height: 140 }]}>
                          <Image
                            source={{ uri: item.image || '' }}
                            style={styles.dishImage}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.dishCardInfo}>
                          <Text style={styles.dishName} numberOfLines={1}>{item.label}</Text>
                          <Text style={[styles.dishPrice, { fontSize: 15 }]}>
                            {formatPrice(item.price, item.restaurantCurrency)}
                          </Text>
                          <Text style={styles.dishRestaurantName} numberOfLines={1}>
                            {item.restaurantName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.searchViewAllButton, { marginHorizontal: 20, borderRadius: 16, marginTop: 20, marginBottom: 40 }]}
              onPress={() => {
                const query = searchQuery;
                setSearchQuery("");
                navigation.navigate('SearchTab', { query });
              }}
            >
              <Text style={styles.searchViewAllText}>{t('search.view_all_results')}</Text>
              <Ionicons name="arrow-forward" size={16} color={BrandColors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("User")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (error) console.error("Error fetching user:", error.message);
    else setUserName(data?.name || "");
  };

  const fetchDefaultAddress = async (userId: string) => {
    const { data, error } = await supabase
      .from("Address")
      .select("latitude, longitude")
      .eq("userId", userId)
      .eq("isDefault", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching default address:", error.message);
      return;
    }
    if (data && data.latitude && data.longitude) {
      setDefaultAddressCoords({
        latitude: data.latitude,
        longitude: data.longitude,
      });
    }
  };

  const handleModalAddToCart = (menuItem: any, quantity: number, selectedOptions: any[]) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    const restaurant = menuItem.Restaurant || {
      id: menuItem.restaurantId,
      name: menuItem.restaurantName || t('orders.restaurant_fallback'),
      currency: menuItem.restaurantCurrency || t('common.currency_default'),
      deliveryCharges: resolveDeliveryCharge(menuItem.Restaurant, fallbackDeliveryFee)
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



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  }, [fetchRestaurants]);

  useEffect(() => {
    const effectiveCoords = coords || defaultAddressCoords;
    const radiusValue = deliveryRadius || 50;
    const radius = typeof radiusValue === 'string' ? parseFloat(radiusValue) : radiusValue;

    if (restaurants.length > 0) {
      // 1. Filter ONLY by Distance (for Popular Items)
      let distanceFiltered = [];
      if (effectiveCoords) {
        distanceFiltered = restaurants.filter((restaurant) => {
          if (!restaurant.latitude || !restaurant.longitude) return false;
          try {
            const distance = getDistance(
              effectiveCoords.latitude,
              effectiveCoords.longitude,
              restaurant.latitude,
              restaurant.longitude
            );
            return distance <= radius;
          } catch (error) {
            return false;
          }
        });
      } else {
        distanceFiltered = restaurants;
      }

      setAllNearbyRestaurants(distanceFiltered);

      // 2. Filter by Store Type (for Shop List)
      let storeFiltered = distanceFiltered;
      if (selectedStoreType) {
        storeFiltered = storeFiltered.filter(item => item.storeType === selectedStoreType);
      }

      // 3. Final List Selection for Shops
      if (storeFiltered.length === 0 && !selectedStoreType) {
        setNearbyRestaurants(distanceFiltered.slice(0, 10));
      } else {
        setNearbyRestaurants(storeFiltered);
      }
    } else {
      setAllNearbyRestaurants([]);
      setNearbyRestaurants([]);
    }
  }, [coords, defaultAddressCoords, restaurants, deliveryRadius, selectedStoreType]);

  useEffect(() => {
    if (allNearbyRestaurants.length === 0) {
      setPopularMenuItems([]);
      setPopularLoading(false);
      return;
    }

    setPopularLoading(true);

    const allItems: MenuItem[] = allNearbyRestaurants.flatMap((restaurant: any) => {
      const items = restaurant.menuItems || restaurant.MenuItem || restaurant.items || [];
      return items.map((item: any) => ({
        ...item,
        Restaurant: restaurant,
        rating: restaurant.rating
      }));
    });

    const popular = allItems
      .filter((item: any) => item && (item.id || item.label))
      .sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.image ? 1 : 0) - (a.image ? 1 : 0);
      })
      .slice(0, 15);

    setPopularMenuItems(popular);
    setPopularLoading(false);
  }, [allNearbyRestaurants]);

  if (loading) {
    return <Preloader fullScreen={true} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <Modal visible={showProfileModal} animationType="slide">
        <ProfileSetupModal
          onProfileSetupSuccess={() => {
            setShowProfileModal(false);
            if (user) fetchUserProfile(user.id);
          }}
        />
      </Modal>

      <Animated.View style={{
        height: headerHeight,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
        backgroundColor: '#FFF7ED',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}>
        <View style={[styles.topHeader, { paddingTop: insets.top + 6, paddingBottom: 0, backgroundColor: 'transparent' }]}>
          <Animated.View style={{
            opacity: topRowOpacity,
            height: topRowHeight,
            overflow: 'hidden'
          }}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={[styles.locationButton, { flex: 1 }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="location" size={16} color={BrandColors.primary} />
                <Text style={styles.deliveryAddress} numberOfLines={1}>
                  {currentLocation || t('location.fetching')}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6B7280" />
              </TouchableOpacity>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.avatarCircle, { backgroundColor: '', borderWidth: 1, borderColor: '#FB923C' }]}
                  onPress={() => navigation.navigate("ProfileTab")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person" size={20} color={BrandColors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[
          styles.stickySearchContainer,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
            paddingTop: 6,
            paddingBottom: searchPaddingBottom,
          }
        ]}>
          <View style={styles.searchBar}>
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
                else setSearchLoading(false);
              }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
        style={{ backgroundColor: '#fff' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: HEADER_MAX_HEIGHT + 6 }}
        keyboardShouldPersistTaps="handled"
      >


        <View style={{ backgroundColor: '#fff', flex: 1, minHeight: 800 }}>
          {searchQuery.length === 0 && (
            <>
              <View style={{
                backgroundColor: '#fff',
                paddingTop: 4,
                paddingBottom: 2,
                marginTop: 2,
                marginBottom: 4,
                overflow: 'hidden'
              }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ width: '100%' }}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 6,
                    gap: 14,
                    flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row'
                  }}
                >
                  {STORE_CATEGORIES.map((cat) => {
                    const isActive = selectedStoreType === cat.type;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={{
                          width: 80,
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          navigation.navigate('Explore', {
                            storeType: cat.type,
                            categoryName: cat.name,
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{
                          width: 72,
                          height: 72,
                          borderRadius: 16,
                          overflow: 'hidden',
                          backgroundColor: getStoreCategoryBackground(cat.type, isActive),
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                          borderWidth: 2,
                          borderColor: isActive ? BrandColors.primary : 'transparent',
                          elevation: isActive ? 2 : 0,
                          shadowColor: BrandColors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isActive ? 0.1 : 0,
                          shadowRadius: 4,
                        }}>
                          <Image
                            source={cat.image}
                            style={{ width: '80%', height: '80%' }}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={{
                          color: isActive ? BrandColors.primary : '#1F2937',
                          fontWeight: isActive ? '800' : '600',
                          fontSize: 11,
                          textAlign: 'center',
                          marginTop: -2,
                        }} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.offersContainer}>
                {OFFERS.map((offer) => (
                  <LinearGradient
                    key={offer.id}
                    colors={offer.colors as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.offerCard}
                  >
                    <ImageBackground
                      source={{ uri: "https://www.transparenttextures.com/patterns/food.png" }}
                      style={StyleSheet.absoluteFill}
                      imageStyle={{ opacity: 0.1 }}
                      tintColor="#fff"
                    />

                    <View style={styles.offerContent}>
                      <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                          <Ionicons name="time" size={14} color="#FBBF24" />
                          <Text style={styles.badgeText}>{t('home.limited_time')}</Text>
                        </View>
                      </View>

                      <Text style={styles.offerTitle} numberOfLines={2} ellipsizeMode="tail">{offer.title}</Text>
                      <Text style={styles.offerDescription} numberOfLines={2} ellipsizeMode="tail">{offer.description}</Text>

                      <TouchableOpacity
                        style={styles.orderNowButton}
                        onPress={() => (navigation as any).navigate("Restaurants")}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.orderNowText}>{t('home.order_now')}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.offerImageWrapper}>
                      <Image
                        source={{ uri: offer.image }}
                        style={styles.offerImage}
                        resizeMode="contain"
                      />
                    </View>
                  </LinearGradient>
                ))}
              </View>
            </>
          )}

          {searchQuery.trim() !== "" &&
            searchMenuResults.length === 0 &&
            searchRestaurantsResults.length === 0 &&
            !searchLoading &&
            searchQuery === debouncedSearch && (
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
                    {/* Background Glow */}
                    <View style={{
                      position: 'absolute',
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      backgroundColor: '#FFF7ED',
                      opacity: 0.5,
                    }} />

                    {/* Decorative Elements */}
                    <Ionicons name="sparkles" size={24} color="#FFEDD5" style={{ position: 'absolute', top: 10, right: -20 }} />
                    <View style={{ position: 'absolute', bottom: 20, left: -10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FED7AA' }} />

                    {/* Main Icon */}
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: '#fff',
                      elevation: 5,
                      shadowColor: '#EA580C',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: '#FFEDD5',
                    }}>
                      <Ionicons name="search" size={38} color="#EA580C" />
                    </View>

                    {/* Sub-icon */}
                    <View style={{
                      position: 'absolute',
                      bottom: -5,
                      right: -5,
                      backgroundColor: '#fff',
                      padding: 8,
                      borderRadius: 16,
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      borderWidth: 1,
                      borderColor: '#F3F4F6',
                    }}>
                      <MaterialCommunityIcons name="store-search-outline" size={24} color="#EA580C" />
                    </View>
                  </View>
                </View>

                {/* Title & Subtitle */}
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#111827',
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  {t('search.no_results_found')}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginBottom: 24,
                  lineHeight: 20
                }}>
                  {t('search.no_results_subtitle')}
                </Text>

                {/* Action Buttons */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('Explore', {})}
                  style={{
                    backgroundColor: BrandColors.primary,
                    width: '100%',
                    paddingVertical: 16,
                    borderRadius: 30,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                    elevation: 4,
                    shadowColor: BrandColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                  }}
                >
                  <Ionicons name="storefront" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('navigation.explore')}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("OrdersTab")}
                    style={{
                      flex: 1.2,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingVertical: 14,
                      borderRadius: 30,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#fff'
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color="#4B5563" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#4B5563', fontSize: 13, fontWeight: '600' }}>{t('home.order_history')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => searchInputRef.current?.focus()}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingVertical: 14,
                      borderRadius: 30,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#fff'
                    }}
                  >
                    <Ionicons name="search-outline" size={18} color="#4B5563" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#4B5563', fontSize: 14, fontWeight: '600' }}>{t('home.search_again')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          {/* Cuisine slider was here, now moved below Featured Delicacies */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle} numberOfLines={1} ellipsizeMode="tail">
                  {searchQuery.trim()
                    ? (searchMenuResults.length > 0 ? t('search.menu_items') : t('home.featured_items'))
                    : t('home.featured_items')}
                </Text>
              </View>
            </View>

            {(searchQuery.trim() ? searchLoading : popularLoading) ? (
              searchQuery.trim() ? <SearchItemsSkeleton /> : <PopularDishesSkeleton />
            ) : (searchQuery.trim() && searchMenuResults.length > 0 ? searchMenuResults : popularMenuItems).length > 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ width: '100%', marginTop: 12 }}
                  contentContainerStyle={[
                    styles.popularDishes,
                    {
                      paddingBottom: 20,
                      flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  {(searchQuery.trim() && searchMenuResults.length > 0 ? searchMenuResults : popularMenuItems)
                    .filter((dish) => dish && (dish.Restaurant || dish.restaurantName))
                    .map((dish) => (
                      <TouchableOpacity
                        key={dish.id}
                        style={styles.modernDishCard}
                        onPress={() => {
                          setSelectedProduct(dish);
                          setIsProductModalVisible(true);
                        }}
                        activeOpacity={0.9}
                      >
                        <View style={styles.dishImageBg}>
                          <Image
                            source={{ uri: dish.image || '' }}
                            style={styles.dishImage}
                            resizeMode="contain"
                            defaultSource={require('../../assets/placeholder.png')}
                          />
                          {(!searchQuery.trim() || searchMenuResults.length === 0) && (
                            <QuantitySelector
                              initialQuantity={cartItems.filter(item => item.id === dish.id).reduce((sum, item) => sum + item.quantity, 0)}
                              onUpdate={(newQty) => {
                                const totalQty = cartItems.filter(item => item.id === dish.id).reduce((sum, item) => sum + item.quantity, 0);
                                if (newQty > totalQty) {
                                  const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
                                  addToCart({
                                    id: dish.id,
                                    restaurantId: dish.restaurantId,
                                    restaurantName: dish.Restaurant?.name || dish.restaurantName || '',
                                    restaurantCurrency: dish.Restaurant?.currency || dish.restaurantCurrency,
                                    name: dish.label,
                                    price: dish.price,
                                    quantity: 1,
                                    image: dish.image,
                                    deliveryCharges: resolveDeliveryCharge(dish.Restaurant, fallbackDeliveryFee),
                                  });
                                } else if (newQty < totalQty) {
                                  removeFromCart(dish.id);
                                }
                              }}
                              containerStyle={styles.dishQuantitySelector}
                              size="small"
                            />
                          )}
                        </View>
                        <View style={styles.dishCardInfo}>
                          <Text style={styles.dishName} numberOfLines={1}>{dish.label || t('home.unknown_dish')}</Text>
                          <View style={styles.dishMeta}>
                            <Text style={styles.dishPrice}>
                              {formatPrice(dish.price || 0, dish.Restaurant?.currency || dish.restaurantCurrency)}
                            </Text>

                          </View>
                          <View style={{ flexDirection: "row", gap: 4, alignItems: "center", justifyContent: 'space-between' }}>
                            <Text style={[styles.dishRestaurantName, { flex: 1 }]} numberOfLines={1}>
                              {dish.Restaurant?.name || dish.restaurantName || t('orders.restaurant_fallback')}
                            </Text>
                            <View style={styles.dishRatingBadge}>
                              <Ionicons name="star" size={12} color="#D97706" />
                              <Text style={styles.dishRatingText}>5.0</Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
                            <Ionicons name="time-outline" size={12} color="#6B7280" />
                            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>
                              {dish.Restaurant?.deliveryTime || t('common.delivery_time_range_default')} {t('common.min')}
                            </Text>
                          </View>


                        </View>
                      </TouchableOpacity>
                    ))}

                </ScrollView>
              </View>
            ) : (
              <Text style={styles.noDataText}>
                {searchQuery.trim() ? t('search.no_results') : t('home.no_popular_dishes')}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {t('home.discover_nearby_shops', 'Discover Nearby Shops')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("Restaurants")} activeOpacity={1}>
                <Text style={styles.seeAllButton}>{t('home.see_all')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              {(searchQuery.trim() ? searchLoading : loading) ? (
                <NearbyRestaurantsSkeleton />
              ) : (searchQuery.trim() && searchRestaurantsResults.length > 0 ? searchRestaurantsResults : nearbyRestaurants).length > 0 ? (
              (searchQuery.trim() && searchRestaurantsResults.length > 0 ? searchRestaurantsResults : nearbyRestaurants)
                .filter((restaurant) => restaurant && restaurant.id)
                .slice(0, 5)
                .map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={styles.restaurantCard}
                    onPress={() =>
                      (navigation as any).navigate("RestaurantDetails", { restaurant })
                    }
                    activeOpacity={1}
                  >
                    <Image
                      source={{ uri: restaurant.coverImage || '' }}
                      style={styles.restaurantImage}
                      defaultSource={require('../../assets/placeholder.png')}
                    />
                    <View style={styles.restaurantInfo}>
                      <View style={styles.restaurantHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restaurantName} numberOfLines={1} ellipsizeMode="tail">
                            {restaurant.name}
                          </Text>
                          <Text style={styles.restaurantCuisine} numberOfLines={1} ellipsizeMode="tail">
                            {restaurant.cuisineType} • {restaurant.segment || restaurant.area}
                          </Text>
                        </View>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.ratingText}>
                            {restaurant.rating ? Number(restaurant.rating).toFixed(1) : '5.0'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.metaText}>
                          {t('restaurant.delivery')}: {restaurant.deliveryTime || t('common.delivery_time_range_default')} {t('common.min')}
                        </Text>
                      </View>
                      {(restaurant.preparationTime || restaurant.preparation_time) && (
                        <View style={[styles.metaItem, { marginTop: 4 }]}>
                          <Ionicons
                            name="restaurant-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.metaText}>
                            {t('restaurant.prep')}: {restaurant.preparationTime || restaurant.preparation_time} {t('common.min')}
                          </Text>
                        </View>
                      )}
                      {(!searchQuery.trim() || searchRestaurantsResults.length === 0) && (
                        <View style={styles.metaItem}>
                          <Ionicons name="cash-outline" size={16} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {t('restaurant.min_order')}: {formatPrice(restaurant.minimumOrder || 0, restaurant.currency)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="restaurant-outline" size={64} color="#F3F4F6" />
                <Text style={[styles.noDataText, { marginTop: 16, textAlign: 'center' }]}>
                  {searchQuery.trim()
                    ? t('home.no_match_suggest')
                    : t('home.no_nearby_restaurants')}
                </Text>
                {searchQuery.trim() && (
                  <View style={{ width: '100%', marginTop: 20 }}>
                    {nearbyRestaurants.slice(0, 3).map((restaurant) => (
                      <TouchableOpacity
                        key={`${restaurant.id}-suggestion`}
                        style={styles.restaurantCard}
                        onPress={() => (navigation as any).navigate("RestaurantDetails", { restaurant })}
                      >
                        {/* Simplified suggestion card content could go here, or just reuse the main card */}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      <SaveLocationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddressAdded={() => {
          if (user?.id) {
            fetchDefaultAddress(user.id);
          }
        }}
      />

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
        initialQuantity={findLatestItemByProductId(selectedProduct?.id)?.quantity || 0}
        initialSelectedOptions={findLatestItemByProductId(selectedProduct?.id)?.selectedOptions || []}
      />
    </View>
  );
}