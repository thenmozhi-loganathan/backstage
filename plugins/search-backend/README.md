# search-backend

This plugin is part of a suite of plugins that comprise the Backstage search
platform. This particular plugin responsible for exposing a JSON API for
querying a search engine.

## Actions Integration

The search-backend plugin registers a `search` action with the [Actions Registry Service](https://backstage.io/docs/backend-system/core-services/actions-registry), enabling programmatic search queries through the Backstage Actions system. The action supports:

- **term**: Search term to query
- **filters**: Optional filters to apply
- **types**: Document types to search (e.g., `software-catalog`, `techdocs`, `adr`)
- **pageCursor/pageLimit**: Pagination support

This action is marked as `readOnly` and `idempotent`, making it safe for automated workflows.

Documentation on how to develop and improve the search platform is currently
centralized in the `search` plugin README.md.

For a better overview of how the search platform is put together, check the
[Backstage Search Architecture](https://backstage.io/docs/features/search/architecture)
documentation.
