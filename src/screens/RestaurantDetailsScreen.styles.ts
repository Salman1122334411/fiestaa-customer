import { StyleSheet, Dimensions } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';

const screenWidth = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Top Banner Slider Styles
  bannerSliderContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  bannerSlider: {
    width: '100%',
    height: '100%',
  },
  bannerSlideImage: {
    width: screenWidth,
    height: 220,
  },
  floatingBackButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerDotsContainer: {
    position: 'absolute',
    bottom: 7,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 12,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  bannerDotActive: {
    backgroundColor: '#FF5C00',
  },

  // Repositioned Information Styles (Premium overlapping details card)
  detailsContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20, // Clean overlap style
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  detailsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsRowIcon: {
    marginRight: 0,
  },
  detailsRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  detailsRestaurantName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  detailsRestaurantDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },

  // Product Grid Items
  productRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productCardPlaceholder: {
    width: '48%',
    backgroundColor: 'transparent',
  },
  productCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F9FAFB',
  },
  productCardDetails: {
    padding:12
  },
  productCardTitle: {
    fontSize: 14,
    width:120,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  productCardDescription: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    height: 14,
    marginBottom: 2,
  },
  productCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5C00',
  },
  productCardAddButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5C00',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  viewCartButton: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  cartTotal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noItemsContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },

  // Premium Category Slider Styles
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 6,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#FF5C00',
  },
  categoryPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  categoryPillTextInactive: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 14,
  },
});
