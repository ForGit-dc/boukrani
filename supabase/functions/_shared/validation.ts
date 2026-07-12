// Shared validation schemas using Zod for all edge functions

// Zod validation schema type
export interface ValidationSchema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: boolean; data?: T; error?: any };
}

// Simple manual validation (Zod-like API without the dependency)
export function createSchema<T>(validator: (data: any) => T): ValidationSchema<T> {
  return {
    parse: (data: unknown) => {
      try {
        return validator(data);
      } catch (error) {
        throw new Error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    safeParse: (data: unknown) => {
      try {
        const result = validator(data);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error };
      }
    }
  };
}

// Validation helpers
function isString(val: any, field: string): string {
  if (typeof val !== 'string') throw new Error(`${field} must be a string`);
  return val;
}

function isOptionalString(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') throw new Error('must be a string');
  return val;
}

function isEmail(val: string, field: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val)) throw new Error(`${field} must be a valid email`);
  return val;
}

function isBoolean(val: any): boolean {
  return Boolean(val);
}

function minLength(val: string, min: number, field: string): string {
  if (val.length < min) throw new Error(`${field} must be at least ${min} characters`);
  return val;
}

function maxLength(val: string, max: number, field: string): string {
  if (val.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return val;
}

function inRange(val: number, min: number, max: number, field: string): number {
  if (val < min || val > max) throw new Error(`${field} must be between ${min} and ${max}`);
  return val;
}

function isDatetime(val: string, field: string): string {
  const date = new Date(val);
  if (isNaN(date.getTime())) throw new Error(`${field} must be a valid ISO 8601 datetime`);
  return val;
}

function matchesRegex(val: string, pattern: RegExp, field: string, message: string): string {
  if (!pattern.test(val)) throw new Error(`${field} ${message}`);
  return val;
}

// Whitelist of allowed language codes
const ALLOWED_LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko'];

function isValidLanguage(val: string): string {
  if (!ALLOWED_LANGUAGES.includes(val.toLowerCase())) {
    throw new Error(`Language must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);
  }
  return val.toLowerCase();
}

// Chat-AI validation schema
export interface ChatAIInput {
  message: string;
  session_id?: string;
  lang?: string;
  // Deprecated: knowledge/system prompt now live server-side. Accepted but ignored.
  systemPrompt?: string;
  knowledge?: any;
  sourceUrls?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  debug?: number;
  strict?: number;
}

export const chatAISchema = createSchema<ChatAIInput>((data: any) => {
  const message = maxLength(minLength(isString(data.message, 'message'), 1, 'message'), 4000, 'message');
  const session_id = data.session_id ? maxLength(isString(data.session_id, 'session_id'), 200, 'session_id') : undefined;

  return {
    message,
    session_id,
    lang: data.lang ? isValidLanguage(data.lang) : undefined,
    systemPrompt: isOptionalString(data.systemPrompt),
    knowledge: data.knowledge,
    sourceUrls: Array.isArray(data.sourceUrls) ? data.sourceUrls : [],
    model: isOptionalString(data.model),
    temperature: data.temperature !== undefined ? inRange(Number(data.temperature), 0, 1, 'temperature') : undefined,
    maxTokens: data.maxTokens !== undefined ? inRange(Number(data.maxTokens), 16, 500, 'maxTokens') : undefined,
    debug: data.debug !== undefined ? Number(data.debug) : undefined,
    strict: data.strict !== undefined ? Number(data.strict) : undefined,
  };
});

// Log validation schema
export interface LogInput {
  session_id?: string;
  user_text?: string;
  assistant_text?: string;
  lang?: string;
  do_not_log?: boolean;
}

export const logSchema = createSchema<LogInput>((data: any) => {
  return {
    session_id: data.session_id ? maxLength(isString(data.session_id, 'session_id'), 200, 'session_id') : undefined,
    user_text: data.user_text ? maxLength(isString(data.user_text, 'user_text'), 4000, 'user_text') : undefined,
    assistant_text: data.assistant_text ? maxLength(isString(data.assistant_text, 'assistant_text'), 4000, 'assistant_text') : undefined,
    lang: data.lang ? isValidLanguage(data.lang) : undefined,
    do_not_log: isBoolean(data.do_not_log),
  };
});

// Session-name validation schema
export interface SessionNameInput {
  session_id: string;
  name?: string;
  email?: string;
  consent?: boolean;
}

export const sessionNameSchema = createSchema<SessionNameInput>((data: any) => {
  const session_id = maxLength(minLength(isString(data.session_id, 'session_id'), 1, 'session_id'), 200, 'session_id');
  const name = data.name ? maxLength(isString(data.name, 'name'), 100, 'name') : undefined;
  const email = data.email ? isEmail(maxLength(isString(data.email, 'email'), 255, 'email'), 'email') : undefined;
  
  return {
    session_id,
    name,
    email,
    consent: isBoolean(data.consent),
  };
});

// Session-identity validation schema (same as session-name)
export const sessionIdentitySchema = sessionNameSchema;

// Admin-list validation schema
export interface AdminListInput {
  resource?: 'conversations' | 'audit_logs' | 'auth_check';
  from?: string;
  to?: string;
  term?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
}

export const adminListSchema = createSchema<AdminListInput>((data: any) => {
  const resource = data.resource ? isString(data.resource, 'resource') : 'conversations';
  if (!['conversations', 'audit_logs', 'auth_check'].includes(resource)) {
    throw new Error('resource must be one of: conversations, audit_logs, auth_check');
  }

  return {
    resource: resource as 'conversations' | 'audit_logs' | 'auth_check',
    from: data.from ? isDatetime(data.from, 'from') : undefined,
    to: data.to ? isDatetime(data.to, 'to') : undefined,
    term: data.term ? maxLength(matchesRegex(
      isString(data.term, 'term'),
      /^[a-zA-Z0-9\s\-_@.]+$/,
      'term',
      'can only contain alphanumeric characters, spaces, hyphens, underscores, @ and dots'
    ), 200, 'term') : undefined,
    lang: data.lang ? isValidLanguage(data.lang) : undefined,
    page: data.page !== undefined ? inRange(Number(data.page), 1, 10000, 'page') : undefined,
    pageSize: data.pageSize !== undefined ? inRange(Number(data.pageSize), 1, 100, 'pageSize') : undefined,
  };
});

// Admin-manage validation schema
export interface AdminManageInput {
  action: 'list' | 'create' | 'update' | 'delete';
  admin_user_id?: string;
  email?: string;
  role?: 'super_admin' | 'moderator';
}

export const adminManageSchema = createSchema<AdminManageInput>((data: any) => {
  const action = isString(data.action, 'action');
  if (!['list', 'create', 'update', 'delete'].includes(action)) {
    throw new Error('action must be one of: list, create, update, delete');
  }
  
  return {
    action: action as 'list' | 'create' | 'update' | 'delete',
    admin_user_id: data.admin_user_id ? maxLength(isString(data.admin_user_id, 'admin_user_id'), 36, 'admin_user_id') : undefined,
    email: data.email ? isEmail(maxLength(isString(data.email, 'email'), 255, 'email'), 'email') : undefined,
    role: data.role ? (() => {
      const r = isString(data.role, 'role');
      if (!['super_admin', 'moderator'].includes(r)) {
        throw new Error('role must be either super_admin or moderator');
      }
      return r as 'super_admin' | 'moderator';
    })() : undefined,
  };
});

// Cost-tracking validation schema
export interface CostTrackingInput {
  action: 'get_stats' | 'update_thresholds';
  daily_threshold?: number;
  monthly_threshold?: number;
  alert_email?: string;
}

export const costTrackingSchema = createSchema<CostTrackingInput>((data: any) => {
  const action = isString(data.action, 'action');
  if (!['get_stats', 'update_thresholds'].includes(action)) {
    throw new Error('action must be one of: get_stats, update_thresholds');
  }
  
  const result: CostTrackingInput = {
    action: action as 'get_stats' | 'update_thresholds',
  };

  if (action === 'update_thresholds') {
    if (data.daily_threshold !== undefined) {
      result.daily_threshold = inRange(Number(data.daily_threshold), 0, 1000, 'daily_threshold');
    }
    if (data.monthly_threshold !== undefined) {
      result.monthly_threshold = inRange(Number(data.monthly_threshold), 0, 10000, 'monthly_threshold');
    }
    if (data.alert_email) {
      result.alert_email = isEmail(maxLength(isString(data.alert_email, 'alert_email'), 255, 'alert_email'), 'alert_email');
    }
  }

  return result;
});
