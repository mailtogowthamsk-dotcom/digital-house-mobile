import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState
} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
  type NativeSyntheticEvent,
  type NativeScrollEvent
} from "react-native";
import type { MessageItem } from "../../api/messages.api";
import { buildChatListRows, type ChatListRow } from "../../utils/messageDateGroups";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatDateSeparator } from "./ChatDateSeparator";
import { ChatScrollFab } from "./ChatScrollFab";

const MAINTAIN_VISIBLE_POSITION = { minIndexForVisible: 1 };

export type ChatMessageListHandle = {
  scrollToBottom: (animated?: boolean) => void;
  shouldAutoScroll: () => boolean;
};

type Props = {
  messages: MessageItem[];
  meId: number | null;
  bubbleMaxWidth: number;
  fontSize: number;
  horizontalPadding: number;
  otherAvatarUri?: string | null;
  colors: {
    primary: string;
    text: string;
    surfaceElevated: string;
    textMuted: string;
    white: string;
  };
  keyboardVisible?: boolean;
  onAutoScrollChange?: (enabled: boolean) => void;
  onSharedPostPress?: (postId: number) => void;
};

const ChatMessageListInner = forwardRef<ChatMessageListHandle, Props>(function ChatMessageList(
  {
    messages,
    meId,
    bubbleMaxWidth,
    fontSize,
    horizontalPadding,
    otherAvatarUri,
    colors,
    keyboardVisible = false,
    onAutoScrollChange,
    onSharedPostPress
  },
  ref
) {
  const listRef = useRef<FlatList<ChatListRow>>(null);
  const autoScrollRef = useRef(true);
  const [showScrollFab, setShowScrollFab] = useState(false);

  const rows = useMemo(() => buildChatListRows(messages), [messages]);

  const scrollToBottom = useCallback((animated = true) => {
    if (rows.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
      autoScrollRef.current = true;
      setShowScrollFab(false);
      onAutoScrollChange?.(true);
    });
  }, [rows.length, onAutoScrollChange]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      shouldAutoScroll: () => autoScrollRef.current
    }),
    [scrollToBottom]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const nearBottom = distanceFromBottom < 96;
      if (autoScrollRef.current !== nearBottom) {
        autoScrollRef.current = nearBottom;
        onAutoScrollChange?.(nearBottom);
      }
      setShowScrollFab(!nearBottom && messages.length > 0);
    },
    [messages.length, onAutoScrollChange]
  );

  const handleContentSizeChange = useCallback(() => {
    if (autoScrollRef.current) {
      scrollToBottom(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (keyboardVisible && autoScrollRef.current) {
      scrollToBottom(true);
    }
  }, [keyboardVisible, scrollToBottom]);

  const renderItem: ListRenderItem<ChatListRow> = useCallback(
    ({ item }) => {
      if (item.kind === "date") {
        return (
          <ChatDateSeparator
            label={item.label}
            textColor={colors.textMuted}
            pillColor={colors.surfaceElevated}
          />
        );
      }
      const msg = item.message;
      return (
        <ChatMessageBubble
          item={msg}
          mine={meId != null && msg.senderId === meId}
          maxWidth={bubbleMaxWidth}
          fontSize={fontSize}
          colors={colors}
          otherAvatarUri={otherAvatarUri}
          onSharedPostPress={onSharedPostPress}
        />
      );
    },
    [meId, bubbleMaxWidth, fontSize, colors, otherAvatarUri, onSharedPostPress]
  );

  const keyExtractor = useCallback((item: ChatListRow) => item.id, []);

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: 12
          },
          rows.length === 0 && styles.contentEmpty
        ]}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={20}
        maxToRenderPerBatch={14}
        windowSize={9}
        // Older messages merged in above the viewport must not shift what the
        // user is currently reading. Index 0 can be a date separator, so anchor
        // from the first row below it.
        maintainVisibleContentPosition={MAINTAIN_VISIBLE_POSITION}
      />
      <ChatScrollFab
        visible={showScrollFab}
        onPress={() => scrollToBottom(true)}
        primaryColor={colors.primary}
        iconColor={colors.white}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0
  },
  list: {
    flex: 1,
    minHeight: 0
  },
  content: {
    flexGrow: 1,
    paddingBottom: 12
  },
  contentEmpty: {
    flex: 1,
    justifyContent: "flex-end"
  }
});

export const ChatMessageList = memo(ChatMessageListInner);
