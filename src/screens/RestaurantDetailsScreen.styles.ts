import { StyleSheet, Dimensions } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';

const screenWidth = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fixedTopSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
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
    zIndex: 110,
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
    marginTop: 12,
    marginBottom: 10,
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
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  productCardPlaceholder: {
    width: '46%',
    backgroundColor: 'transparent',
  },
  productCardImageBg: {
    width: '100%',
    height: 130,
    backgroundColor: '#F2F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    position: 'relative',
    borderRadius: 0,
    marginTop: 0,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  productCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  productCardDetails: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  productCardTitle: {
    fontSize: 13,
    lineHeight: 16,
    minHeight: 20,
    fontWeight: '500',
    color: '#292828ff',
    marginBottom: 2,
  },
  productCardDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 2,
  },
  productCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    gap: 8,
  },
  productCardPriceGroup: {
    flex: 1,
  },
  productCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5C00',
    marginBottom: 2,
  },
  productCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  productCardRestaurant: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    maxWidth: '100%',
  },
  productCardRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  productCardRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  productCardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  productCardTimeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  productCardAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
