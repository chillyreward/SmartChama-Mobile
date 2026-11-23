import { useFonts } from 'expo-font';
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

// Custom fonts ignore fontWeight on Android, so each weight is its own family.
export const fonts = {
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  body: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export function useAppFonts() {
  return useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
}
