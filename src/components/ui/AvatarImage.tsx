import React, { memo, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  type ImageStyle,
  type ViewStyle
} from "react-native";
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
  const [loaded, setLoaded] = useState(() => !resolvedUri);
  const [failed, setFailed] = useState(false);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setLoaded(true);
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
      {!showImage ? (
        <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: textColor }}>{initial}</Text>
      ) : (
        <>
          {!loaded ? (
            <Text
              style={[
                StyleSheet.absoluteFillObject,
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
          ) : null}
          <Image
            source={{ uri: resolvedUri! }}
            style={[
              { width: size, height: size, borderRadius, opacity: loaded ? 1 : 0 },
              style
            ]}
            onLoad={onLoad}
            onError={onError}
            fadeDuration={0}
          />
        </>
      )}
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
