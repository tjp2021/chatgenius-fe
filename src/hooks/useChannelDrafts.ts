'use client';

import { useState } from 'react';

interface ChannelDraft {
  content: string;
  lastUpdated: string;
}

export function useChannelDrafts() {
  const [drafts, setDrafts] = useState<Record<string, ChannelDraft>>({});

  const saveDraft = (channelId: string, content: string) => {
    setDrafts(prev => ({
      ...prev,
      [channelId]: {
        content,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const getDraft = (channelId: string) => {
    return drafts[channelId]?.content || '';
  };

  const clearDraft = (channelId: string) => {
    setDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[channelId];
      return newDrafts;
    });
  };

  return {
    saveDraft,
    getDraft,
    clearDraft
  };
} 