
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function Candle() {
  const flicker = useRef(new Animated.Value(0.8)).current;
  useEffect(()=>{
    const loop = () => Animated.sequence([
      Animated.timing(flicker, { toValue: 1, duration: 120, useNativeDriver: true } as any),
      Animated.timing(flicker, { toValue: 0.75, duration: 150, useNativeDriver: true } as any),
      Animated.timing(flicker, { toValue: 0.9, duration: 100, useNativeDriver: true } as any),
    ]).start(loop);
    loop();
  },[]);
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flame,{ opacity: flicker }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ width:16, height:32, alignItems:'center', justifyContent:'flex-end' },
  flame:{ width:8, height:16, borderRadius:8, backgroundColor:'#ffd27d', shadowColor:'#ffd27d', shadowOpacity:0.6, shadowRadius:6 }
});
