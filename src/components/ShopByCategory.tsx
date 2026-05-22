import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors as BrandColors } from '../constants/Colors';
import { getStoreCategoryBackground } from '../constants/StoreCategoryColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getStoreCategories } from '../lib/supabase';

interface ShopByCategoryProps {
  selectedStoreType: string | null;
  onSelectCategory: (category: string | null) => void;
  hideCategories?: boolean;
  onViewAll?: () => void;
  showViewAll?: boolean;
}

// --- Category Design Mapping ---
const getCategoryDesign = (categoryType: string) => {
  const type = (categoryType || '').toLowerCase();
  
  // Default values
  let icon: any = 'storefront-outline';

  // --- Food & Dining ---
  if (type.includes('restaurant') || type === 'restaurant') {
    icon = 'silverware-fork-knife';
  } else if (type.includes('pizza')) {
    icon = 'pizza';
  } else if (type.includes('burger') || type.includes('fast')) {
    icon = 'hamburger';
  } else if (type.includes('sushi') || type.includes('japanese')) {
    icon = 'fish';
  } else if (type.includes('mexican') || type.includes('taco')) {
    icon = 'taco';
  } else if (type.includes('healthy') || type.includes('salad')) {
    icon = 'leaf';
  } else if (type.includes('cafe') || type.includes('coffee')) {
    icon = 'coffee';
  } else if (type.includes('bakery') || type.includes('patisserie') || type === 'patisserie' || type.includes('bread')) {
    icon = 'cupcake';
  } else if (type.includes('dessert') || type.includes('sweet') || type.includes('cake')) {
    icon = 'ice-cream';
  } else if (type.includes('beverage') || type.includes('drink') || type.includes('juice')) {
    icon = 'glass-cocktail';
  }
  
  // --- Shopping & Essentials ---
  else if (type.includes('grocery') || type === 'grocery' || type.includes('market') || type.includes('supermarket')) {
    icon = 'basket';
  } else if (type.includes('pharmacy') || type === 'pharmacy' || type.includes('medical') || type.includes('health')) {
    icon = 'medical-bag';
  } else if (type.includes('flowers') || type === 'flowers') {
    icon = 'flower';
  } else if (type.includes('fashion') || type.includes('clothing') || type.includes('apparel')) {
    icon = 'tshirt-crew';
  } else if (type.includes('adult') || type === 'adults_only' || type.includes('alcohol') || type.includes('liquor')) {
    icon = 'bottle-wine';
  } else if (type.includes('pet') || type.includes('animal')) {
    icon = 'paw';
  } else if (type.includes('electronic') || type.includes('gadget')) {
    icon = 'cellphone-link';
  } else if (type.includes('home') || type.includes('decor')) {
    icon = 'home-variant';
  }

  return { icon };
};

export const ShopByCategory: React.FC<ShopByCategoryProps> = ({
  selectedStoreType,
  onSelectCategory,
  hideCategories = false,
  onViewAll,
  showViewAll = true,
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const PRIMARY = BrandColors.primary;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getStoreCategories();
        setCategories(data);
      } catch (error) {
        console.error("ShopByCategory fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading && !hideCategories) {
    return (
      <View style={[styles.container, { paddingVertical: 20 }]}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.accent} />
          <View>
            <Text style={styles.title}>{t('home.shop_by_category')}</Text>
            <Text style={styles.subtitle}>{t('home.find_favorite_stores')}</Text>
          </View>
        </View>
        {(onViewAll || showViewAll) && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAll}>{t('home.view_all_categories')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hideCategories && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Dynamic Categories */}
          {categories.map((category) => {
            const { icon } = getCategoryDesign(category.type);
            const isActive = selectedStoreType === category.type;

            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => onSelectCategory(category.type)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isActive
                      ? PRIMARY
                      : getStoreCategoryBackground(category.type, false),
                  },
                  isActive && { ...styles.iconContainerActive, shadowColor: PRIMARY },
                ]}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={32}
                    color={isActive ? '#FFFFFF' : PRIMARY}
                  />
                </View>
                <Text style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accent: {
    width: 4,
    height: 20,
    backgroundColor: BrandColors.primary,
    borderRadius: 2,
    marginRight: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  viewAll: {
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 10,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainerActive: {
    elevation: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    borderWidth: 0,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 2,
  },
  categoryLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
});
