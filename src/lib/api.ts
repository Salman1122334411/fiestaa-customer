import axios from 'axios';
import { supabase } from './supabaseClient';

const BASE_URL = 'https://fiestafood.vercel.app';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Diagnostic Interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Success] ${response.config.url} - Status: ${response.status}, Data Count: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.url} - Status: ${error.response?.status}, Message: ${error.message}`);
    return Promise.reject(error);
  }
);

/**
 * Fetches menu items for a restaurant, including all addon groups and options.
 * This utilizes the Prisma-powered Next.js API to bypass Supabase RLS restrictions.
 */
export const getRestaurantMenuItems = async (restaurantId: string) => {
  try {
    const response = await api.get(`/api/restaurants/${restaurantId}/menu-items`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error fetching menu items:', error.response?.data || error.message);
    } else {
      console.error('Unexpected error fetching menu items:', error);
    }
    throw error;
  }
};

/**
 * Fetches specific addons for a menu item.
 * STRATEGY: API-Direct (Bypass DB for maximum parity and speed)
 */
export const getMenuItemAddonsFromAPI = async (restaurantId: string, menuItemId: string) => {
  try {
    console.log(`[Hydration] Fetching Addons DIRECT from VERCEL API for Item ${menuItemId}...`);

    const items = await getRestaurantMenuItems(restaurantId);
    
    if (items && items.length > 0) {
      const item = items.find((m: any) => String(m.id) === String(menuItemId));
      if (item && item.addonGroups && item.addonGroups.length > 0) {
        console.log(`[Hydration] Options Source: VERCEL API (Found ${item.addonGroups.length} groups)`);
        
        return item.addonGroups.map((ag: any) => {
          const groupDetails = ag.addonGroup || ag;
          const options = groupDetails.options || ag.options || [];
          
          return {
            ...groupDetails,
            options: options.map((opt: any) => ({
              ...opt,
              name: opt.name || opt.label,
              priceAdjustment: Number(opt.priceAdjustment) || 0
            }))
          };
        });
      }
    }

    console.log(`[Hydration] No addon data found in API for Item ${menuItemId}`);
    return [];

  } catch (error) {
    console.error('Critical error in API-Direct Hydration:', error);
    return [];
  }
};

/**
 * Fetches all restaurants from the Vercel Web API.
 */
export const getRestaurantsFromAPI = async () => {
  try {
    const response = await api.get('/api/restaurants');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error fetching restaurants:', error.response?.data || error.message);
    } else {
      console.error('Unexpected error fetching restaurants:', error);
    }
    throw error;
  }
};

/**
 * Fetches a single restaurant by its ID from the Vercel Web API.
 */
export const getRestaurantByIdFromAPI = async (id: string) => {
  try {
    const response = await api.get(`/api/restaurants/${id}`);
    return response.data.restaurant;
  } catch (error) {
    console.error(`API Error fetching restaurant ${id}, attempting fallback to Supabase:`, error);
    
    // Fallback to direct Supabase for maximum data parity (especially for scheduling fields)
    const { data, error: sbError } = await supabase
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
        isActive, 
        acceptsScheduledOrders, 
        deliverySlotDuration, 
        preparationTime, 
        closedDate, 
        DeliverySlot (id, dayOfWeek, startTime, endTime),
        ProductCategory (id, name, image)
      `)
      .eq('id', id)
      .single();

      
    if (sbError) {
      console.error(`Supabase fallback error for restaurant ${id}:`, sbError.message);
      return null;
    }
    
    return data;
  }
};
/**
 * Retrieves delivery slots for a restaurant on a specific date.
 * Using hardcoded slots as requested, bypassing the backend API (which is currently returning 500).
 */
export const getDeliverySlots = async (restaurantId: string, date: Date) => {
  try {
    console.log(`[API] Fetching real delivery slots for ${restaurantId} on ${date.toISOString().split('T')[0]}`);
    
    // 1. Fetch restaurant details to get its specific DeliverySlot configuration
    const restaurant = await getRestaurantByIdFromAPI(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const slots: any[] = [];
    const isToday = date.toDateString() === new Date().toDateString();
    const now = new Date();
    const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)

    // 2. Filter restaurant delivery slots for the selected day of week
    // The DB might use 1-7 or 0-6. Standard Prisma/JS is 0-6.
    const restaurantSlots = (restaurant.DeliverySlot || restaurant.delivery_slots || [])
      .filter((s: any) => (s.dayOfWeek ?? s.day_of_week) === dayOfWeek);
    const slotDurationMinutes = restaurant.deliverySlotDuration || restaurant.delivery_slot_duration || 60;

    if (restaurantSlots.length === 0) {
      console.log(`[API] No delivery slots configured for day ${dayOfWeek} at restaurant ${restaurantId}`);
      return [];
    }

    // 3. Generate individual time blocks based on the duration
    restaurantSlots.forEach((range: any) => {
      const [startH, startM] = (range.startTime || range.start_time || '00:00').split(':').map(Number);
      const [endH, endM] = (range.endTime || range.end_time || '23:59').split(':').map(Number);

      let currentTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      while (currentTotalMinutes + slotDurationMinutes <= endTotalMinutes) {
        const h = Math.floor(currentTotalMinutes / 60);
        const m = currentTotalMinutes % 60;
        
        const nextTotal = currentTotalMinutes + slotDurationMinutes;
        const nextH = Math.floor(nextTotal / 60);
        const nextM = nextTotal % 60;

        const startStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const endStr = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;

        // Availability check: if today, must be in the future (plus a buffer, e.g., 30 mins)
        let isAvailable = true;
        if (isToday) {
          const slotStartTime = new Date(date);
          slotStartTime.setHours(h, m, 0, 0);
          // Add 30 mins buffer from "now"
          if (slotStartTime.getTime() < now.getTime() + 30 * 60000) {
            isAvailable = false;
          }
        }

        slots.push({
          id: `slot-${range.id}-${currentTotalMinutes}`,
          startTime: startStr,
          endTime: endStr,
          isAvailable: isAvailable,
        });

        currentTotalMinutes += slotDurationMinutes;
      }
    });

    return slots;
  } catch (error) {
    console.error(`Error generating delivery slots for ${restaurantId}:`, error);
    return [];
  }
};
/**
 * Fetches order history for a specific user from the Vercel Web API.
 */
export const getUserOrders = async (userId: string, status?: string, limit?: number) => {
  try {
    const response = await api.get('/api/orders', {
      params: { userId, status, limit }
    });
    return response.data;
  } catch (error) {
    console.error('API Error fetching user orders:', error);
    return [];
  }
};

/**
 * Fetches a single order by ID from the Vercel Web API.
 */
export const getOrderById = async (orderId: string) => {
  try {
    const response = await api.get('/api/orders', {
      params: { orderId }
    });
    return response.data;
  } catch (error) {
    console.error(`API Error fetching order ${orderId}:`, error);
    return null;
  }
};

/**
 * Creates a new order via the Vercel Web API.
 * This ensures backend validation (slots, user check) and POS synchronization.
 */
export const createOrder = async (orderData: any) => {
  try {
    const response = await api.post('/api/orders', orderData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverMessage = error.response?.data?.error || error.message;
      console.error('API Error creating order:', serverMessage);
      throw new Error(serverMessage);
    } else {
      console.error('Unexpected error creating order:', error);
      throw error;
    }
  }
};
