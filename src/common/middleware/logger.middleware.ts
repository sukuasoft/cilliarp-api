import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log da requisição
    this.logger.log(
      `📥 ${method} ${originalUrl} - ${ip} - ${userAgent}`,
    );

    // Log de detalhes adicionais se houver body ou query params
    if (Object.keys(req.query).length > 0) {
      this.logger.debug(`Query Params: ${JSON.stringify(req.query)}`);
    }

    if (req.body && Object.keys(req.body).length > 0) {
      // Remove dados sensíveis do log
      const logBody = { ...req.body };
      if (logBody.password) logBody.password = '***';
      if (logBody.token) logBody.token = '***';
      
      this.logger.debug(`Body: ${JSON.stringify(logBody)}`);
    }

    // Interceptar a resposta
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log quando a resposta for enviada
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      
      // Emoji baseado no status code
      let emoji = '✅';
      if (statusCode >= 400 && statusCode < 500) {
        emoji = '⚠️ ';
      } else if (statusCode >= 500) {
        emoji = '❌';
      }

      this.logger.log(
        `📤 ${emoji} ${method} ${originalUrl} - ${statusCode} - ${duration}ms`,
      );

      // Log de erro se status code >= 400
      if (statusCode >= 400 && responseBody) {
        try {
          const errorResponse = typeof responseBody === 'string' 
            ? JSON.parse(responseBody) 
            : responseBody;
          
          this.logger.error(
            `Error Response: ${JSON.stringify(errorResponse)}`,
          );
        } catch (e) {
          this.logger.error(`Error Response: ${responseBody}`);
        }
      }
    });

    next();
  }
}
