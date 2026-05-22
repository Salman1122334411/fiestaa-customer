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
  instructionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 20,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: TEXT_DARK,
    height: 150,
    textAlignVertical: 'top',
    backgroundColor: '#FAFBFD',
  },
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
