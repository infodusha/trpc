import type {
  CreateTRPCClient,
  CreateTRPCClientOptions,
  TRPCLinkDecoration,
} from '@trpc/client';
import { createTRPCClient, getUntypedClient, TRPCClient } from '@trpc/client';
import type { AnyTRPCRouter } from '@trpc/server';
import { createRecursiveProxy } from '@trpc/server/unstable-core-do-not-import';
import React, { use, useRef } from 'react';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function getUrl() {
  return getBaseUrl() + '/api/trpc';
}

export function createReactClient<
  TRouter extends AnyTRPCRouter,
  TDecoration extends Partial<TRPCLinkDecoration>,
>(init: () => CreateTRPCClientOptions<TRouter, TDecoration>) {
  type Context = {
    client: CreateTRPCClient<TRouter>;
  };
  const Provider = React.createContext(null as unknown as Context);
  return {
    Provider: (props: { children: React.ReactNode }) => {
      const [client] = React.useState(() => {
        const options = init();
        return createTRPCClient(options);
      });

      return (
        <Provider.Provider value={{ client }}>
          {props.children}
        </Provider.Provider>
      );
    },
    useClient: () => {
      const ctx = use(Provider);
      const ref = useRef();
      if (!ctx) {
        throw new Error('No tRPC client found');
      }
      const untyped = getUntypedClient(ctx.client);

      return createRecursiveProxy((opts) => {
        console.log('opts', opts);
        untyped.$request({
          type: 'query',
          input: opts.args[0],
        });
      }) as any;
    },
  };
}
