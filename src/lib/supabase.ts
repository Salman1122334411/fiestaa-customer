import { supabase } from './supabaseClient';
export { supabase };
import { getDistance } from "../utils/geo";

export type SelectionType = 'SINGLE' | 'MULTIPLE';

export interface AddonOption {
  id: string;
  addonGroupId: string;
  name: string;
  priceAdjustment: number;
  price_adjustment?: number; // Support snake_case from DB/API
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  image?: string;
  linkedMenuItemId?: string;
}

export interface AddonGroup {
  id: string;
  restaurantId: string;
  name: string;
  displayName: string | null;
  selectionType: SelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  sortOrder: number;
  isActive: boolean;
  options: AddonOption[];
}

export interface DeliverySlot {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type MenuItem = {
  id: string;
  restaurantId: string;
  label: string;
  description: string;
  price: number;
  image: string;
  category: string;
  created_at?: string;
  addonGroups?: AddonGroup[];
};

export type Restaurant = {
  id: string;
  name: string;
  chainName: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisineType: string;
  storeType: string;
  segment: string;
  city: string;
  area: string;
  rating: number;
  coverImage: string;
  logo?: string;
  deliveryTime: string;
  minimumOrder: string;
  deliveryCharges: number;
  currency?: string;
  createdAt?: string;
  closedDate?: string;
  isTaxIncluded?: boolean;
  serviceChargeRate?: number;
  taxRate?: number;
  acceptsScheduledOrders?: boolean;
  deliverySlotDuration?: number;
  preparationTime?: number;
  DeliverySlot?: DeliverySlot[];
  menuItems?: MenuItem[];
  MenuItem?: MenuItem[];
  operatingHours?: any;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  options?: any;
  price: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  userId: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
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
  taxAmount?: number;
  serviceChargeAmount?: number;
};


export const searchOrders = async (
  searchTerm: string,
  userId: string
): Promise<Order[]> => {
  if (!searchTerm.trim()) return []; // Return empty array if search term is empty

  const { data, error } = await supabase
    .from("Order")
    .select(
      `
      id,
      userId,
      status,
      totalAmount,
      deliveryAddress,
      driverId,
      assignedAt,
      pickedUpAt,
      deliveredAt,
      estimatedTime,
      actualTime,
      driverRating,
      createdAt,
      updatedAt,
      orderItems:OrderItem (
        id,
        orderId,
        menuItemId,
        quantity,
        options,
        price,
        name,
        createdAt,
        updatedAt
      )
    `
    )
    .eq("userId", userId)
    // Use ilike on the alias "orderItems.name" (case-insensitive)
    .ilike("orderItems.name", `%${searchTerm}%`)
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return data || [];
};


export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    console.log("Fetching all restaurants via Web API...");
    const data = await getRestaurantsFromAPI();
    console.log(`[getRestaurants] API returned ${data?.length || 0} restaurants. Restaurants with slots:`, 
      data?.filter((r: any) => (r.DeliverySlot && r.DeliverySlot.length > 0) || (r.deliverySlots && r.deliverySlots.length > 0)).length
    );
    return data || [];
  } catch (error: any) {
    console.error("Error fetching restaurants from Web API:", error.message);
    console.log("Attempting fallback to direct Supabase...");
    
    // Fallback to direct Supabase
    const { data: fallbackData, error: fallbackError } = await supabase
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
        acceptsScheduledOrders, 
        deliverySlotDuration, 
        preparationTime, 
        closedDate, 
        menuItems: MenuItem (id, label, price, image, description, category)
      `)
      .order("name");

    if (fallbackError) {
      console.error("CRITICAL: Supabase fallback failed:", fallbackError.message, fallbackError.details, fallbackError.hint);
      throw fallbackError;
    }
    return fallbackData || [];

  }
};

export const getRestaurantById = async (
  id: string
): Promise<Restaurant | null> => {
  try {
    console.log(`Fetching restaurant ${id} via Web API...`);
    const data = await getRestaurantByIdFromAPI(id);
    return data;
  } catch (error: any) {
    console.error(`Error fetching restaurant ${id} from Web API:`, error.message);
    console.log("Attempting fallback to direct Supabase...");

    const { data, error: fallbackError } = await supabase
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
        logo,
        deliveryTime, 
        minimumOrder, 
        deliveryCharges, 
        currency, 
        acceptsScheduledOrders, 
        deliverySlotDuration, 
        preparationTime, 
        closedDate, 
        DeliverySlot (id, dayOfWeek, startTime, endTime)
      `)
      .eq("id", id)
      .maybeSingle();

    if (fallbackError) {
      console.error(`CRITICAL: Supabase fallback for Restaurant ${id} failed:`, fallbackError.message);
      throw fallbackError;
    }
    return data;

  }
};

export const getRestaurantsByFilters = async ({
  cuisineType,
  segment,
  city,
  area,
  minRating,
}: {
  cuisineType?: string;
  segment?: string;
  city?: string;
  area?: string;
  minRating?: number;
}): Promise<Restaurant[]> => {
  try {
    const allRestaurants = await getRestaurants(); // Now using API call
    let filteredData = allRestaurants;
    
    const pizzaHeart = allRestaurants.find((r: any) => r.name?.toLowerCase().includes('pizza heart'));
    if (pizzaHeart) {
      console.log(`[PizzaHeart Filter Debug] Found in allRestaurants list before filters.`);
    }

    if (cuisineType) {
      filteredData = filteredData.filter(res => res.cuisineType === cuisineType);
    }
    if (segment) {
      filteredData = filteredData.filter(res => res.segment === segment);
    }
    if (city) {
      filteredData = filteredData.filter(res => res.city === city);
    }
    if (area) {
      filteredData = filteredData.filter(res => res.area === area);
    }
    if (minRating) {
      filteredData = filteredData.filter(res => (res.rating || 0) >= minRating);
    }

    return filteredData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } catch (error) {
    console.error("Error in getRestaurantsByFilters:", error);
    return [];
  }
};

// In your supabase helper file
export const searchRestaurants = async (
  searchTerm: string,
  latitude: number,
  longitude: number,
  radius: number = 10
) => {
  if (!searchTerm.trim()) return [];
  
  try {
    const allRestaurants = await getRestaurants(); // Now using API call
    
    // Search by name locally
    const matchedRestaurants = allRestaurants.filter((res: any) => 
      res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.cuisineType && res.cuisineType.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter by distance
    const pizzaHeartMatch = matchedRestaurants.find((r: any) => r.name?.toLowerCase().includes('pizza heart'));
    if (pizzaHeartMatch) {
      const dist = getDistance(latitude, longitude, pizzaHeartMatch.latitude, pizzaHeartMatch.longitude);
      console.log(`[PizzaHeart Search Debug] Match found by name. Distance to user: ${dist.toFixed(2)} km. Search Radius: ${radius} km.`);
    }

    const filteredData = matchedRestaurants.filter((restaurant: any) => {
      if (!restaurant.latitude || !restaurant.longitude) return false;
      return getDistance(latitude, longitude, restaurant.latitude, restaurant.longitude) <= radius;
    });
    return filteredData;
  } catch (error) {
    console.error("Error in searchRestaurants:", error);
    return [];
  }
};

/**
 * Search menu items by label and filter by their restaurant's location.
 * @param searchTerm The text to search for.
 * @param latitude User's latitude.
 * @param longitude User's longitude.
 * @param radius Radius in km (default: 10 km).
 * @returns Array of nearby menu items.
 */
export const searchMenuItems = async (
  searchTerm: string,
  latitude: number,
  longitude: number,
  radius: number = 10
) => {
  if (!searchTerm.trim()) return [];
  
  try {
    const allRestaurants = await getRestaurants(); // Now using API call
    const results: any[] = [];
    
    allRestaurants.forEach((restaurant: any) => {
      // Check distance first
      if (!restaurant.latitude || !restaurant.longitude) return;
      const distance = getDistance(latitude, longitude, restaurant.latitude, restaurant.longitude);
      if (distance > radius) return;
      
      // Search in menuItems or MenuItem
      const items = restaurant.menuItems || restaurant.MenuItem || [];
      if (items && Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item && item.label && (
            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (restaurant.cuisineType && restaurant.cuisineType.toLowerCase().includes(searchTerm.toLowerCase()))
          )) {
            results.push({
              ...item,
              Restaurant: restaurant // Include parent restaurant info
            });
          }
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error("Error in searchMenuItems:", error);
    return [];
  }
};

// Add this helper function to your Supabase utilities
export const getNearbyRestaurants = async (
  userLat: number,
  userLon: number,
  radius: number
): Promise<Restaurant[]> => {
  try {
    const allRestaurants = await getRestaurants(); // Now using API call
    
    const filteredData = allRestaurants.filter((restaurant: any) => {
      if (!restaurant.latitude || !restaurant.longitude) return false;
      return getDistance(userLat, userLon, restaurant.latitude, restaurant.longitude) <= radius;
    });
    return filteredData as Restaurant[];
  } catch (error) {
    console.error("Error in getNearbyRestaurants:", error);
    return [];
  }
};

import { getRestaurantsFromAPI, getRestaurantByIdFromAPI, getMenuItemAddonsFromAPI } from "./api";

// ... existing code ...

/**
 * Get addons for a menu item
 * REFACTORED (Hybrid): Now uses the Vercel structure + direct Supabase Options merger.
 */
export const getMenuItemAddons = async (menuItemId: string, restaurantId: string): Promise<AddonGroup[]> => {
  try {

    return await getMenuItemAddonsFromAPI(restaurantId, menuItemId);
  } catch (error) {
    console.error('Error in getMenuItemAddons wrapper:', error);
    return [];
  }
};

/**
 * Fetches unique store categories (store types) from the database.
 */
export const getStoreCategories = async () => {
  try {
    const restaurants = await getRestaurants();
    const uniqueTypes = Array.from(new Set(restaurants.map(r => r.storeType))).filter(Boolean);
    
    // Define a mapping for store type labels and icons
    const typeMapping: Record<string, { label: string, icon: string, fallback: string }> = {
      'RESTAURANT': { label: 'Restaurants', icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046747.png', fallback: 'fast-food-outline' },
      'GROCERY': { label: 'Groceries', icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', fallback: 'cart-outline' },
      'PHARMACY': { label: 'Pharmacy', icon: 'https://cdn-icons-png.flaticon.com/512/3028/3028573.png', fallback: 'medical-outline' },
      'FLOWERS': { label: 'Flowers', icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081958.png', fallback: 'rose-outline' },
      'PATISSERIE': { label: 'Patisserie', icon: 'https://cdn-icons-png.flaticon.com/512/3014/3014451.png', fallback: 'ice-cream-outline' },
      'ADULTS_ONLY': { label: 'Adults Only', icon: 'https://cdn-icons-png.flaticon.com/512/3028/3028573.png', fallback: 'wine-outline' },
    };

    return uniqueTypes.map(type => {
      const mapping = typeMapping[type] || { 
        label: type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' '),
        icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046747.png', 
        fallback: 'apps-outline'
      };
      return {
        id: `type-${type.toLowerCase()}`,
        label: mapping.label,
        icon: mapping.icon,
        fallbackIcon: mapping.fallback,
        type: type
      };
    });
  } catch (error) {
    console.error("Error fetching store categories:", error);
    return [];
  }
};

/**
 * Fetches popular food item categories across all restaurants.
 * Returns the top categories with the most menu items.
 * Uses the image of the first item in the category if no category image exists.
 */
export const getPopularFoodCategories = async (userLat?: number, userLon?: number, limit: number = 10) => {
  try {
    console.log(`[getPopularFoodCategories] Fetching via MenuItem.category field. Location: ${userLat}, ${userLon}`);
    
    // 1. Fetch MenuItems with their parent Restaurant info
    const { data: items, error } = await supabase
      .from("MenuItem")
      .select(`
        id,
        category,
        image,
        isAvailable,
        restaurantId,
        Restaurant (
          latitude,
          longitude,
          isActive,
          storeType
        )
      `)
      .eq('isAvailable', true);

    if (error) {
      console.error('[getPopularFoodCategories] Supabase Error:', error);
      throw error;
    }
    
    if (!items || items.length === 0) {
      console.warn('[getPopularFoodCategories] No available MenuItems found.');
      return [];
    }

    const categoryMap = new Map<string, { 
      count: number; 
      itemCount: number; 
      image: string; 
      restaurantIds: Set<string>;
      totalRating: number;
    }>();

    items.forEach((item: any) => {
      const restaurant = item.Restaurant;
      
      // Filter by Restaurant status and type (Allow Restaurants, Bakeries, and general Food stores)
      const allowedTypes = ['RESTAURANT', 'BAKERY', 'GENERAL'];
      if (!restaurant || !restaurant.isActive || !allowedTypes.includes(restaurant.storeType)) return;

      // 2. Filter by distance (50km radius) if user location is provided
      if (userLat !== undefined && userLon !== undefined) {
        if (!restaurant.latitude || !restaurant.longitude) return;
        const distance = getDistance(userLat, userLon, restaurant.latitude, restaurant.longitude);
        if (distance > 50) return; // Skip if outside 50km
      }

      const catName = item.category?.trim();
      if (!catName) return;

      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, { 
          count: 0, 
          itemCount: 0, 
          image: item.image || '', 
          restaurantIds: new Set(),
          totalRating: 0
        });
      }

      const data = categoryMap.get(catName)!;
      data.itemCount += 1; 
      if (!data.restaurantIds.has(item.restaurantId)) {
        data.restaurantIds.add(item.restaurantId);
        data.totalRating += (restaurant.rating || 0);
      }
      
      // Use the first available item image as the category image if none set
      if (!data.image && item.image) {
        data.image = item.image;
      }
    });

    const finalCategories = Array.from(categoryMap.entries())
      .map(([name, data]) => {
        const avgRating = data.restaurantIds.size > 0 ? data.totalRating / data.restaurantIds.size : 0;
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          image: data.image || 'https://via.placeholder.com/150',
          count: data.restaurantIds.size,
          avgRating: avgRating
        };
      })
      .filter(cat => cat.count > 0)
      .sort((a, b) => {
        // Sort by restaurant count first, then by average rating
        if (b.count !== a.count) return b.count - a.count;
        return b.avgRating - a.avgRating;
      }) 
      .slice(0, limit);

    console.log(`[getPopularFoodCategories] Successfully processed ${finalCategories.length} categories sorted by popularity and quality.`);
    return finalCategories;
  } catch (error) {
    console.error('[getPopularFoodCategories] Fatal Error:', error);
    return [];
  }
}

/**
 * Aggregates unique cuisine types from active restaurants and picks a representative cover image.
 */
export async function getCuisineCategories(limit: number = 8): Promise<any[]> {
  try {
    const { data: restaurants, error } = await supabase
      .from('Restaurant')
      .select('cuisineType, coverImage, isActive, storeType')
      .eq('isActive', true)
      .in('storeType', ['RESTAURANT', 'BAKERY', 'GENERAL']);

    if (error) throw error;
    if (!restaurants) return [];

    const cuisineMap = new Map<string, { image: string; count: number; displayName: string }>();

    restaurants.forEach(res => {
      if (!res.cuisineType) return;
      
      const cuisines = res.cuisineType.split(',').map((c: string) => c.trim());
      cuisines.forEach((c: string) => {
        if (!c) return;
        const normalized = c.toLowerCase();
        if (!cuisineMap.has(normalized)) {
          cuisineMap.set(normalized, { image: res.coverImage || '', count: 1, displayName: c });
        } else {
          const existing = cuisineMap.get(normalized)!;
          cuisineMap.set(normalized, { 
            image: existing.image || res.coverImage || '', 
            count: existing.count + 1,
            displayName: existing.displayName // Keep the first casing encountered or handle as desired
          });
        }
      });
    });

    return Array.from(cuisineMap.entries())
      .map(([normalized, data]) => ({
        id: `cuisine-${normalized.replace(/\s+/g, '-')}`,
        name: data.displayName,
        image: data.image || 'https://via.placeholder.com/150',
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[getCuisineCategories] Error:', error);
    return [];
  }
};
