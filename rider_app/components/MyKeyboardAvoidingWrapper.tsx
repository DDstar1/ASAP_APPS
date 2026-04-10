import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ViewStyle,
} from "react-native";

export function MyKeyboardAvoidingWrapper({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const [behaviour, setBehaviour] = useState<"padding" | undefined>("padding");

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", () => {
      setBehaviour("padding");
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setBehaviour(undefined);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? behaviour : undefined}
      style={{
        flex: 1,
        justifyContent: "flex-end",
        ...style,
      }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
