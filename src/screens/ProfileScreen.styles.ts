import { StyleSheet } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF7ED',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#222627',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  email: {
    fontSize: 15,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 13,
    color: '#4B5563',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Reduced from 16
  },
  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#222627',
    letterSpacing: -0.5,
    marginRight: 12,
  },
  addButton: {
    padding: 8,
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff', // White
    borderRadius: 24, // Premium 24px radius
    marginBottom: 16, // Standard gap
    elevation: 0,
    borderWidth: 1,
    borderColor: '#EEE7D6',
  },
  addressInfo: {
    flex: 1,
    marginRight: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
  },
  addressSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  addressAction: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  deleteAction: {
    marginLeft: 0,
  },
  actionText: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 14,
    fontWeight: '500',
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.primary,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    marginHorizontal: '5%',
    width: '90%',
    height: 48,
    borderRadius: 50,
    marginTop: 32,
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  editForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  editFormTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputError: {
    borderColor: BrandColors.primary,
  },
  errorText: {
    color: BrandColors.primary,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  editButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editFormButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  updateButton: {
    backgroundColor: BrandColors.primary,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  editFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  // Checkbox Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  checkedLabel: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  defaultButton: {
    backgroundColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 4,
  },
  defaultButtonText: {
    color: '#374151',
  },
  selectedAddressCard: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    borderWidth: 1,
  },
  selectedBadge: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedAddressText: {
    color: '#FFF',
  },
  defaultBadge: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  selectedDefaultBadge: {
    color: '#FFF',
    borderColor: '#FFF',
    borderWidth: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#EEE7D6',
    elevation: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  languageOptionSelected: {
    backgroundColor: '#FFF1EE',
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  languageOptionText: {
    fontSize: 15,
    color: '#4B5563',
  },
  languageOptionTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
