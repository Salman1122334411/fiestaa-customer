import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Keyboard,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { styles } from './RestaurantDetailsScreen.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, MenuItem, AddonOption, getRestaurantById } from '../lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart, calculateItemSubtotal } from "../hooks/useCart";
import { formatPrice } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';
import Preloader from '../components/Preloader';
import QuantitySelector from '../components/QuantitySelector';
import ProductDetailModal from '../components/ProductDetailModal';
import { resolveDeliveryCharge } from '../utils/delivery';

const getRestaurantStatus = (operatingHours: any, t: any, closedDate?: string, deliverySlots?: any[]) => {
  const now = new Date();
  
  if (closedDate) {
    const closedDateObj = new Date(closedDate);
    if (closedDateObj.toDateString() === now.toDateString()) {
      return {
        isOpen: false,
        openText: t('restaurant.closed_today'),
        closesText: t('restaurant.holiday_closure'),
        statusColor: '#EF4444'
      };
    }
  }

  if (!operatingHours || typeof operatingHours !== 'object' || Object.keys(operatingHours).length === 0) {
    if (deliverySlots && deliverySlots.length > 0) {
      const currentDay = now.getUTCDay();
      const todaySlots = deliverySlots.filter(s => s.dayOfWeek === currentDay);
      
      if (todaySlots.length === 0) {
        return {
          isOpen: false,
          openText: t('restaurant.closed'),
          closesText: '',
          statusColor: '#EF4444'
        };
      }

      const currentTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      const inSlot = todaySlots.some(s => {
        const start = parseTime(s.startTime);
        const end = parseTime(s.endTime);
        return currentTotalMinutes >= start && currentTotalMinutes < end;
      });

      if (inSlot) {
        return {
          isOpen: true,
          openText: t('restaurant.open'),
          closesText: '',
          statusColor: '#10B981'
        };
      } else {
        return {
          isOpen: false,
          openText: t('restaurant.closed'),
          closesText: '',
          statusColor: '#EF4444'
        };
      }
    }

    return {
      isOpen: true,
      openText: t('restaurant.open'),
      closesText: `${t('restaurant.closes_at')} ${t('common.late_night')}`,
      statusColor: '#10B981'
    };
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getUTCDay()];
  
  const todayHours = operatingHours[currentDay];
  
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return {
      isOpen: false,
      openText: t('restaurant.closed'),
      closesText: '',
      statusColor: '#EF4444'
    };
  }

  const currentTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const openMinutes = parseTime(todayHours.open);
  const closeMinutes = parseTime(todayHours.close);

  let isOpen = false;
  if (closeMinutes <= openMinutes) {
    isOpen = currentTotalMinutes >= openMinutes || currentTotalMinutes < closeMinutes;
  } else {
    isOpen = currentTotalMinutes >= openMinutes && currentTotalMinutes < closeMinutes;
  }

  const formatLocalTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setUTCHours(h, m, 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  if (isOpen) {
    return {
      isOpen: true,
      openText: t('restaurant.open'),
      closesText: `${t('restaurant.closes_at')} ${formatLocalTime(todayHours.close)}`,
      statusColor: '#10B981'
    };
  } else {
    return {
      isOpen: false,
      openText: t('restaurant.closed'),
      closesText: `${t('restaurant.opens_at')} ${formatLocalTime(todayHours.open)}`,
      statusColor: '#EF4444'
    };
  }
};

const RestaurantHeader = React.memo(({ 
  restaurant, 
  searchQuery, 
  setSearchQuery, 
  formatPrice, 
  navigation, 
  t,
  categories,
  selectedCategory,
  onSelectCategory
}: any) => {
  const insets = useSafeAreaInsets();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const bannerScrollViewRef = React.useRef<ScrollView>(null);

  const rawCoverImage = restaurant?.coverImage || restaurant?.cover_image || '';
  const slides = [
    { type: 'cover', uri: rawCoverImage },
    { type: 'promo1', source: require('../../assets/pizza-heart-p1.png') },
    { type: 'promo2', source: require('../../assets/pizza-heart-p2.png') }
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const nextIndex = (activeSlideIndex + 1) % slides.length;
      const screenWidth = Dimensions.get('window').width;
      bannerScrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeSlideIndex, slides.length]);

  const handleBannerScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const index = Math.round(contentOffset / screenWidth);
    if (index >= 0 && index < slides.length) {
      setActiveSlideIndex(index);
    }
  };

  return (
    <>
      {/* Top Combined Banner Slider */}
      <View style={styles.bannerSliderContainer}>
        <ScrollView
          ref={bannerScrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleBannerScroll}
          scrollEventThrottle={16}
          style={styles.bannerSlider}
        >
          {slides.map((slide, index) => (
            <Image
              key={index}
              source={slide.uri ? { uri: slide.uri } : slide.source}
              style={styles.bannerSlideImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Back Button absolute on top of slider */}
        <TouchableOpacity
          style={[
            styles.floatingBackButton,
            { top: insets.top + 12 }
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Pagination Dots overlaid absolutely inside the banner slider at the bottom */}
        <View style={styles.bannerDotsContainer}>
          {slides.map((_, idx) => (
            <View key={idx} style={[styles.bannerDot, activeSlideIndex === idx && styles.bannerDotActive]} />
          ))}
        </View>
      </View>

      {/* Premium Repositioned Info Card (Below Slider, no overlap) */}
      <View style={styles.detailsContentContainer}>
        {/* Rating, Delivery charges, and Delivery time inline row */}
        <View style={styles.detailsRow}>
          {/* Rating */}
          <View style={styles.detailsRowItem}>
            <Ionicons name="star-outline" size={18} color="#FF5C00" style={styles.detailsRowIcon} />
            <Text style={styles.detailsRowText}>{restaurant.rating ? Number(restaurant.rating).toFixed(1) : "5.0"}</Text>
          </View>

          {/* Delivery Charges */}
          <View style={styles.detailsRowItem}>
            <Ionicons name="bicycle" size={20} color="#FF5C00" style={styles.detailsRowIcon} />
            <Text style={styles.detailsRowText}>
              {restaurant.deliveryCharges === 0 ? t('restaurant.free_delivery', 'Free') : formatPrice(restaurant.deliveryCharges || 0, restaurant.currency)}
            </Text>
          </View>

          {/* Delivery Time */}
          <View style={styles.detailsRowItem}>
            <Ionicons name="time-outline" size={18} color="#FF5C00" style={styles.detailsRowIcon} />
            <Text style={styles.detailsRowText}>
              {restaurant.deliveryTime || '20'} {t('common.min', 'min')}
            </Text>
          </View>
        </View>

        {/* Restaurant Name and Description */}
        <Text style={styles.detailsRestaurantName}>{restaurant.name}</Text>
        {restaurant.description && (
          <Text style={styles.detailsRestaurantDesc}>{restaurant.description}</Text>
        )}
      </View>

      {/* <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`${t('restaurants.search_placeholder')}`}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View> */}

      {/* Premium Category Slider */}
      {categories && categories.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesScrollContent}
          style={styles.categoriesContainer}
        >
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.categoryPill,
                selectedCategory === cat.name ? styles.categoryPillActive : styles.categoryPillInactive
              ]}
              onPress={() => onSelectCategory(cat.name)}
              activeOpacity={0.8}
            >
              <Text style={selectedCategory === cat.name ? styles.categoryPillTextActive : styles.categoryPillTextInactive}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );
});

export const RestaurantDetailsScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { t } = useTranslation();
  const { restaurant: initialRestaurant, selectedMenuItem } = route.params;
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cartItems, addToCart, removeFromCart, getTotal } = useCart();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    fetchRestaurantDetails();
    fetchMenuItems();
  }, []);

  // Dynamically group menuItems using the `category` string field
  const groupedCategories = React.useMemo(() => {
    const groups: { [key: string]: MenuItem[] } = {};
    menuItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return Object.entries(groups).map(([name, items]) => ({
      name,
      count: items.length,
      items
    }));
  }, [menuItems]);

  // Default select the first available category pill once categories are loaded
  useEffect(() => {
    if (!selectedCategory && groupedCategories.length > 0) {
      setSelectedCategory(groupedCategories[0].name);
    }
  }, [groupedCategories, selectedCategory]);

  // Construct flat list data containing headers and items (grouped into pairs of two for grid)
  const flatListData = React.useMemo(() => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const filtered = menuItems.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );

      const list: any[] = [];
      for (let i = 0; i < filtered.length; i += 2) {
        list.push({
          isHeader: false,
          isProductRow: true,
          id: `search-row-${filtered[i].id}-${filtered[i+1] ? filtered[i+1].id : 'empty'}`,
          item1: filtered[i],
          item2: filtered[i+1] || null
        });
      }
      return list;
    }

    const list: any[] = [];
    groupedCategories.forEach(group => {
      list.push({ isHeader: true, id: `header-${group.name}`, name: group.name, count: group.count });
      for (let i = 0; i < group.items.length; i += 2) {
        const item1 = group.items[i];
        const item2 = group.items[i + 1] || null;
        list.push({
          isHeader: false,
          isProductRow: true,
          id: `row-${item1.id}-${item2 ? item2.id : 'empty'}`,
          item1,
          item2
        });
      }
    });
    return list;
  }, [groupedCategories, searchQuery, menuItems]);

  useEffect(() => {
    if (selectedMenuItem && flatListData.length > 0) {
      const index = flatListData.findIndex(item => 
        !item.isHeader && item.isProductRow && 
        (item.item1.id === selectedMenuItem.id || (item.item2 && item.item2.id === selectedMenuItem.id))
      );
      if (index !== -1) {
        setSelectedProduct(selectedMenuItem);
        setIsModalVisible(true);

        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0
          });
        }, 300);
      }
    }
  }, [flatListData, selectedMenuItem]);

  const fetchRestaurantDetails = async () => {
    try {
      console.log(`Fetching details for restaurant ${initialRestaurant.id} via Web API...`);
      const data = await getRestaurantById(initialRestaurant.id);
      
      if (data) {
        setRestaurant(data);
        if (data.menuItems) {
          setMenuItems(data.menuItems);
        }
      }
    } catch (e) {
      console.error('Exception fetching restaurant details via API:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    if (menuItems.length > 0) {
      setLoading(false);
      return;
    }

    try {
      console.log(`Fetching items for restaurant ${initialRestaurant.id} directly via fallback...`);
      const { data, error } = await supabase
        .from('MenuItem')
        .select('*')
        .eq('restaurantId', initialRestaurant.id)
        .order('category');

      if (error) {
        console.error('Error fetching menu items via fallback:', error.message);
        setError(t('restaurants.load_error'));
        return;
      }

      if (data) {
        const { data: addonGroups } = await supabase
          .from('AddonGroup')
          .select('menuItemId')
          .eq('restaurantId', initialRestaurant.id);
        
        const addonSet = new Set(addonGroups?.map(ag => ag.menuItemId) || []);
        
        const itemsWithAddonFlag = data.map(item => ({
          ...item,
          hasAddons: addonSet.has(item.id)
        }));

        setMenuItems(itemsWithAddonFlag);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      setError(t('common.error') + ': ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (menuItem: any) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    addToCart({
      id: menuItem.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantCurrency: restaurant.currency,
      name: menuItem.label,
      price: menuItem.price,
      quantity: 1,
      image: menuItem.image,
      deliveryCharges: resolveDeliveryCharge(restaurant, fallbackDeliveryFee),
      isTaxIncluded: restaurant.isTaxIncluded,
      serviceChargeRate: restaurant.serviceChargeRate,
      taxRate: restaurant.taxRate,
    });
  };

  const handleRemoveFromCart = (menuItem: any) => {
    const cartItem = cartItems.find(item => item.id === menuItem.id && (!item.selectedOptions || item.selectedOptions.length === 0));
    removeFromCart(menuItem.id, cartItem?.selectedOptions || []);
  };

  const handleModalAddToCart = (menuItem: any, quantity: number, selectedOptions: AddonOption[]) => {
    const fallbackDeliveryFee = Number(t('common.delivery_fee_default'));
    addToCart({
      id: menuItem.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantCurrency: restaurant.currency,
      name: menuItem.label,
      price: menuItem.price,
      quantity: quantity,
      image: menuItem.image,
      deliveryCharges: resolveDeliveryCharge(restaurant, fallbackDeliveryFee),
      selectedOptions: selectedOptions,
      isTaxIncluded: restaurant.isTaxIncluded,
      serviceChargeRate: restaurant.serviceChargeRate,
      taxRate: restaurant.taxRate,
    }, true);

    setIsModalVisible(false);
  };

  const handleSelectCategory = (categoryName: string | null) => {
    setSelectedCategory(categoryName);
    if (!categoryName) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    
    const index = flatListData.findIndex(item => item.isHeader && item.name === categoryName);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0
      });
    }
  };

  const renderProductCard = (item: any) => {
    const totalQuantity = cartItems
      .filter((i) => i.id === item.id)
      .reduce((sum, i) => sum + i.quantity, 0);
      
    const itemInCart = cartItems.find((i) => i.id === item.id);

    const allGroupedItems = cartItems.reduce((acc: Record<string, any[]>, item) => {
      acc[item.id] = acc[item.id] || [];
      acc[item.id].push(item);
      return acc;
    }, {});

    const onAddPress = () => {
      const status = getRestaurantStatus(restaurant.operatingHours, t, restaurant.closedDate, restaurant.DeliverySlot || restaurant.deliverySlots);
      
      if (!status.isOpen) {
        Alert.alert(t('common.info'), t('restaurant.currently_closed_error'));
        return;
      }

      const totalQtyInCart = allGroupedItems[item.id] 
        ? (allGroupedItems[item.id] as any[]).reduce((acc: number, i: any) => acc + i.quantity, 0) 
        : 0;
      const hasAddons = item.hasAddons || (item.addonGroups && item.addonGroups.length > 0) || (item.AddonGroup && item.AddonGroup.length > 0);
      
      if (totalQtyInCart === 0 || hasAddons) {
        setSelectedProduct(item);
        setIsModalVisible(true);
        return;
      }
      handleAddToCart(item);
    };

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => {
          setSelectedProduct(item);
          setIsModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={item.image ? { uri: item.image } : require('../../assets/placeholder.png')}
          style={styles.productCardImage}
          resizeMode="cover"
        />
        <View style={styles.productCardDetails}>
          <Text style={styles.productCardTitle} >{item.label}</Text>
          {/* <Text style={styles.productCardDescription} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text> */}
          
          <View style={styles.productCardBottomRow}>
            <Text style={styles.productCardPrice}>{formatPrice(item.price, restaurant.currency)}</Text>
            <TouchableOpacity 
              style={styles.productCardAddButton}
              onPress={onAddPress}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" fontWeight='bold' />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{item.name} ({item.count})</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.productRowContainer}>
        {renderProductCard(item.item1)}
        {item.item2 ? (
          renderProductCard(item.item2)
        ) : (
          <View style={styles.productCardPlaceholder} />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <Preloader fullScreen={true} />
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        ref={flatListRef}
        data={flatListData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.isHeader ? `header-${item.name}-${index}` : `${item.id}-${index}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        ListHeaderComponent={
          <RestaurantHeader
            restaurant={restaurant}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            formatPrice={formatPrice}
            navigation={navigation}
            t={t}
            categories={groupedCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>
              {searchQuery.trim() ? t('search.fresh_start') : t('home.no_popular_dishes')}
            </Text>
          </View>
        }
      />

      {cartItems.length > 0 && !isKeyboardVisible && (
        <TouchableOpacity
          style={[styles.viewCartButton, { bottom: 12 }]}
          onPress={() => navigation.navigate('CartTab')}
        >
          <View style={styles.cartInfo}>
            <Ionicons name="cart" size={24} color="#fff" />
            <Text style={styles.cartCount}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('restaurants.items_count')}
            </Text>
          </View>
          <Text style={styles.cartTotal}>
            {formatPrice(getTotal(), restaurant.currency)}
          </Text>
        </TouchableOpacity>
      )}
      <ProductDetailModal
        isVisible={isModalVisible}
        product={selectedProduct}
        restaurant={restaurant}
        onClose={() => setIsModalVisible(false)}
        onAddToCart={handleModalAddToCart}
        initialQuantity={cartItems.find(i => i.id === selectedProduct?.id)?.quantity || 0}
        initialSelectedOptions={cartItems.find(i => i.id === selectedProduct?.id)?.selectedOptions || []}
      />
    </View>
  );
};
