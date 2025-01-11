'use client';

import { /* useState, */ useCallback, useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';

interface ChannelDraft {
  channelId: string;
  content: string;
  lastUpdated: number;
}

interface UseChannelDrafts {
  getDraft: (channelId: string) => string;
  saveDraft: (channelId: string, content: string) => void;
  clearDraft: (channelId: string) => void;
  hasDraft: (channelId: string) => boolean;
}

const DRAFT_STORAGE_KEY = 'channel_drafts';
const MAX_DRAFT_AGE_DAYS = 7;
const MAX_DRAFT_SIZE = 10000; // 10KB limit

interface DraftActions {
  saveDraft: (channelId: string, content: string) => void;
  getDraft: (channelId: string) => string | null;
  clearDraft: (channelId: string) => void;
}

export function useChannelDrafts(): UseChannelDrafts {
  const [drafts, setDrafts] = useLocalStorage<ChannelDraft[]>(DRAFT_STORAGE_KEY, []);

  // Clean up old drafts on mount
  useEffect(() => {
    const now = Date.now();
    const maxAge = MAX_DRAFT_AGE_DAYS * 24 * 60 * 60 * 1000;
    const validDrafts = drafts.filter(
      (draft: ChannelDraft) => now - draft.lastUpdated < maxAge
    );
    
    if (validDrafts.length !== drafts.length) {
      setDrafts(validDrafts);
    }
  }, [drafts, setDrafts]);

  const getDraft = useCallback((channelId: string): string => {
    const draft = drafts.find((d: ChannelDraft) => d.channelId === channelId);
    return draft?.content || '';
  }, [drafts]);

  const saveDraft = useCallback((channelId: string, content: string) => {
    if (content.length > MAX_DRAFT_SIZE) {
      console.warn('Draft content exceeds size limit');
      content = content.slice(0, MAX_DRAFT_SIZE);
    }

    setDrafts((prev: ChannelDraft[]) => {
      const existing = prev.findIndex((d: ChannelDraft) => d.channelId === channelId);
      const newDraft: ChannelDraft = {
        channelId,
        content,
        lastUpdated: Date.now()
      };

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newDraft;
        return updated;
      }

      return [...prev, newDraft];
    });
  }, [setDrafts]);

  const clearDraft = useCallback((channelId: string) => {
    setDrafts((prev: ChannelDraft[]) => prev.filter((d: ChannelDraft) => d.channelId !== channelId));
  }, [setDrafts]);

  const hasDraft = useCallback((channelId: string): boolean => {
    return drafts.some((d: ChannelDraft) => d.channelId === channelId && d.content.length > 0);
  }, [drafts]);

  return {
    getDraft,
    saveDraft,
    clearDraft,
    hasDraft
  };
} 