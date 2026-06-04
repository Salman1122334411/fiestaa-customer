import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Colors as BrandColors } from "../constants/Colors";
import { styles } from "./SearchScreen.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../utils/currency";
import {
  searchRestaurants,
  searchMenuItems,
  getRestaurants,
  getRestaurantsByFilters,
} from "../lib/supabase";
import { useSettings } from "../hooks/useSettings";
import { useCart, getCartItemKey } from "../hooks/useCart";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import { useLocation } from "../hooks/useLocation";
import { getDistance } from "../utils/geo";
import { supabase } from "../lib/supabase";
import { useDebounce } from "../hooks/useDebounce";
import { useTranslation } from "react-i18next";
import QuantitySelector from "../components/QuantitySelector";
import ProductDetailModal from "../components/ProductDetailModal";
import Preloader from "../components/Preloader";
import { resolveDeliveryCharge } from "../utils/delivery";

const { width } = Dimensions.get("window");

export const SearchScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms debounce
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { cartItems, addToCart, removeFromCart, findLatestItemByProductId } = useCart();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const searchInputRef = useRef<TextInput>(null);

  // Auto-focus search input when navigated from HomeScreen
  useEffect(() => {
    if (route?.params?.fromHome) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350);
      navigation.setParams({ fromHome: undefined });
    }
  }, [route?.params?.fromHome]);

  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [displayedCuisines, setDisplayedCuisines] = useState<string[]>([]);
  const [cuisineRotationIndex, setCuisineRotationIndex] = useState(0);
  const [cuisineTypesLoading, setCuisineTypesLoading] = useState(false);
  const [cuisineItemsMap, setCuisineItemsMap] = useState<{ [key: string]: any[] }>({});
  const [cuisineLoading, setCuisineLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [popularProductsLoading, setPopularProductsLoading] = useState(false);
  const [discoveryRestaurants, setDiscoveryRestaurants] = useState<any[]>([]);
  const [popularRestaurants, setPopularRestaurants] = useState<any[]>([]);
  const [popularShops, setPopularShops] = useState<any[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const removeRecentSearch = (term: string) => {
    setRecentSearches((prev) => prev.filter((item) => item !== term));
  };

  const scrollY = new Animated.Value(0);
  const cartCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // --- Location & Default Address State ---
  const { currentLocation, fetchLocation, coords } = useLocation();
  const { deliveryRadius } = useSettings();
  const [defaultAddressCoords, setDefaultAddressCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const effectiveCoords = coords || defaultAddressCoords;
  //---------------------------------------------

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchDefaultAddress(session.user.id);
      }
    });
  }, []);

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

  // --- Cuisine Icon Mapping ---
  const getCuisineIcon = (cuisineName: string) => {
    const cuisine = cuisineName.toLowerCase();
    
    // Pizza
    if (cuisine.includes('pizza')) return 'pizza-outline';
    
    // Burgers
    if (cuisine.includes('burger') || cuisine.includes('fast food')) return 'fast-food-outline';
    
    // Asian cuisines
    if (cuisine.includes('sushi') || cuisine.includes('japanese')) return 'restaurant-outline';
    if (cuisine.includes('chinese')) return 'restaurant-outline';
    if (cuisine.includes('thai')) return 'restaurant-outline';
    if (cuisine.includes('indian')) return 'restaurant-outline';
    
    // Italian
    if (cuisine.includes('italian') || cuisine.includes('pasta')) return 'restaurant-outline';
    
    // Mexican
    if (cuisine.includes('mexican') || cuisine.includes('taco')) return 'restaurant-outline';
    
    // American
    if (cuisine.includes('american')) return 'restaurant-outline';
    
    // Desserts
    if (cuisine.includes('dessert') || cuisine.includes('sweet') || cuisine.includes('bakery')) return 'ice-cream-outline';
    
    // Drinks
    if (cuisine.includes('coffee') || cuisine.includes('cafe')) return 'cafe-outline';
    if (cuisine.includes('bar') || cuisine.includes('pub')) return 'beer-outline';
    
    // Healthy
    if (cuisine.includes('salad') || cuisine.includes('healthy') || cuisine.includes('vegan')) return 'leaf-outline';
    
    // BBQ/Grill
    if (cuisine.includes('bbq') || cuisine.includes('grill')) return 'flame-outline';
    
    // Seafood
    if (cuisine.includes('seafood') || cuisine.includes('fish')) return 'fish-outline';
    
    // Adult/Tobacco
    if (cuisine.includes('tobacco') || cuisine.includes('adult')) return 'shield-checkmark-outline';
    
    // Default
    return 'restaurant-outline';
  };

  // --- Cuisine Category Display ---
  useEffect(() => {
    // Simply display first 2 cuisines without rotation
    if (cuisineTypes.length <= 2) {
      setDisplayedCuisines(cuisineTypes);
    } else {
      setDisplayedCuisines(cuisineTypes.slice(0, 2));
    }
  }, [cuisineTypes]);

  // --- Dynamic Typewriter Placeholder ---
  const [placeholderText, setPlaceholderText] = useState("");
  const suggestions = [
    t('search.placeholder_pizza'),
    t('search.placeholder_burger'),
    t('search.placeholder_sushi'),
    t('search.placeholder_pasta'),
    t('search.placeholder_dessert'),
  ];
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleTyping = () => {
      const currentFullText = suggestions[suggestionIndex];

      if (!isDeleting) {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length + 1));
        setTypingSpeed(150);

        if (placeholderText === currentFullText) {
          setTimeout(() => setIsDeleting(true), 2000); // Pause at end
        }
      } else {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length - 1));
        setTypingSpeed(50);

        if (placeholderText === "") {
          setIsDeleting(false);
          setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        }
      }
    };

    const timeout = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, suggestionIndex, typingSpeed]);
  // ---------------------------------------

  const addToRecentSearches = (term: string) => {
    if (term.trim()) {
      setRecentSearches((prev) => {
        const updatedSearches = [term, ...prev.filter((item) => item !== term)];
        return updatedSearches.slice(0, 5);
      });
    }
  };


  const handleModalAddToCart = (menuItem: any, quantity: number, selectedOptions: any[]) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    // We already have restaurant details from the product object in Search.
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

    setIsModalVisible(false);
    // Removed auto-navigation to Cart as per user request to stay on the page
  };


  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      addToRecentSearches(searchQuery);
    }
  };

  // Fetch search results using effective coordinates.
  useEffect(() => {
    let isActive = true;
    const fetchResults = async () => {
      if (debouncedSearchQuery.trim().length >= 1) {
        setLoading(true);
        try {
          if (effectiveCoords) {
            const effectiveRadius = deliveryRadius || 50;
            let [resResults, itemResults] = await Promise.all([
              searchRestaurants(debouncedSearchQuery, effectiveCoords.latitude, effectiveCoords.longitude, effectiveRadius),
              searchMenuItems(debouncedSearchQuery, effectiveCoords.latitude, effectiveCoords.longitude, effectiveRadius),
            ]);

            if (resResults.length === 0 && itemResults.length === 0) {
              const [globalRes, globalItems] = await Promise.all([
                searchRestaurants(debouncedSearchQuery, effectiveCoords.latitude, effectiveCoords.longitude, 99999),
                searchMenuItems(debouncedSearchQuery, effectiveCoords.latitude, effectiveCoords.longitude, 99999),
              ]);
              resResults = globalRes;
              itemResults = globalItems;
            }

            if (isActive) {
              setRestaurants(resResults);
              setMenuItems(itemResults);
            }
          } else {
            // No coordinates yet — search without location filter
            const [restaurantResults, menuItemResults] = await Promise.all([
              searchRestaurants(debouncedSearchQuery, 0, 0, 99999),
              searchMenuItems(debouncedSearchQuery, 0, 0, 99999),
            ]);
            if (isActive) {
              setRestaurants(restaurantResults);
              setMenuItems(menuItemResults);
            }
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        setRestaurants([]);
        setMenuItems([]);
      }
    };

    fetchResults();

    return () => {
      isActive = false;
    };
  }, [debouncedSearchQuery, effectiveCoords, deliveryRadius, refreshing]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The useEffect above will re-trigger because 'refreshing' changed
    // We just wait a bit to simulate a reload and then set refreshing to false
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Fetch popular cuisines — runs with or without location, falls back to all restaurants
  useEffect(() => {
    if (!effectiveCoords) return; // Wait for effectiveCoords to be available
    const fetchCuisineTypes = async () => {
      setCuisineTypesLoading(true);
      setCuisineLoading(true);
      try {
        const allRestaurants = await getRestaurants();
        let effectiveRestaurants = allRestaurants;

        if (effectiveCoords) {
          const effectiveRadius = deliveryRadius || 50;
          const filteredRestaurants = allRestaurants.filter((r: any) => {
            try {
              const distance = getDistance(
                effectiveCoords.latitude,
                effectiveCoords.longitude,
                r.latitude,
                r.longitude
              );
              return distance <= effectiveRadius;
            } catch { return false; }
          });
          effectiveRestaurants = filteredRestaurants.length > 0 ? filteredRestaurants : allRestaurants;
        }

        const allRes = effectiveRestaurants.length > 0 ? effectiveRestaurants : allRestaurants;

        // Restaurants section (discovery) - Fallback to ALL if nearby is empty
        setDiscoveryRestaurants(
          allRes
            .filter((r: any) => !!r && !!r.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
        );

        // Filter Popular Restaurants
        const restaurantsOnly = allRes.filter((r: any) => 
          r.segment === 'RESTAURANT' || 
          r.segment?.toUpperCase() === 'RESTAURANT' ||
          r.cuisineType?.toUpperCase()?.includes('PIZZA') ||
          r.cuisineType?.toUpperCase()?.includes('BURGER') ||
          r.cuisineType?.toUpperCase()?.includes('FAST FOOD') ||
          (r.segment && r.segment.toLowerCase().includes('restaurant'))
        );
        setPopularRestaurants(restaurantsOnly.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10));

        // Filter Popular Shops (Other stores)
        const shopsOnly = allRes.filter((r: any) => 
          !restaurantsOnly.some(res => res.id === r.id)
        );
        setPopularShops(shopsOnly.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10));

        // Filter Featured Restaurants (Highest Rated)
        const featured = restaurantsOnly.filter((r: any) => r.rating >= 4.5);
        setFeaturedRestaurants(
          (featured.length > 0 ? featured : restaurantsOnly)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10)
        );

        const cuisines = Array.from(
          new Set(effectiveRestaurants.map((r: any) => r.cuisineType))
        ).filter(c => !!c && typeof c === 'string' && c.trim().length > 0);
        setCuisineTypes(cuisines);

        // Fetch menu items for each cuisine
        const itemsMap: { [key: string]: any[] } = {};
        for (const cuisine of cuisines) {
          const restaurants = effectiveRestaurants.filter(r => r.cuisineType === cuisine);
          let allItems: any[] = [];

          restaurants.forEach(r => {
            const items = r.MenuItem || r.menuItems;
            if (items) {
              const itemsWithRestaurant = items.map((item: any) => ({
                ...item,
                Restaurant: {
                  id: r.id,
                  name: r.name,
                  currency: r.currency || t('common.currency_default'),
                  deliveryCharges: resolveDeliveryCharge(r, Number(t('common.delivery_fee_default')))
                }
              }));
              allItems = [...allItems, ...itemsWithRestaurant];
            }
          });

          // Filter items whose label or category actually matches the cuisine
          const cuisineLower = cuisine.toLowerCase();
          const relevantItems = allItems.filter((item: any) => {
            const label = (item.label || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            return label.includes(cuisineLower) || category.includes(cuisineLower) || cuisineLower.includes(label.split(' ').pop() || '');
          });

          // Use relevant items if found, otherwise fall back to all items from cuisine restaurants
          const sourceItems = relevantItems.length > 0 ? relevantItems : allItems;
          const shuffled = sourceItems.sort(() => 0.5 - Math.random()).slice(0, 5);
          itemsMap[cuisine] = shuffled;
        }
        setCuisineItemsMap(itemsMap);

        // EXTRA: Collect some popular products from across all nearby restaurants for the "Initial Load"
        const topProducts = effectiveRestaurants.flatMap(r => {
          const items = r.MenuItem || r.menuItems || [];
          return items.slice(0, 2).map((item: any) => ({
            ...item,
            Restaurant: {
              id: r.id,
              name: r.name,
              currency: r.currency || t('common.currency_default'),
              deliveryCharges: resolveDeliveryCharge(r, Number(t('common.delivery_fee_default')))
            }
          }));
        }).sort(() => 0.5 - Math.random()).slice(0, 5);

        setPopularProducts(topProducts);

      } catch (error) {
        console.error("Error fetching cuisines: ", error);
      } finally {
        setCuisineTypesLoading(false);
        setCuisineLoading(false);
        setPopularProductsLoading(false);
      }
    };
    fetchCuisineTypes();
  }, [effectiveCoords, deliveryRadius]);

  return (
    <View style={styles.container}>
      {/* Premium Polished Header */}
      <LinearGradient
        colors={['#FFF7ED', '#FFFAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        {/* Enhanced Search Bar */}
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for restaurants and other stores"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            underlineColorAndroid="transparent"
            autoFocus={false}
            multiline={false}
            numberOfLines={1}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          />
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
      >
        {loading ? (
          <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
            <Preloader fullScreen={false} size={80} />
          </View>
        ) : (
          <>
            {/* Search Results Mode */}
            {searchQuery.length > 0 ? (
              <>
                {restaurants.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>{t('search.restaurants')}</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {restaurants.slice(0, 5).map((restaurant: any) => (
                        <RestaurantCard
                          key={`${restaurant.id}-search`}
                          restaurant={restaurant}
                          onPress={() => {
                            navigation.navigate("RestaurantDetails", { restaurant });
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {menuItems.length > 0 && (
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
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {menuItems.slice(0, 5).map((item: any) => (
                        <MenuItemCard
                          key={`${item.id}-search`}
                          item={item}
                          onPress={() => {
                            setSelectedProduct(item);
                            setIsModalVisible(true);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {restaurants.length === 0 && menuItems.length === 0 && !loading && debouncedSearchQuery === searchQuery && (
                  <View style={styles.searchEmptyContainer}>
                    <View style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: '#FFF7ED',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: '#FED7AA',
                    }}>
                      <Ionicons name="search-outline" size={50} color="#EA580C" style={{ opacity: 0.6 }} />
                    </View>
                    <Text style={styles.searchEmptyText}>{t('search.no_results_suggest')}</Text>
                  </View>
                )}

                {/* Always show Discovery Mode components below zero results to "still find something" */}
                {(restaurants.length === 0 && menuItems.length === 0) && !loading && debouncedSearchQuery === searchQuery && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 10 }]}>{t('search.maybe_you_like')}</Text>
                  </View>
                )}
              </>
            ) : (
              /* Discovery Mode (Empty Search State) */
              <>
                {/* Recent Activity - Chip Style */}
                {recentSearches.length > 0 && (
                  <View style={styles.recentSearchesSection}>
                    <View style={styles.recentSearchesHeader}>
                      <View style={styles.recentSearchesTitleContainer}>
                        <Text style={styles.recentSearchesTitle}>Recent Activity</Text>
                        <Text style={styles.recentSearchesSubtitle}>Your latest searches</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.clearAllButton}
                        onPress={() => setRecentSearches([])}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.clearAllText}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.recentSearchesList}>
                      {recentSearches.map((term, idx) => (
                        <View key={`recent-chip-${idx}`} style={styles.recentSearchItem}>
                          <TouchableOpacity
                            style={styles.recentSearchTextButton}
                            onPress={() => setSearchQuery(term)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="time-outline" size={15} color="#9CA3AF" style={{ marginRight: 6 }} />
                            <Text style={[styles.recentSearchText, { flexShrink: 1 }]} numberOfLines={1}>{term}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeRecentSearchButton}
                            onPress={() => removeRecentSearch(term)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close" size={14} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Popular Stores Section */}
                {popularRestaurants.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Popular Stores</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      decelerationRate="fast"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {popularRestaurants.map((restaurant: any) => (
                        <RestaurantCard
                          key={`${restaurant.id}-pop-res`}
                          restaurant={restaurant}
                          onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Popular Dishes / Products Section */}
                {popularProducts.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Popular Near You</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      decelerationRate="fast"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {popularProducts.map((item: any) => (
                        <MenuItemCard
                          key={`${item.id}-pop-dish`}
                          item={item}
                          onPress={() => {
                            setSelectedProduct(item);
                            setIsModalVisible(true);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Popular Shops Section (Other Stores) */}
                {popularShops.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Popular Shops</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      decelerationRate="fast"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {popularShops.map((shop: any) => (
                        <RestaurantCard
                          key={`${shop.id}-pop-shop`}
                          restaurant={shop}
                          onPress={() => navigation.navigate("RestaurantDetails", { restaurant: shop })}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Featured Restaurants Section */}
                {featuredRestaurants.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Featured Restaurants</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      decelerationRate="fast"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {featuredRestaurants.map((restaurant: any) => (
                        <RestaurantCard
                          key={`${restaurant.id}-feat-res`}
                          restaurant={restaurant}
                          onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Cuisine-based Product Sections */}
                {Object.entries(cuisineItemsMap).filter(([, items]) => items.length > 0).map(([cuisine, items]) => (
                  <View key={`cuisine-${cuisine}`} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>{cuisine}</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      decelerationRate="fast"
                      contentContainerStyle={styles.cuisineItemsScroll}
                    >
                      {items.map((item: any) => (
                        <MenuItemCard
                          key={`${item.id}-${cuisine}`}
                          item={item}
                          onPress={() => {
                            setSelectedProduct(item);
                            setIsModalVisible(true);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </Animated.ScrollView>

      <ProductDetailModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
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
};

const RestaurantCard = ({
  restaurant,
  onPress,
}: {
  restaurant: any;
  onPress: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.modernRestaurantCard} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{
          uri: restaurant.coverImage || "https://via.placeholder.com/600/FC5A23/FFFFFF?text=Restaurant",
        }}
        style={[styles.modernRestaurantImage, { backgroundColor: '#F3F4F6' }]}
        resizeMode="cover"
        defaultSource={{ uri: 'https://via.placeholder.com/600/FC5A23/FFFFFF?text=Restaurant' }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      />
      <View style={styles.modernCardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.modernRestaurantName} numberOfLines={1}>
            {restaurant.name || ""}
          </Text>
          <View style={styles.modernRatingBadge}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.modernRatingText}>
              {restaurant.rating ? restaurant.rating.toFixed(1) : "5.0"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.modernRestaurantCuisine} numberOfLines={1}>
            {restaurant.cuisineType || t('restaurant.default_cuisine')}
          </Text>
          <View style={styles.modernDeliveryInfo}>
            <Ionicons name="time-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.modernDeliveryText}>
              {restaurant.deliveryTime ? `${restaurant.deliveryTime} ${t('common.min')}` : `${t('common.delivery_time_range_default')} ${t('common.min')}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const MenuItemCard = ({
  item,
  onPress,
  variant = "default",
}: {
  item: any;
  onPress: () => void;
  variant?: "default" | "grid";
}) => {
  const { t } = useTranslation();
  const { cartItems, addToCart, removeFromCart, findLatestItemByProductId } = useCart();
  const totalQuantity = cartItems.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <TouchableOpacity
      style={[styles.menuItemCard, variant === "grid" && styles.menuItemCardGrid]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/150/FC5A23/FFFFFF?text=Food" }}
          style={[styles.menuItemImage, { backgroundColor: '#F3F4F6' }]}
          resizeMode="cover"
          defaultSource={{ uri: 'https://via.placeholder.com/150/FC5A23/FFFFFF?text=Food' }}
        />
        <QuantitySelector
          initialQuantity={totalQuantity}
          onUpdate={(newQty) => {
            const hasAddons = item.addonGroups && item.addonGroups.length > 0;
            const requiresSelection = hasAddons && item.addonGroups.some((g: any) => g.isRequired && !g.options.some((o: any) => o.isDefault));

            if (newQty > totalQuantity) {
              if (requiresSelection || hasAddons) {
                // Open modal if mandatory addons are missing defaults OR if it has addons at all
                onPress();
                return;
              }

              const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
              addToCart({
                id: item.id,
                restaurantId: item.restaurantId,
                restaurantName: item.Restaurant?.name || '',
                restaurantCurrency: item.Restaurant?.currency,
                name: item.label,
                price: item.price,
                quantity: 1,
                image: item.image,
                deliveryCharges: resolveDeliveryCharge(item.Restaurant, fallbackDeliveryFee)
              });
            } else if (newQty < totalQuantity) {
              removeFromCart(item.id);
            }
          }}
          containerStyle={styles.menuItemQuantitySelector}
          size="small"
        />
      </View>
      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName} numberOfLines={2} ellipsizeMode="tail">
          {item.label || ""}
        </Text>
        {item.Restaurant?.deliveryTime ? (
          <Text style={styles.menuItemMeta}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />{" "}
            {item.Restaurant.deliveryTime} {t('common.min')}
          </Text>
        ) : null}
        <Text style={styles.menuItemPrice}>
          {item.price ? formatPrice(item.price, item.Restaurant?.currency) : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default SearchScreen;