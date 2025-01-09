type LogDetails = Record<string, any>;

export const socketLogger = {
  connect: (id: string) => 
    console.log('✨ [SOCKET] Connected! ID:', id),
  
  error: (error: Error, details?: LogDetails) => {
    console.error('❌ [SOCKET] Connection error:', error.message);
    if (details) {
      Object.entries(details).forEach(([key, value]) => 
        console.error(`🔍 [SOCKET] ${key}:`, value)
      );
    }
  },
  
  disconnect: (reason: string) => 
    console.log('💔 [SOCKET] Disconnected:', reason),
  
  auth: {
    waiting: () => console.log('⏳ [SOCKET] Waiting for auth...'),
    ready: (userId: string) => console.log('🔑 [SOCKET] Auth ready, initializing socket with userId:', userId),
    noToken: () => console.log('❌ [SOCKET] No token available'),
    error: (error: Error) => console.error('❌ [SOCKET] Auth error:', error.message)
  },
  
  debug: (message: string, ...args: any[]) => 
    console.log(`🔧 [SOCKET] ${message}`, ...args)
}; 