'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from './use-local-storage';

interface ChannelNavigationState {
  currentChannel: string | null;
  previousChannel: string | null;
  navigationStack: string[];
  pushChannel: (channelId: string) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const NAVIGATION_STORAGE_KEY = 'channel_navigation';
const MAX_HISTORY_SIZE = 10;

interface StoredNavigation {
  stack: string[];
  currentIndex: number;
}

export function useChannelNavigation(): ChannelNavigationState {
  const router = useRouter();
  const [{ stack, currentIndex }, setNavigation] = useLocalStorage<StoredNavigation>(NAVIGATION_STORAGE_KEY, {
    stack: [],
    currentIndex: -1
  });

  const currentChannel = stack[currentIndex] || null;
  const previousChannel = currentIndex > 0 ? stack[currentIndex - 1] : null;
  const canGoBack = currentIndex > 0;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '[') {
        e.preventDefault();
        if (canGoBack) goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack]);

  const pushChannel = useCallback((channelId: string) => {
    setNavigation(prev => {
      const newStack = [...prev.stack.slice(0, prev.currentIndex + 1), channelId];
      
      // Limit stack size
      if (newStack.length > MAX_HISTORY_SIZE) {
        newStack.shift();
      }

      return {
        stack: newStack,
        currentIndex: newStack.length - 1
      };
    });

    router.push(`/channels/${channelId}`);
  }, [router, setNavigation]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;

    setNavigation(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1
    }));

    const prevChannel = stack[currentIndex - 1];
    if (prevChannel) {
      router.push(`/channels/${prevChannel}`);
    }
  }, [canGoBack, currentIndex, router, stack]);

  return {
    currentChannel,
    previousChannel,
    navigationStack: stack,
    pushChannel,
    goBack,
    canGoBack
  };
} 