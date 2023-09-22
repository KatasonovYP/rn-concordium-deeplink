import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FC, useState} from 'react';

export const Counter: FC = () => {
  const [count, setCount] = useState(0);

  function increment() {
    setCount(state => state + 1);
  }

  function decrement() {
    setCount(state => state - 1);
  }

  return (
    <View style={styles.counter}>
      <Pressable style={styles.button} onPress={decrement}>
        <Text style={styles.textXL}>-</Text>
      </Pressable>

      <Text style={styles.textXL}>{count}</Text>

      <Pressable style={styles.button} onPress={increment}>
        <Text style={styles.textXL}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  counter: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  button: {
    backgroundColor: '#88f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: 100,
    display: 'flex',
    alignItems: 'center',
  },

  textXL: {
    fontSize: 48,
  },
});
