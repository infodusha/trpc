import type { BaseContentTypeHandler, HTTPRequest } from '@trpc/server/http';
import { TRPCError } from '@trpc/server/unstable-core-do-not-import';
import type { AnyRouter } from '@trpc/server/unstable-core-do-not-import/router';
import type { CombinedDataTransformer } from '@trpc/server/unstable-core-do-not-import/transformer';
import {
  lambdaEventToHTTPBody,
  type APIGatewayEvent,
  type AWSLambdaOptions,
} from '../../utils';

export interface LambdaHTTPContentTypeHandler<TRequest extends APIGatewayEvent>
  extends BaseContentTypeHandler<
    AWSLambdaOptions<AnyRouter, TRequest> & {
      event: TRequest;
      req: HTTPRequest;
    }
  > {}

export const getLambdaHTTPJSONContentTypeHandler: () => LambdaHTTPContentTypeHandler<APIGatewayEvent> =
  () => ({
    isMatch(opts) {
      return !!opts.event.headers['content-type']?.startsWith(
        'application/json',
      );
    },
    getInputs: async (opts, info) => {
      function getRawProcedureInputOrThrow() {
        const { event, req } = opts;

        try {
          if (req.method === 'GET') {
            const input = req.query.get('input');
            if (!input) {
              return undefined;
            }

            return JSON.parse(input);
          }

          const body = lambdaEventToHTTPBody(opts.event);
          if (typeof body === 'string') {
            // A mutation with no inputs will have req.body === ''
            return body.length === 0 ? undefined : JSON.parse(body);
          }
          return event.body;
        } catch (cause) {
          throw new TRPCError({
            code: 'PARSE_ERROR',
            cause,
          });
        }
      }

      const deserializeInputValue = (
        rawValue: unknown,
        transformer: CombinedDataTransformer,
      ) => {
        return typeof rawValue !== 'undefined'
          ? transformer.input.deserialize(rawValue)
          : rawValue;
      };

      const rawInput = getRawProcedureInputOrThrow();
      const transformer = opts.router._def._config.transformer;

      if (!info.isBatchCall) {
        return deserializeInputValue(rawInput, transformer);
      }

      /* istanbul ignore if  */
      if (
        rawInput == null ||
        typeof rawInput !== 'object' ||
        Array.isArray(rawInput)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '"input" needs to be an object when doing a batch call',
        });
      }

      const rawValue = rawInput[info.batch];

      return deserializeInputValue(rawValue, transformer);
    },
  });
