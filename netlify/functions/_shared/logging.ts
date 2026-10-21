// Netlify Functions - Structured Logging
// Privacy-conscious logging with correlation IDs

export interface LogContext {
    correlationId: string;
    functionName: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
}

function formatLog(level: string, message: string, context: LogContext): string {
    const { correlationId, functionName, userId, ip, userAgent, ...rest } = context;
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        correlationId,
        function: functionName,
        userId: userId ? 'present' : undefined, // Don't log actual user ID
        ip: ip ? 'present' : undefined, // Don't log actual IP
        ...rest,
    };
    return JSON.stringify(logEntry);
}

export function logInfo(message: string, context: LogContext): void {
    console.log(formatLog('INFO', message, context));
}

export function logWarn(message: string, context: LogContext): void {
    console.warn(formatLog('WARN', message, context));
}

export function logError(message: string, context: LogContext, error?: Error): void {
    console.error(formatLog('ERROR', message, {
        ...context,
        error: error ? { message: error.message, stack: error.stack } : undefined,
    }));
}

export function logDebug(message: string, context: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
        console.debug(formatLog('DEBUG', message, context));
    }
}

// Create a child logger with additional context
export function createChildLogger(baseContext: LogContext, additionalContext: Record<string, unknown>): (message: string, extra?: Record<string, unknown>) => void {
    const mergedContext = { ...baseContext, ...additionalContext };
    return {
        info: (msg: string, extra?: Record<string, unknown>) => logInfo(msg, { ...mergedContext, ...extra }),
        warn: (msg: string, extra?: Record<string, unknown>) => logWarn(msg, { ...mergedContext, ...extra }),
        error: (msg: string, extra?: Record<string, unknown>, err?: Error) => logError(msg, { ...mergedContext, ...extra }, err),
        debug: (msg: string, extra?: Record<string, unknown>) => logDebug(msg, { ...mergedContext, ...extra }),
    };
}