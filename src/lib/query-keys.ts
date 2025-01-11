export const messageKeys = {
  all: ['messages'] as const,
  list: (channelId: string) => [...messageKeys.all, channelId] as const,
  detail: (messageId: string) => [...messageKeys.all, messageId] as const,
} as const; 