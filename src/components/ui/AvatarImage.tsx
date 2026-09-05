import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, type ImageStyle, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { getImageUrl } from "../../api/client";

type Props = {
  uri?: string | null;
  name?: string;
  size: number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholderColor?: string;
  textColor?: string;
};

function AvatarImageInner({
  uri,
  name,
  size,
  style,
  containerStyle,
  placeholderColor = "#EFF6FF",
  textColor = "#3B5BDB"
}: Props) {
  const resolvedUri = useMemo(() => getImageUrl(uri ?? null), [uri]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUri]);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const borderRadius = size / 2;
  const showImage = !!resolvedUri && !failed;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: placeholderColor,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        },
        containerStyle
      ]}
    >
      <Text
        style={[
          StyleSheet.absoluteFill,
          {
            fontSize: size * 0.38,
            fontWeight: "700",
            color: textColor,
            textAlign: "center",
            lineHeight: size
          }
        ]}
      >
        {initial}
      </Text>
      {showImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[{ width: size, height: size, borderRadius }, style]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={resolvedUri!.split("?")[0]}
          transition={0}
          onError={onError}
        />
      ) : null}
    </View>
  );
}

export const AvatarImage = memo(AvatarImageInner, (prev, next) => {
  return (
    prev.uri === next.uri &&
    prev.name === next.name &&
    prev.size === next.size &&
    prev.placeholderColor === next.placeholderColor
  );
});
