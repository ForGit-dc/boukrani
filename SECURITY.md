# Security Documentation

## Admin Access Management

### Initial Setup - Creating the First Super Admin

**IMPORTANT:** Admin accounts cannot self-register. The first super admin must be created manually.

#### Step 1: Create Your Auth User
1. Go to Supabase Dashboard â†’ Authentication â†’ Users
2. Create a new user account (or use your existing one)
3. Copy the User ID (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### Step 2: Grant Super Admin Privileges
1. Go to Supabase Dashboard â†’ SQL Editor
2. Run this query (replace with your actual user ID):

```sql
INSERT INTO public.admin_users (user_id, role, created_by)
VALUES (
  'your-user-id-here',  -- Replace with your User ID from Step 1
  'super_admin',
  'your-user-id-here'   -- Same User ID
);
```

#### Step 3: Sign In
1. Visit `/admin` route in your application
2. Sign in with the email/password from Step 1
3. You now have full admin access

### Creating Additional Admins

Once you have super admin access:
1. Additional admins can only be created by existing super admins
2. Use the admin panel UI (when implemented) or run SQL:

```sql
-- Create a moderator
INSERT INTO public.admin_users (user_id, role, created_by)
VALUES (
  'new-admin-user-id',
  'moderator',  -- or 'super_admin'
  auth.uid()    -- Your super admin ID
);
```

### Admin Roles

- **super_admin**: Full access - can create/modify/delete other admins
- **moderator**: Read-only access to admin features

## Authentication Model

### Public Chat (Unauthenticated)
- Chat AI endpoint is intentionally public
- Rate limited: 20 requests per 5 minutes
- Session limited: 7 questions per session (enforced server-side)
- No authentication required for chat access

### Admin Panel (Authenticated)
- Requires valid Supabase auth session
- Must have entry in `admin_users` table
- Protected by Row Level Security (RLS)
- Server-side verification on all admin endpoints

### Conversations Table
- Accessed only by service role (edge functions)
- Uses `session_id` for tracking (not `user_id`)
- RLS policies prevent direct client access
- Intentionally allows unauthenticated chat storage

## Security Features

### âœ… Implemented Protections
- Server-side admin verification on all admin endpoints
- JWT authentication required for admin functions
- Client-side route guards prevent UI access
- Rate limiting on all public endpoints
- Input validation with strict schemas
- RLS enabled on all tables
- Security definer functions have fixed `search_path`
- Audit logging for security events
- Service role isolation for sensitive operations
- Session limits enforced server-side
- Error message sanitization

### ðŸ”’ Critical Security Rules
1. **Never check admin status client-side** - Always use server-side verification
2. **Never store roles in auth.users metadata** - Always use separate `admin_users` table
3. **Never expose detailed errors to users** - Log details server-side only
4. **Never allow admin self-registration** - Manual SQL setup required

## Monitoring & Alerts

### Cost Monitoring
- Set OpenAI budget alerts in OpenAI dashboard
- Monitor daily API usage
- Track rate limit violations in audit logs

### Security Monitoring
- Review audit logs regularly for unusual patterns
- Monitor failed admin login attempts
- Check for rate limit violations
- Review conversation data for abuse

### Recommended Alerts
1. Daily OpenAI API cost summary
2. Failed admin authentication attempts > 5/hour
3. Rate limit violations > 10/hour
4. Unusual spike in chat requests

## Platform-Level Security Settings

The following settings must be configured in your Supabase dashboard (cannot be set via code):

### 1. OTP Expiry Configuration
**Location**: [Auth Settings](https://supabase.com/dashboard/project/vlraleulstltymsqcffc/auth/providers)

- Reduce OTP expiry time to recommended threshold (typically 10 minutes)
- Prevents password reset token abuse
- Currently exceeds recommended threshold

### 2. Postgres Security Patches
**Location**: [Database Settings](https://supabase.com/dashboard/project/vlraleulstltymsqcffc/settings/database)

- Apply available security patches by upgrading Postgres version
- Ensures database security against known vulnerabilities
- Check regularly for new patches

## Emergency Procedures

### Compromised Admin Account
1. Revoke access in Supabase Dashboard â†’ Auth â†’ Users
2. Delete from `admin_users` table
3. Review audit logs for unauthorized access
4. Rotate any exposed secrets

### API Abuse
1. Identify session_id or IP from logs
2. Add IP-based blocking (when implemented)
3. Increase rate limits if legitimate traffic
4. Review and adjust cost limits

### Data Breach Response
1. Rotate all secrets immediately
2. Review audit logs for unauthorized access
3. Check RLS policies are properly enforced
4. Notify affected users if necessary

## Compliance Notes

- All security events logged to `audit_logs` table
- Admin actions tracked with `created_by` references
- Visitor data deletable (GDPR compliance ready)
- Session data retention policy: 1 year (configurable)
