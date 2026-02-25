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
import { createSearchAction } from './createSearchAction';
import { SearchEngine } from '@backstage/plugin-search-backend-node';
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { BackstageCredentials } from '@backstage/backend-plugin-api';

describe('createSearchAction', () => {
  let mockSearchEngine: jest.Mocked<SearchEngine>;
  let mockActionsRegistry: jest.Mocked<ActionsRegistryService>;
  let registeredAction: any;
  const mockCredentials = {} as BackstageCredentials;

  beforeEach(() => {
    mockSearchEngine = {
      query: jest.fn().mockResolvedValue({
        results: [],
        previousPageCursor: undefined,
        nextPageCursor: undefined,
      }),
      setTranslator: jest.fn(),
    } as unknown as jest.Mocked<SearchEngine>;

    mockActionsRegistry = {
      register: jest.fn().mockImplementation(action => {
        registeredAction = action;
      }),
    } as unknown as jest.Mocked<ActionsRegistryService>;

    createSearchAction({
      actionsRegistry: mockActionsRegistry,
      searchEngine: mockSearchEngine,
    });
  });

  it('should register a search action', () => {
    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(1);
    expect(registeredAction.name).toBe('search');
    expect(registeredAction.attributes.readOnly).toBe(true);
    expect(registeredAction.attributes.destructive).toBe(false);
  });

  it('should pass types as undefined when not specified', async () => {
    await registeredAction.action({
      input: { term: 'test' },
      credentials: mockCredentials,
    });

    expect(mockSearchEngine.query).toHaveBeenCalledWith(
      expect.objectContaining({
        types: undefined,
      }),
      { credentials: mockCredentials },
    );
  });

  it('should pass through an empty types array as-is', async () => {
    await registeredAction.action({
      input: { term: 'test', types: [] },
      credentials: mockCredentials,
    });

    expect(mockSearchEngine.query).toHaveBeenCalledWith(
      expect.objectContaining({
        types: [],
      }),
      { credentials: mockCredentials },
    );
  });

  it('should use provided types when explicitly specified', async () => {
    await registeredAction.action({
      input: { term: 'test', types: ['techdocs'] },
      credentials: mockCredentials,
    });

    expect(mockSearchEngine.query).toHaveBeenCalledWith(
      expect.objectContaining({
        types: ['techdocs'],
      }),
      { credentials: mockCredentials },
    );
  });

  it('should pass through term, filters, pageCursor, and pageLimit', async () => {
    await registeredAction.action({
      input: {
        term: 'my search',
        filters: { kind: 'Component' },
        pageCursor: 'abc',
        pageLimit: 5,
      },
      credentials: mockCredentials,
    });

    expect(mockSearchEngine.query).toHaveBeenCalledWith(
      {
        term: 'my search',
        filters: { kind: 'Component' },
        types: undefined,
        pageCursor: 'abc',
        pageLimit: 5,
      },
      { credentials: mockCredentials },
    );
  });

  it('should return results from search engine', async () => {
    mockSearchEngine.query.mockResolvedValue({
      results: [
        {
          type: 'software-catalog',
          document: {
            title: 'Entity A',
            text: 'Description of Entity A',
            location: '/catalog/default/component/entity-a',
          },
        },
        {
          type: 'techdocs',
          document: {
            title: 'Doc B',
            text: 'Documentation content',
            location: '/docs/default/component/doc-b',
          },
        },
      ],
      previousPageCursor: 'prev',
      nextPageCursor: 'next',
    });

    const result = await registeredAction.action({
      input: { term: 'test' },
      credentials: mockCredentials,
    });

    expect(result.output.results).toHaveLength(2);
    expect(result.output.previousPageCursor).toBe('prev');
    expect(result.output.nextPageCursor).toBe('next');
  });

  it('should throw InputError when search engine fails', async () => {
    mockSearchEngine.query.mockRejectedValue(new Error('Engine failure'));

    await expect(
      registeredAction.action({
        input: { term: 'test' },
        credentials: mockCredentials,
      }),
    ).rejects.toThrow('Failed to perform search: Engine failure');
  });
});
