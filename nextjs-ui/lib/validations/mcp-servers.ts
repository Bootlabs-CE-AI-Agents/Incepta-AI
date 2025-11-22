/**
 * MCP Server Form Validation Schemas
 *
 * Zod schemas for MCP server CRUD operations with conditional validation
 * based on server type (HTTP, SSE, stdio)
 * following 2025 best practices
 *
 * @see https://zod.dev (Zod v3 documentation)
 */

import { z } from 'zod';

/**
 * MCP Server Transport Type Enum
 *
 * Matches backend TransportType enum in src/database/models.py
 * - "stdio": Local subprocess communication via stdin/stdout
 * - "http_sse": HTTP with Server-Sent Events for persistent connections
 */
export const mcpTransportTypeEnum = z.enum([
  'stdio',
  'http_sse'
]);

/**
 * Environment Variable Schema
 * For stdio servers that need env vars
 */
export const envVarSchema = z.object({
  key: z.string()
    .min(1, { message: "Environment variable key is required" })
    .regex(/^[A-Z_][A-Z0-9_]*$/, {
      message: "Key must be uppercase with underscores (e.g., API_KEY)"
    }),

  value: z.string()
    .min(1, { message: "Environment variable value is required" }),
});

/**
 * HTTP/SSE Connection Config Schema
 */
export const httpConnectionSchema = z.object({
  url: z.string()
    .url({ message: "Server URL must be a valid URL" }),

  headers: z.record(z.string(), z.string())
    .optional(),

  timeout: z.number()
    .int()
    .positive()
    .max(300000) // 5 minutes max
    .default(30000), // 30 seconds default
});

/**
 * Stdio Connection Config Schema
 */
export const stdioConnectionSchema = z.object({
  command: z.string()
    .min(1, { message: "Command is required for stdio servers" }),

  args: z.array(z.string()).optional().default([]),

  env: z.array(envVarSchema).optional().default([]),

  cwd: z.string()
    .optional(),
});

/**
 * Base MCP Server Schema with flat fields (matches backend Pydantic schema)
 *
 * Uses .superRefine() for transport-specific validation instead of discriminated union.
 * This aligns with the backend's flat field structure where command, args, env, url, headers
 * are all at the root level, not nested in a connection_config object.
 */
export const mcpServerSchema = z.object({
  name: z.string()
    .min(2, { message: "Server name must be at least 2 characters" })
    .max(100, { message: "Server name must not exceed 100 characters" }),

  transport_type: mcpTransportTypeEnum,

  description: z.string()
    .max(500, { message: "Description must not exceed 500 characters" })
    .optional(),

  // stdio transport fields (optional, validated in superRefine)
  command: z.string()
    .min(1, { message: "Command is required for stdio servers" })
    .optional(),

  args: z.array(z.string())
    .default([]),

  env: z.array(envVarSchema)
    .default([]),

  cwd: z.string()
    .optional(),

  // http_sse transport fields (optional, validated in superRefine)
  url: z.union([z.string().length(0), z.string().url({ message: "Must be a valid URL" })])
    .optional(),

  headers: z.record(z.string(), z.string())
    .default({}),

  timeout: z.number()
    .int()
    .positive()
    .max(300000) // 5 minutes max
    .default(30000), // 30 seconds default

  // Health check enabled
  health_check_enabled: z.boolean()
    .default(true),

  // Active status
  is_active: z.boolean()
    .default(true),
}).superRefine((data, ctx) => {
  // Validate transport-specific required fields
  if (data.transport_type === 'stdio') {
    if (!data.command || data.command.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Command is required for stdio servers",
        path: ['command'],
      });
    }
    // Warn if http_sse fields are provided
    if (data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL field is not used for stdio transport",
        path: ['url'],
      });
    }
  } else if (data.transport_type === 'http_sse') {
    if (!data.url || data.url.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL is required for HTTP/SSE transport",
        path: ['url'],
      });
    }
    // Warn if stdio fields are provided
    if (data.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Command field is not used for HTTP/SSE transport",
        path: ['command'],
      });
    }
  }
});

/**
 * Helper schemas for different transport types
 * These make form rendering easier
 */
export const httpSseMcpServerSchema = z.object({
  name: z.string()
    .min(2, { message: "Server name must be at least 2 characters" })
    .max(100, { message: "Server name must not exceed 100 characters" }),
  transport_type: z.literal('http_sse'),
  description: z.string()
    .max(500, { message: "Description must not exceed 500 characters" })
    .optional(),
  connection_config: httpConnectionSchema,
  health_check_enabled: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const stdioMcpServerSchema = z.object({
  name: z.string()
    .min(2, { message: "Server name must be at least 2 characters" })
    .max(100, { message: "Server name must not exceed 100 characters" }),
  transport_type: z.literal('stdio'),
  description: z.string()
    .max(500, { message: "Description must not exceed 500 characters" })
    .optional(),
  connection_config: stdioConnectionSchema,
  health_check_enabled: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

/**
 * MCP Server Create Schema
 */
export const mcpServerCreateSchema = mcpServerSchema;

/**
 * MCP Server Update Schema
 * All fields optional for partial updates
 */
export const mcpServerUpdateSchema = mcpServerSchema.partial();

/**
 * Test Connection Schema
 * For testing MCP server connectivity
 */
export const mcpTestConnectionSchema = z.object({
  server_id: z.string().uuid({ message: "Invalid server ID" }),
});

/**
 * Type exports
 */
export type MCPTransportType = z.infer<typeof mcpTransportTypeEnum>;
export type EnvVar = z.infer<typeof envVarSchema>;
export type HTTPConnectionConfig = z.infer<typeof httpConnectionSchema>;
export type StdioConnectionConfig = z.infer<typeof stdioConnectionSchema>;
export type MCPServerFormData = z.infer<typeof mcpServerSchema>;
export type HTTPSSEMCPServerData = z.infer<typeof httpSseMcpServerSchema>;
export type StdioMCPServerData = z.infer<typeof stdioMcpServerSchema>;
export type MCPServerCreateData = z.infer<typeof mcpServerCreateSchema>;
export type MCPServerUpdateData = z.infer<typeof mcpServerUpdateSchema>;
export type MCPTestConnectionInput = z.infer<typeof mcpTestConnectionSchema>;
