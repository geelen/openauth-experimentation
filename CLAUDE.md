# OpenAuth Template Project Guidelines

## Commands
- **Typecheck**: `npm run check` (runs TypeScript + Wrangler dry-run)
- **Dev server**: `npm run dev` (local development with Wrangler)
- **Deploy**: `npm run deploy` (deploys to Cloudflare Workers)
- **Type generation**: `npm run types` (generates Wrangler types)
- **DB Migration**: `npx wrangler d1 migrations apply --remote openauth-template-auth-db`

## Code Style Guidelines
- **TypeScript**: Use strict mode with ESNext target
- **Imports**: Group imports by source (core/vendor/internal)
- **Naming**: 
  - Functions: camelCase
  - Variables: camelCase
  - Types: PascalCase
- **Error handling**: Use explicit error types and meaningful error messages
- **Formatting**: 2-space indentation, no trailing whitespace
- **Code organization**: Group related functionality together
- **Types**: Prefer explicit typing; use satisfies for interfaces
- **Comments**: Use JSDoc for public APIs, inline comments for complex logic

## Architecture Notes
The project implements OAuth authentication using OpenAuth on Cloudflare Workers with D1 database and KV storage.