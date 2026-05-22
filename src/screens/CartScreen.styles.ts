import { StyleSheet, Platform } from "react-native";
import { Colors as BrandColors } from "../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED", // Match header peach color
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  activeOrdersLabel: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  activeOrdersCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  clearCartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  clearCartText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Premium Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 30, // Large premium radius
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEE7D6',
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#222627",
    letterSpacing: -1,
  },
  itemCountText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 0,
  },
  subtotalContainer: {
    alignItems: "flex-end",
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3D1C12",
  },
  subtotalLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    textAlign: "right",
  },

  // Compact List for Summary Card
  compactList: {
    alignSelf: 'stretch',
    marginBottom: 20,
    gap: 12,
  },
  compactItem: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactItemImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  compactItemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  compactItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 4,
  },

  // Actions
  primaryButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 50,
    height: 48,
    width: '100%',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    height: 48,
    width: '90%',
    alignSelf: 'center',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
  },
  secondaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },

  // Promotional "Hungry for more?" Card
  promoCard: {
    marginTop: 10,
    padding: 30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  promoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE7D6',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#222627",
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  promoButton: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
  },
  promoButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Expandable Details (when card is active)
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F9FAFB",
  },
  detailItemLeft: {
    flex: 1,
    marginRight: 16,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 12,
  },
  removeButtonText: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailItemName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222627",
    flex: 1,
  },
  detailItemMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  detailItemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  emptyCartContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },
});
