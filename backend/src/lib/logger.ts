import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction || isTest
    ? undefined
    : {
        target: require.resolve('pino-pretty'),
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: isTest ? undefined : {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'localhost',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
