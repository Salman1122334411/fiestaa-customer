import { StyleSheet, Dimensions } from "react-native";
import { Colors as BrandColors } from "../constants/Colors";

const { width } = Dimensions.get("window");

export const searchBarStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  searchIcon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 4,
    fontSize: 15,
    color: "#111827",
  },
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 0,
    overflow: "visible",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingHorizontal: 20, // Standardized side padding
    paddingTop: 14,
  },
  loadingContainer: {
    minHeight: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  restaurantIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: 'hidden', // Ensure image respects border radius
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: '#FFF5F0', // Light peach
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: BrandColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  orderDate: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
  addressText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
  paymentText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
  dashedDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 16,
  },
  orderItemsSection: {
    marginBottom: 12,
  },
  orderItemsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  orderItemContainer: {
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderItemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  orderItemQuantity: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginRight: 8,
  },
  orderItemName: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.primary,
  },
  totalAmountContainer: {
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: "#6B7280",
  },
  totalAmountRightContent: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 0,
  },
  deliveryIncludedText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: '500',
    marginTop: 2,
  },
  reorderButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  reorderButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },
  browseButton: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    backgroundColor: BrandColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  updateButton: {
    backgroundColor: BrandColors.primary,
    height: 48,
    width: '90%',
    alignSelf: 'center',
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
});
