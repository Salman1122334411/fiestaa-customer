import { StyleSheet } from 'react-native';
import { Colors as BrandColors } from '../constants/Colors';

const APP_ORANGE = BrandColors.primary;
const TEXT_DARK = '#333333';
const TEXT_GRAY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';

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
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // To balance back button
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 24,
    lineHeight: 20,
  },
  // Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#FAFBFD',
  },
  activeOptionCard: {
    borderColor: APP_ORANGE,
    backgroundColor: '#FFFFFF',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activeOptionIconContainer: {
    backgroundColor: '#FFF5F0',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  optionSub: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: APP_ORANGE,
    backgroundColor: APP_ORANGE,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  // Footer
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  saveButton: {
    backgroundColor: APP_ORANGE,
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
