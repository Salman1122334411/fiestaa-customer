import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, AppState } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';
import { requestNotificationPermissions } from '../lib/notifications';
import React, { useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import Preloader from '../components/Preloader';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RestaurantScreen } from '../screens/RestaurantScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { EditProfileScreen } from '../screens/EditUserProfile';
import { OrderDetailsScreen } from '../screens/OrdersDetailScreen';
import { RestaurantDetailsScreen } from '../screens/RestaurantDetailsScreen';
import { EmailConfirmationScreen } from '../screens/EmailConfirmationScreen';
import { AddressScreen } from '../screens/AddressScreen';
import { RestaurantListScreen } from '../screens/RestaurantListScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { OrderInstructionsScreen } from '../screens/OrderInstructionsScreen';
import { PaymentSelectionScreen } from '../screens/PaymentSelectionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Single source of truth for all native screen headers
const SHARED_HEADER_OPTIONS = {
  headerShown: true,
  headerStyle: { backgroundColor: BrandColors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
  headerTitleAlign: 'center' as const,
  headerBackTitleVisible: false,
};

function CartTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const { cartItems } = useCart();
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name={focused ? "cart" : "cart-outline"} size={size} color={color} />
      {itemCount > 0 && (
        <View
          style={{
            position: 'absolute',
            right: -8,
            top: -4,
            backgroundColor: BrandColors.primary,
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// Sub-Stacks to keep bottom bar visible
function HomeStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Restaurant" component={RestaurantDetailsScreen} />
      <Stack.Screen 
        name="Restaurants" 
        component={RestaurantListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersScreen" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen as any} />
    </Stack.Navigator>
  );
}

function CartStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartScreen" component={CartScreen} />
      <Stack.Screen 
        name="CheckoutScreen" 
        component={CheckoutScreen}
        options={{
          ...SHARED_HEADER_OPTIONS,
          title: t('navigation.checkout'),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Stack.Screen 
        name="Addresses" 
        component={AddressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderInstructions" 
        component={OrderInstructionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PaymentSelection" 
        component={PaymentSelectionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function SearchStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchHome" component={SearchScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ ...SHARED_HEADER_OPTIONS, title: t('navigation.edit_profile') }}
      />
      <Stack.Screen 
        name="Addresses" 
        component={AddressScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.primary,
        tabBarInactiveTintColor: BrandColors.gray[500],
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          tabBarLabel: t('tabs.search'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          tabBarLabel: t('tabs.orders'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset the Orders stack to root when tab is tapped
            navigation.navigate('OrdersTab', { screen: 'OrdersScreen' });
          },
        })}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={({ route }) => ({
          tabBarLabel: t('tabs.cart'),
          tabBarIcon: ({ color, size, focused }) => (
            <CartTabIcon color={color} size={size} focused={focused} />
          ),
        })}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  if (loading) {
    return <Preloader fullScreen={true} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
