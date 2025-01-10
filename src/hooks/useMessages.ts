'use client';

import { useState } from 'react';
import type { Message } from '@/types/message';

// Temporary dummy implementation while we focus on channel functionality
export function useMessages(channelId: string) {
  const [messages] = useState<Message[]>([]);
  
  return {
    messages,
    isLoading: false,
    error: null,
    sendMessage: async () => {},
    retryMessage: async () => {}
  };
} 