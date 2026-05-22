import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './RestaurantListScreen.styles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Restaurant, MenuItem } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useCart, getCartItemKey } from '../hooks/useCart';
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import Preloader, { RestaurantCardSkeleton, PulseDotsLoader } from "../components/Preloader";
import QuantitySelector from '../components/QuantitySelector';
import { searchRestaurants, searchMenuItems, getRestaurants } from '../lib/supabase';

import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { BackHandler } from 'react-native';
// Import the custom location hook
import { useLocation } from '../hooks/useLocation';
// Import the getDistance utility
import { getDistance } from '../utils/geo';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../hooks/useSettings';
import { resolveDeliveryCharge } from '../utils/delivery';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export type RestaurantsScreenParams = {
  fromCheckout?: boolean;
  checkoutParams?: {
    deliveryAddress: any;
    restaurantId?: string;
  };
};

type RestaurantsRouteProp = RouteProp<
  { Restaurants: RestaurantsScreenParams },
  'Restaurants'
>;

export const RestaurantListScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const route = useRoute<RestaurantsRouteProp>();
  // Store the full fetched list separately
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  // 'restaurants' state holds the nearby (filtered) restaurants
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cartItems, addToCart, removeFromCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const insets = useSafeAreaInsets();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { deliveryRadius } = useSettings();

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const handleBackPress = useCallback(() => {
    const { fromCheckout, checkoutParams } = route.params ?? {};
    if (fromCheckout && checkoutParams) {
      navigation.navigate('CartTab', {
        screen: 'CheckoutScreen',
        params: checkoutParams,
      });
      return true;
    }
    navigation.goBack();
    return true;
  }, [navigation, route.params]);

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.fromCheckout) return undefined;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
      return () => subscription.remove();
    }, [route.params?.fromCheckout, handleBackPress])
  );

  const toggleFavorite = async (id: string) => {
    setFavorites(prev => {
      const newFavs = { ...prev };
      if (newFavs[id]) {
        delete newFavs[id];
      } else {
        newFavs[id] = true;
      }
      AsyncStorage.setItem('user_favorites', JSON.stringify(newFavs)).catch(err => {
        console.error('Failed to save favorites', err);
      });
      return newFavs;
    });
  };

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavs = await AsyncStorage.getItem('user_favorites');
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs));
        }
      } catch (e) {
        console.error('Failed to load favorites', e);
      }
    };
    loadFavorites();
  }, []);

  // --- Location & Default Address State ---
  const { currentLocation, fetchLocation, coords } = useLocation();
  const [defaultAddressCoords, setDefaultAddressCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  // Effective coordinates: current device location if available, otherwise the default address.
  const effectiveCoords = coords || defaultAddressCoords;
  //---------------------------------------------

  // Fetch current location on mount if not already available.
  useEffect(() => {
    if (!coords && !defaultAddressCoords) {
      fetchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run check on mount

  // Fetch the user's default address coordinates (if any).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchDefaultAddress(session.user.id);
      }
    });
  }, []);

  // --- Fetch Default Address Function ---
  const fetchDefaultAddress = async (userId: string) => {
    const { data, error } = await supabase
      .from('Address')
      .select('latitude, longitude')
      .eq('userId', userId)
      .eq('isDefault', true)
      .limit(1);
    if (error) {
      console.error('Error fetching default address:', error.message);
      return;
    }
    const address = data?.[0];
    if (address && address.latitude && address.longitude) {
      setDefaultAddressCoords({ latitude: address.latitude, longitude: address.longitude });
    }
  };
  //-----------------------------------------

  // Fetch all restaurants (unfiltered) from Supabase.
  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await getRestaurants();
      if (data === null) {
        setError(t('restaurants.load_error'));
        return;
      }

      console.log(`[RestaurantList] Fetched ${data?.length || 0} total restaurants.`);
      const restaurantsData = data || [];
      setAllRestaurants(restaurantsData);
      // Set initial restaurants to prevent flicker while useEffect calculates nearby ones
      setRestaurants(restaurantsData.slice(0, 10)); 

    } catch (err) {

      setError(t('restaurants.load_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initially fetch all restaurants.
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Whenever effectiveCoords or the full list changes, calculate distances but show all stores.
  useEffect(() => {
    if (allRestaurants.length === 0) return;
    // ONLY run this default filtering if there is no active search term.
    if (debouncedSearchTerm.trim()) return;

    const radius = Number(deliveryRadius) || 50; 
    const nearby = allRestaurants.filter((restaurant: Restaurant) => {
      if (!restaurant.latitude || !restaurant.longitude || !effectiveCoords) {
        return false; 
      }
      try {
        const distance = getDistance(
          effectiveCoords.latitude,
          effectiveCoords.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
        return distance <= radius;
      } catch (error) {
        console.error('Error calculating distance:', error);
        return false;
      }
    });

    if (nearby.length === 0) {
      setRestaurants(allRestaurants.slice(0, 10));
    } else {
      setRestaurants(nearby);
    }
  }, [effectiveCoords, allRestaurants, deliveryRadius, debouncedSearchTerm]);

  // Perform search and then filter search results by distance.
  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      // Check if we have valid coordinates before searching
      if (!effectiveCoords || !effectiveCoords.latitude || !effectiveCoords.longitude) {
        setError(t('restaurants.location_required'));
        setLoading(false);
        return;
      }

      let [restaurantResults, menuItemResults] = await Promise.all([
        searchRestaurants(term, effectiveCoords.latitude, effectiveCoords.longitude),
        searchMenuItems(term, effectiveCoords.latitude, effectiveCoords.longitude),
      ]);

      // FALLBACK: Global search if local search is empty
      if (restaurantResults.length === 0 && menuItemResults.length === 0) {
        const [globalRes, globalItems] = await Promise.all([
          searchRestaurants(term, effectiveCoords.latitude, effectiveCoords.longitude, 99999),
          searchMenuItems(term, effectiveCoords.latitude, effectiveCoords.longitude, 99999),
        ]);
        restaurantResults = globalRes;
        menuItemResults = globalItems;
      }
      const restaurantIdsFromName = restaurantResults.map(r => r.id);
      const restaurantIdsFromMenu = menuItemResults.map(mi => mi.restaurantId);
      const allRestaurantIds = Array.from(new Set([...restaurantIdsFromName, ...restaurantIdsFromMenu]));

      if (allRestaurantIds.length === 0) {
        setRestaurants([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('Restaurant')
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
          MenuItem (id, label, price, image, description, category)
        `)


        .in('id', allRestaurantIds)
        .order('rating', { ascending: false });
      if (error) throw error;

      let processedRestaurants = data.map((restaurant: any) => {
        if (restaurantIdsFromName.includes(restaurant.id)) {
          return restaurant;
        } else {
          const menuItems = restaurant.MenuItem || restaurant.menuItems || [];
          const filteredMenuItems = menuItems.filter((item: MenuItem) =>
            item.label.toLowerCase().includes(term.toLowerCase())
          );
          return { ...restaurant, MenuItem: filteredMenuItems };
        }
      });

      // RESTORED: Filter search results by location radius.
      const radius = Number(deliveryRadius) || 50;
      if (effectiveCoords) {
        processedRestaurants = processedRestaurants.filter((restaurant: Restaurant) => {
          const distance = getDistance(
            effectiveCoords.latitude,
            effectiveCoords.longitude,
            restaurant.latitude,
            restaurant.longitude
          );
          return distance <= radius;
        });
      }
      setRestaurants(processedRestaurants);
    } catch (error) {
      setError(t('restaurants.search_error'));
    } finally {
      setLoading(false);
    }
  };

  // Re-run search when the debounced search term changes.
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      performSearch(debouncedSearchTerm.trim());
    } else {
      fetchRestaurants();
    }
  }, [debouncedSearchTerm]);

  const onRefresh = () => {
    setRefreshing(true);
    if (debouncedSearchTerm.trim()) {
      performSearch(debouncedSearchTerm.trim());
    } else {
      fetchRestaurants();
    }
  };

  const handleMenuItemPress = (restaurant: Restaurant, menuItem: MenuItem) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    addToCart({
      id: menuItem.id,
      restaurantId: restaurant.id,
      restaurantCurrency: restaurant.currency,
      name: menuItem.label,
      price: menuItem.price,
      quantity: 1,
      restaurantName: restaurant.name,
      image: menuItem.image,
      deliveryCharges: resolveDeliveryCharge(restaurant, fallbackDeliveryFee),
    });
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => {
    // 1. Fetch delivery charges and currency
    const deliveryChargesVal = item.deliveryCharges !== undefined && item.deliveryCharges !== null 
      ? item.deliveryCharges 
      : (item as any).delivery_charges;
    const currency = item.currency || 'Rs.';

    return (
      <TouchableOpacity 
        style={styles.restaurantCard}
        onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })}
        activeOpacity={0.9}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.coverImage || (item as any).cover_image || '' }}
            style={styles.restaurantImage}
          />
          {/* Floating Delivery Time Badge */}
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>
              {item.deliveryTime ? `${item.deliveryTime} min` : '30-40 min'}
            </Text>
          </View>
          {/* Overlapping Brand Logo */}
          <View style={styles.logoWrapper}>
            {item.logo || (item as any).logo ? (
              <Image
                source={{ uri: item.logo || (item as any).logo || '' }}
                style={styles.logoImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="storefront" size={22} color="#EA580C" />
            )}
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          {/* Name Row */}
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
          </View>

          {/* Cuisines Row */}
          <Text style={styles.cuisineRow} numberOfLines={1} ellipsizeMode="tail">
            {item.cuisineType ? item.cuisineType : 'Pizza • Fast Food • Italian'}
          </Text>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color="#FFC107" style={{ marginRight: 4 }} />
            <Text style={styles.ratingText}>
              {item.rating ? Number(item.rating).toFixed(1) : '5.0'}{' '}
              <Text style={styles.ratingCount}>({(item as any).reviewsCount || '100+'})</Text>
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Footer Row */}
          <View style={styles.footerRow}>
            <View style={styles.deliveryDetails}>
              <Ionicons 
                name="bicycle" 
                size={18} 
                color={item.storeType === 'GROCERY' ? '#10B981' : '#EA580C'} 
              />
              <Text style={styles.deliveryDetailsText}>
                {deliveryChargesVal === 0 
                  ? `Free Delivery  •  ${item.deliveryTime || '30-40'} min` 
                  : `${currency} ${deliveryChargesVal}  •  ${item.deliveryTime || '30-40'} min`}
              </Text>
            </View>

            {/* Favorite Button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={favorites[item.id] ? 'heart' : 'heart-outline'}
                size={20}
                color={favorites[item.id] ? '#EF4444' : '#EA580C'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchRestaurants();
          }}
          activeOpacity={1}
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Premium Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 8, paddingBottom: 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButtonCircle} 
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#EA580C" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Stores</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={restaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color="#EA580C" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('restaurants.search_placeholder')}
                  placeholderTextColor="#94A3B8"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus={false}
                  underlineColorAndroid="transparent"
                  multiline={false}
                  numberOfLines={1}
                />
                {loading && searchTerm.length > 0 && (
                  <View style={styles.searchLoading}>
                    <PulseDotsLoader size={6} />
                  </View>
                )}
                {searchTerm.length > 0 && !loading && (
                  <TouchableOpacity 
                    onPress={() => setSearchTerm('')}
                    style={styles.clearIcon}
                  >
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {searchTerm.length === 0 && (
              <View style={styles.bannerContainer}>
                <LinearGradient
                  colors={['#FFF7ED', '#FFEDD5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerGradient}
                >
                  <View style={styles.bannerTextContainer}>
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerBadgeText}>Limited Time</Text>
                    </View>
                    <Text style={styles.bannerTitle}>50% OFF</Text>
                    <Text style={styles.bannerSubtitle}>On Your First Order</Text>
                    <TouchableOpacity style={styles.bannerButton} activeOpacity={0.9}>
                      <Text style={styles.bannerButtonText}>Order Now</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bannerImageContainer}>
                    <Image 
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png' }}
                      style={styles.bannerImage}
                      resizeMode="contain"
                    />
                  </View>
                </LinearGradient>
                
                {/* Dots Pager */}
                <View style={styles.dotsContainer}>
                  <View style={styles.activeDot} />
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                </View>
              </View>
            )}

            {loading && !refreshing && searchTerm.length === 0 && (
              <View style={{ padding: 16 }}>
                <RestaurantCardSkeleton />
                <RestaurantCardSkeleton />
                <RestaurantCardSkeleton />
              </View>
            )}
          </>
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && !refreshing ? (
            <View style={styles.noResultsContainer}>
              {!effectiveCoords ? (
                <>
                  <View style={styles.noResultsIconContainer}>
                    <Ionicons name="location-outline" size={64} color="#E5E7EB" />
                    <View style={styles.noResultsIconOverlay}>
                      <Ionicons name="alert" size={24} color={BrandColors.primary} />
                    </View>
                  </View>
                  <Text style={styles.noResultsTitle}>{t('restaurants.location_required')}</Text>
                  <Text style={styles.noResultsSubtitle}>{t('restaurants.location_required_subtitle')}</Text>
                  <TouchableOpacity 
                    style={styles.grantPermissionButton} 
                    onPress={() => fetchLocation(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.grantPermissionText}>{t('restaurants.grant_permission')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.noResultsIconContainer}>
                    <Ionicons name="search-outline" size={64} color="#E5E7EB" />
                    <View style={styles.noResultsIconOverlay}>
                      <Ionicons name="close" size={24} color={BrandColors.primary} />
                    </View>
                  </View>
                  <Text style={styles.noResultsTitle}>
                    {searchTerm.trim() ? t('search.no_results_found') : t('restaurants.no_results')}
                  </Text>
                  <Text style={styles.noResultsSubtitle}>
                    {searchTerm.trim() 
                      ? t('search.no_results_subtitle') 
                      : t('restaurants.no_results_subtitle')}
                  </Text>
                  {searchTerm.trim() && (
                    <TouchableOpacity 
                      style={styles.clearFiltersButton} 
                      onPress={() => setSearchTerm('')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearFiltersText}>{t('search.clear_all')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : null
        }
      />

      {cartItems.length > 0 && (
        <TouchableOpacity
          style={[styles.viewCartButton, { bottom: 12 }]}
          onPress={() => navigation.navigate('CartTab')}
          activeOpacity={0.8}
        >
          <View style={styles.cartInfo}>
            <Ionicons name="cart" size={24} color="#fff" />
            <Text style={styles.cartCount}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('restaurants.items_count')}
            </Text>
          </View>
          <Text style={styles.cartTotal}>
            {(() => {
              const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              const currency = cartItems.length > 0 ? cartItems[0].restaurantCurrency : undefined;
              return formatPrice(total, currency);
            })()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default RestaurantListScreen;
