/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { InputError } from '@backstage/errors';
import { SearchEngine } from '@backstage/plugin-search-backend-node';
import { SearchQuery } from '@backstage/plugin-search-common';

export const createSearchAction = ({
  actionsRegistry,
  searchEngine,
}: {
  actionsRegistry: ActionsRegistryService;
  searchEngine: SearchEngine;
}) => {
  actionsRegistry.register({
    name: 'search',
    title: 'Search',
    attributes: {
      destructive: false,
      readOnly: true,
      idempotent: true,
    },
    description: `
This allows you to search for resources across the Backstage ecosystem.
You can search by term, filter by types, and paginate through results.
Supported types include: software-catalog, techdocs and adr.
    `,
    schema: {
      input: z =>
        z.object({
          term: z.string().describe('The search term to query').default(''),
          filters: z
            .record(z.any())
            .describe('Optional filters to apply to the search')
            .optional(),
          types: z
            .array(z.string())
            .describe('Optional list of document types to search')
            .optional(),
          pageCursor: z.string().describe('Cursor for pagination').optional(),
          pageLimit: z
            .number()
            .describe('Maximum number of results per page')
            .optional(),
        }),
      output: z =>
        z.object({
          results: z.array(z.any()),
          previousPageCursor: z.string().optional(),
          nextPageCursor: z.string().optional(),
        }),
    },
    action: async ({ input, credentials }) => {
      try {
        const query: SearchQuery = {
          term: input.term,
          filters: input.filters,
          types: input.types,
          pageCursor: input.pageCursor,
          pageLimit: input.pageLimit,
        };

        // Query the search engine directly
        const results = await searchEngine.query(query, { credentials });

        return {
          output: {
            results: results.results,
            previousPageCursor: results.previousPageCursor,
            nextPageCursor: results.nextPageCursor,
          },
        };
      } catch (error) {
        throw new InputError(
          `Failed to perform search: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  });
};
