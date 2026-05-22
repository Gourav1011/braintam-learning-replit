import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const prevOnline = useRef(true);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleState = (online: boolean) => {
      const wasOnline = prevOnline.current;
      prevOnline.current = online;
      setIsOnline(online);

      if (!wasOnline && online) {
        if (resetTimer.current) clearTimeout(resetTimer.current);
        setJustCameOnline(true);
        resetTimer.current = setTimeout(() => {
          setJustCameOnline(false);
          resetTimer.current = null;
        }, 2000);
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      handleState(state.isConnected !== false && state.isInternetReachable !== false);
    });

    NetInfo.fetch().then((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      prevOnline.current = online;
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  return { isOnline, justCameOnline };
}
