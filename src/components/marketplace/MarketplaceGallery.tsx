import React, { useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Text,
  type LayoutChangeEvent
} from "react-native";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  urls: string[];
  height?: number;
};

function MarketplaceGalleryInner({ urls, height }: Props) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const width = pageWidth > 0 ? pageWidth : windowWidth;
  const h = height ?? Math.min(width * 0.85, 420);
  const cleaned = useMemo(
    () => urls.map((u) => getImageUrl(u)).filter(Boolean) as string[],
    [urls]
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setPageWidth((prev) => (prev === w ? prev : w));
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / width);
      if (i !== index && i >= 0 && i < cleaned.length) setIndex(i);
    },
    [cleaned.length, index, width]
  );

  if (cleaned.length === 0) return null;

  if (cleaned.length === 1) {
    return (
      <View
        onLayout={onLayout}
        style={[styles.wrap, { height: h, backgroundColor: colors.surfaceElevated }]}
      >
        <Image source={{ uri: cleaned[0] }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      onLayout={onLayout}
      style={[styles.wrap, { height: h, backgroundColor: colors.surfaceElevated }]}
    >
      {width > 0 ? (
        <FlatList
          data={cleaned}
          horizontal
          pagingEnabled
          bounces={false}
          nestedScrollEnabled
          directionalLockEnabled
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: h }} resizeMode="cover" />
          )}
        />
      ) : null}
      <View style={styles.dots} pointerEvents="none">
        {cleaned.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.45)" }
            ]}
          />
        ))}
      </View>
      <View style={styles.counter} pointerEvents="none">
        <Text style={styles.counterText}>
          {index + 1}/{cleaned.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  counterText: { color: "#fff", fontSize: 12, fontWeight: "600" }
});

export const MarketplaceGallery = memo(MarketplaceGalleryInner);
