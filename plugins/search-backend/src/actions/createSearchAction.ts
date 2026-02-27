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

// Memory optimization constants
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 25;
const SEARCH_TIMEOUT = 30000;

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
To search just the catalog, set the type to "software-catalog".
To search just techdocs, use "techdocs". Other types might also be installed, but the list will depend on the specific backstage configuration.
Results are limited to ${MAX_PAGE_LIMIT} per page for performance reasons.`,
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
            .min(1)
            .max(MAX_PAGE_LIMIT)
            .describe(
              `Maximum number of results per page (1-${MAX_PAGE_LIMIT})`,
            )
            .default(DEFAULT_PAGE_LIMIT)
            .optional(),
        }),
      output: z =>
        z.object({
          results: z.array(z.any()),
          previousPageCursor: z.string().optional(),
          nextPageCursor: z.string().optional(),
        }),
    },
    action: async ({ input, credentials, logger }) => {
      try {
        // Enforce page limit constraints
        const pageLimit = Math.min(
          input.pageLimit || DEFAULT_PAGE_LIMIT,
          MAX_PAGE_LIMIT,
        );

        const query: SearchQuery = {
          term: input.term,
          filters: input.filters,
          pageCursor: input.pageCursor,
          pageLimit,
          ...(input.types?.length ? { types: input.types } : {}),
        };

        logger.debug(`Search query: ${JSON.stringify(query)}`);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Search timeout after ${SEARCH_TIMEOUT}ms`));
          }, SEARCH_TIMEOUT);
        });

        const searchPromise = searchEngine.query(query, { credentials });
        const results = (await Promise.race([
          searchPromise,
          timeoutPromise,
        ])) as any;

        if (!results || typeof results !== 'object') {
          throw new Error('Invalid search results structure');
        }

        const resultArray = Array.isArray(results.results)
          ? results.results
          : [];
        if (resultArray.length > MAX_PAGE_LIMIT) {
          logger.warn(
            `Search returned ${resultArray.length} results, truncating to ${MAX_PAGE_LIMIT}`,
          );
          resultArray.splice(MAX_PAGE_LIMIT);
        }

        logger.debug(`Search completed: ${resultArray.length} results`);

        return {
          output: {
            results: resultArray,
            previousPageCursor: results.previousPageCursor || undefined,
            nextPageCursor: results.nextPageCursor || undefined,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Search failed: ${errorMessage}`);

        throw new InputError(`Failed to perform search: ${errorMessage}`);
      }
    },
  });
};
