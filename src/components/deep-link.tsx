import {FC} from 'react';
import {Alert, Button, Linking} from 'react-native';

async function concordiumDeepLinkHandle() {
  try {
    await Linking.openURL('concordium://');
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert(error.message);
    }
  }
}

export const DeepLink: FC = () => {
  return (
    <Button title={'go to concordium'} onPress={concordiumDeepLinkHandle} />
  );
};
