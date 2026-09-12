import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

type ReplyLike = { status: (statusCode: number) => { send: (body: unknown) => void } };

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ReplyLike>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as Record<string, unknown>).message)
            ? ((body as { message: string[] }).message.join(', '))
            : (body as { message?: string }).message ?? exception.message;

      response.status(status).send({ statusCode: status, message, ...(typeof body === 'object' && body !== null ? { error: (body as { error?: string }).error } : {}) });
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}