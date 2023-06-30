import React, {FC, PropsWithChildren} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';

export const ThemeWrapper: FC<PropsWithChildren> = ({children}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />

      <View style={styles.childrenContainer}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  childrenContainer: {
    height: '100%',
    marginVertical: 'auto',
    marginHorizontal: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'center',
  },
});
