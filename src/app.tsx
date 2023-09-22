import type {FC} from 'react';
import {Counter} from './components/counter';
import {ThemeWrapper} from './components/theme-wrapper';
import {DeepLink} from './components/deep-link';
import {
  TESTNET,
  WalletConnectionProps,
  WithWalletConnector,
} from './shared/lib/react-native-components';
import {Text, View} from 'react-native';

interface MainProps {
  walletConnectionProps: WalletConnectionProps;
}

const Main: FC<MainProps> = ({walletConnectionProps}) => {
  // const {
  //   activeConnectorType,
  //   activeConnector,
  //   activeConnectorError,
  //   connectedAccounts,
  //   genesisHashes,
  // } = walletConnectionProps;
  // const {connection, setConnection, account} = useConnection(
  //   connectedAccounts,
  //   genesisHashes,
  // );
  // console.log(connection, setConnection, account);
  console.log(walletConnectionProps);
  return (
    <ThemeWrapper>
      <Counter />
      <DeepLink />
    </ThemeWrapper>
  );
};

// const AppDefault: FC = () => {
//   return (
//     <ThemeWrapper>
//       <Counter />
//       <DeepLink />
//     </ThemeWrapper>
//   );
// };

const App: FC = () => {
  return (
    <WithWalletConnector network={TESTNET}>
      {props => <Main walletConnectionProps={props} />}
    </WithWalletConnector>
  );
};

export default App;
