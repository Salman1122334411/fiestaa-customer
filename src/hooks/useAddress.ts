import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import cuid from 'cuid'; // Import the cuid package

interface Address {
  id: string;
  userId: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressState {
  addresses: Address[];
  loading: boolean;
  selectedDeliveryAddressId: string | null;
  selectedAddress: Address | null; // Added this
  setSelectedDeliveryAddress: (id: string) => void;
  fetchAddresses: () => Promise<void>;
  addAddress: (newAddress: Partial<Address>) => Promise<void>;
  updateAddress: (addressId: string, updatedAddress: Partial<Address>) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
}

export const useAddress = create<AddressState>((set, get) => ({
  addresses: [],
  loading: true,
  selectedDeliveryAddressId: null,
  selectedAddress: null,
  setSelectedDeliveryAddress: (id) => set((state) => ({
    selectedDeliveryAddressId: id,
    selectedAddress: state.addresses.find(a => a.id === id) || null
  })),
  fetchAddresses: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('Address')
        .select('id, userId, label, streetAddress, city, state, zipCode, phoneNumber, latitude, longitude, isDefault, createdAt, updatedAt')
        .eq('userId', user.id)
        .order('isDefault', { ascending: false });


      if (error) throw error;

      const addresses = data || [];
      // Find the default address to set as initially selected
      const defaultAddr = addresses.find(a => a.isDefault);

      set({
        addresses: addresses,
        // If there's a default address, select it. Otherwise select the first one if available.
        selectedDeliveryAddressId: defaultAddr ? defaultAddr.id : (addresses.length > 0 ? addresses[0].id : null),
        selectedAddress: defaultAddr || (addresses.length > 0 ? addresses[0] : null)
      });
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      set({ loading: false });
    }
  },
  addAddress: async (newAddress) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Generate a cuid if not provided in newAddress
      const generatedId = newAddress.id ? newAddress.id : cuid();
      // Remove any existing id property to avoid conflicts
      const { id, ...addressData } = newAddress;
      // Get current timestamp in ISO format
      const currentTimestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('Address')
        .insert([{
          id: generatedId,
          ...addressData,
          userId: user.id,
          updatedAt: currentTimestamp,
          createdAt: currentTimestamp,
        }])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) {
        set((state) => {
          const newAddresses = [...state.addresses, data];
          const shouldSelect = !state.selectedDeliveryAddressId;
          return {
            addresses: newAddresses,
            selectedDeliveryAddressId: shouldSelect ? data.id : state.selectedDeliveryAddressId,
            selectedAddress: shouldSelect ? data : state.selectedAddress,
          };
        });
      } else {
        // Fallback: Fetch all addresses to ensure sync if data was not returned
        await get().fetchAddresses();
      }
    } catch (error) {
      console.error('Error adding address:', error);
    }
  },
  updateAddress: async (addressId, updatedAddress) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const currentTimestamp = new Date().toISOString();

      // If isDefault is true in the update, we need to unset other defaults first
      if (updatedAddress.isDefault) {
        await supabase.from('Address')
          .update({ isDefault: false, updatedAt: currentTimestamp })
          .eq('userId', user.id);
      }

      const { data, error } = await supabase
        .from('Address')
        .update({
          ...updatedAddress,
          updatedAt: currentTimestamp,
        })
        .eq('id', addressId)
        .eq('userId', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Optimistically update the local state to reflect changes immediately
      set((state) => {
        const newAddresses = state.addresses.map((address) => {
          if (address.id === addressId) {
            return data || { ...address, ...updatedAddress };
          }
          if (updatedAddress.isDefault) {
            return { ...address, isDefault: false };
          }
          return address;
        });
        
        return {
          addresses: newAddresses,
          selectedAddress: newAddresses.find(a => a.id === state.selectedDeliveryAddressId) || null
        };
      });

      // Re-fetch to ensure consistency (optional but safer)
      await useAddress.getState().fetchAddresses();

    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  },
  setDefaultAddress: async (addressId) => {
    // Re-use the updateAddress logic to ensure dry code
    await useAddress.getState().updateAddress(addressId, { isDefault: true });
  },
  deleteAddress: async (addressId) => {
    try {
      const { error } = await supabase.from('Address').delete().eq('id', addressId);

      if (error) throw error;

      set((state) => {
        const newAddresses = state.addresses.filter((address) => address.id !== addressId);
        const newSelectedId = state.selectedDeliveryAddressId === addressId ? (newAddresses.length > 0 ? newAddresses[0].id : null) : state.selectedDeliveryAddressId;
        
        return {
          addresses: newAddresses,
          selectedDeliveryAddressId: newSelectedId,
          selectedAddress: newAddresses.find(a => a.id === newSelectedId) || null
        };
      });
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  },
}));
