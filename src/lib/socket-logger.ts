type LogDetails = Record<string, any>;

export const socketLogger = {
  connect: (id: string | undefined) => {
    if (!id) {
      console.log('✨ [SOCKET] Connected without ID');
      return;
    }
    console.log('✨ [SOCKET] Connected! ID:', id);
  },
  
  error: (error: Error, details?: LogDetails) => {
    console.error('❌ [SOCKET] Error:', error.message);
    if (details) {
      Object.entries(details).forEach(([key, value]) => 
        console.error(`🔍 [SOCKET] ${key}:`, value)
      );
    }
  },
  
  disconnect: (reason: string) => 
    console.log('💔 [SOCKET] Disconnected:', reason),
  
  debug: (message: string, ...args: any[]) => 
    console.log(`🔧 [SOCKET] ${message}`, ...args),
  
  warn: (message: string, ...args: any[]) => 
    console.warn(`⚠️ [SOCKET] ${message}`, ...args),
  
  info: (message: string, ...args: any[]) => 
    console.info(`ℹ️ [SOCKET] ${message}`, ...args)
}; 