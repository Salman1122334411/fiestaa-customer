import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';

const { width } = Dimensions.get('window');

const APP_ORANGE = BrandColors.primary; // '#FC5A23'
const TEXT_DARK = '#333333';
const TEXT_GRAY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const BG_OFFWHITE = '#FAFBFD';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Custom Header
  customHeader: {
    backgroundColor: APP_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // To balance the back button width
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  // Map Container
  mapContainer: {
    height: 160,
    width: '100%',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'column',
    gap: 4,
  },
  zoomButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapPlaceholderCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mapPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Content Scroll
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Section Padding
  sectionPadding: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  // Delivery Time Header
  deliveryTimeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryTimeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginLeft: 8,
  },
  deliveryTimeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  // Timing Toggle Cards
  timingCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  timingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  activeTimingCard: {
    borderColor: TEXT_DARK,
  },
  timingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  timingCardSub: {
    fontSize: 12,
    color: TEXT_DARK,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    backgroundColor: TEXT_DARK,
    borderColor: TEXT_DARK,
  },
  // Info List Rows
  listContainer: {},
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingHorizontal: 20,
  },
  listIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  listSub: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 2,
  },
  thickSeparator: {
    height: 8,
    backgroundColor: '#F9F9F6', // Cream color
    width: '100%',
  },
  // Payment Row Special
  paymentRowContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_DARK,
    flex: 1,
    marginLeft: 16,
  },
  paymentMethodDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentCardIcon: {
    width: 32,
    height: 20,
    backgroundColor: '#1A1F71', // Visa blue
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  paymentCardText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentCardNumber: {
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '500',
    marginRight: 8,
  },
  // Order Summary
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    marginLeft: 12,
  },
  itemsSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  itemsSubHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  exploreItemsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF7F5',
  },
  exploreItemsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  // Item Row
  itemRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 0,
    paddingRight: 4,
  },
  checkoutQuantityPill: {
    marginLeft: 8,
    flexShrink: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_ORANGE,
  },
  // Receipt Breakdown
  receiptContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  receiptDiscountLabel: {
    fontSize: 14,
    color: '#10B981', // Green
    fontWeight: '600',
  },
  receiptDiscountValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  // Floating Action Button
  footer: {
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  placeOrderBtn: {
    backgroundColor: APP_ORANGE,
    borderRadius: 26,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: APP_ORANGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeOrderTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Other / Old (Retained for modals, etc. if needed)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  giftExpandedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitleGift: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  textInputProminent: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 8,
  },
  bottomSpace: {
    height: 0,
  }
});
