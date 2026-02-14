# 🌌 Cosmic Project Hub

AI-Powered Project Management Platform with Galactic Visualization

## 🚀 Phase 1 - Foundation Complete!

This project has been set up with all the necessary foundation for a complete project management system.

### ✅ What's Been Implemented

#### 1. **Database Schema (15 Tables)**
- Core: users, projects, modules, tasks, subtasks, dependencies
- Workflow: work_logs, task_requests, project_members
- System: invites, notifications, notification_preferences, privacy_settings
- Audit: activity_log, recent_searches

#### 2. **Authentication System**
- Supabase Auth integration
- Email/password login
- Protected routes with middleware
- User session management

#### 3. **Security**
- Row Level Security (RLS) on all tables
- Role-based access control (Admin, PM, Worker, Client)
- Secure storage policies for avatars

#### 4. **TypeScript Setup**
- Complete type definitions for all tables
- Type-safe Supabase client
- Strict mode enabled

#### 5. **State Management**
- Zustand for auth & UI state
- React Query for server data
- Custom hooks (useAuth)

#### 6. **UI Foundation**
- Tailwind CSS with Cosmic theme
- Custom fonts: Orbitron, Space Grotesk, Space Mono
- Responsive landing page
- Login page with validation
- Dashboard skeleton

---

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Copy your project credentials
3. Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Run Database Migrations

In Supabase SQL Editor, run these migrations **in order**:

1. `supabase/migrations/001_foundation_tables.sql`
2. `supabase/migrations/002_core_workflow.sql`
3. `supabase/migrations/003_system_tables.sql`
4. `supabase/migrations/004_functions_triggers.sql`
5. `supabase/migrations/005_rls_policies_part1.sql`
6. `supabase/migrations/005_rls_policies_part2.sql`
7. `supabase/migrations/006_storage_configuration.sql`

### 4. Create Storage Bucket

In Supabase Dashboard:
1. Go to Storage → Create Bucket
2. Name: `avatars`
3. Public: **YES**
4. File size limit: 5MB
5. Allowed types: image/jpeg, image/png, image/webp

### 5. Create Admin User

Run `supabase/migrations/007_create_admin_user.sql` in SQL Editor

Or manually via Dashboard → Authentication → Users:
- Email: `admin@cosmic.app`
- Password: `CosmicAdmin2026!`
- Auto-confirm: YES

Then run:
```sql
INSERT INTO public.users (id, email, full_name, role)
SELECT id, email, 'Cosmic Admin', 'admin'
FROM auth.users
WHERE email = 'admin@cosmic.app';
```

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 7. Test Login

- Navigate to http://localhost:3000/login
- Email: `admin@cosmic.app`
- Password: `CosmicAdmin2026!`

---

## 🎨 Cosmic Theme Colors

- **Background**: `#0a0e1a` (Deep Space)
- **Surface**: `#151b2e` (Cosmic Navy)
- **Primary**: `#00d9ff` (Cyan Neon)
- **Secondary**: `#a855f7` (Purple Nebula)
- **Accent**: `#ff6b35` (Orange Supernova)

---

## 📁 Project Structure

```
cosmic-project-hub/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx       # Login page
│   ├── (protected)/
│   │   └── dashboard/page.tsx   # Main dashboard
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── providers.tsx            # React Query provider
│
├── components/
│   ├── ui/                      # Reusable UI components
│   └── auth/                    # Auth-related components
│
├── lib/
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── server.ts            # Server Supabase client
│       └── middleware.ts        # Auth middleware
│
├── hooks/
│   └── use-auth.ts              # Authentication hook
│
├── types/
│   ├── database.ts              # Generated Supabase types
│   └── index.ts                 # Custom types
│
├── store/
│   └── index.ts                 # Zustand stores
│
├── supabase/
│   └── migrations/              # SQL migration files
│
└── middleware.ts                # Next.js middleware
```

---

## 🔐 User Roles

### Admin
- Full system access
- User management
- Invite users
- View all activity logs

### Project Manager
- Create projects
- Manage modules & tasks
- Assign work to team
- Approve/reject task requests

### Worker
- View assigned tasks
- Log work hours
- Request new tasks
- Update task status

### Client
- View project progress
- Read-only access
- Receive reports

---

## ✅ Phase 1 Checklist

- [x] Next.js 14 project initialized
- [x] Dependencies installed
- [x] Tailwind configured with Cosmic theme
- [x] Supabase client setup (browser + server)
- [x] Database schema (15 tables)
- [x] RLS policies enabled
- [x] Triggers & functions created
- [x] TypeScript types generated
- [x] Zustand store configured
- [x] React Query setup
- [x] Authentication hook
- [x] Login page
- [x] Dashboard skeleton
- [x] Landing page
- [x] Middleware configured
- [x] Storage policies

---

## 🚀 Next Steps: Phase 2

Phase 2 will implement:
- Worker Workstation interface
- Task list with filters
- Time logging system
- Task status updates
- Real-time notifications
- Task claiming mechanism

---

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Run production build
npm run lint            # Run ESLint

# Supabase
npx supabase link       # Link to project
npx supabase gen types typescript --linked > types/database.ts
```

---

## 📝 Notes

- Change admin password after first login
- Keep `.env.local` secret (already in .gitignore)
- Run migrations in order
- Test RLS policies before production
- Generate new types after schema changes

---

## 🐛 Troubleshooting

### "Invalid JWT" error
- Check `.env.local` has correct Supabase URL and keys
- Restart dev server after changing env vars

### RLS blocking queries
- Verify user is authenticated
- Check RLS policies are correct
- Use Supabase dashboard logs to debug

### TypeScript errors
- Regenerate types: `npx supabase gen types typescript --linked > types/database.ts`
- Restart TypeScript server in editor

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)

---

**Phase 1 Complete!** 🎉

Ready for Phase 2 implementation.
