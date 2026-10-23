import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

const WEBSITE_URL = Constants.expoConfig?.extra?.websiteUrl as
  | string
  | undefined;

// Pages that live on the website (privacy policy) rather than in the app
export const openWebsite = (path: string) => {
  if (!WEBSITE_URL) {
    Alert.alert("Unavailable", "This page isn't available right now.");
    return;
  }
  WebBrowser.openBrowserAsync(`${WEBSITE_URL}${path}`);
};
