-- CreateTable
CREATE TABLE "gyms" (
    "gym_id" SERIAL NOT NULL,
    "gym_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gyms_pkey" PRIMARY KEY ("gym_id"),
    CONSTRAINT "gyms_gym_name_address_key" UNIQUE ("gym_name", "address")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "permissions" TEXT[] NOT NULL DEFAULT '{}',
    "gym_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "users_gym_id_idx" ON "users" ("gym_id");

-- At most one row may have role super_admin
CREATE UNIQUE INDEX "users_one_super_admin_role" ON "users" ( (CASE WHEN "role" = 'super_admin' THEN 0 END) );

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "membership_type" TEXT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "payment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "gym_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "members_member_id_key" UNIQUE ("member_id"),
    CONSTRAINT "members_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration_days" TEXT NOT NULL,
    "features" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "gym_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "membership_plans_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "gym_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vendor" TEXT,
    "gym_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "gym_id" INTEGER,
    "check_in_date" TIMESTAMP(3) NOT NULL,
    "check_in_time" TEXT NOT NULL,
    "check_out_date" TIMESTAMP(3),
    "check_out_time" TEXT,
    "status" TEXT NOT NULL,
    "duration" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trainers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "gym_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainers_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gym_id" INTEGER,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("gym_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "members_gym_id_idx" ON "members" ("gym_id");
CREATE INDEX "trainers_gym_id_idx" ON "trainers" ("gym_id");
CREATE INDEX "membership_plans_gym_id_idx" ON "membership_plans" ("gym_id");
CREATE INDEX "expenses_gym_id_idx" ON "expenses" ("gym_id");
CREATE INDEX "payments_gym_id_idx" ON "payments" ("gym_id");
CREATE INDEX "attendance_gym_id_idx" ON "attendance" ("gym_id");
CREATE INDEX "notifications_gym_id_idx" ON "notifications" ("gym_id");

-- RBAC: permissions are stored directly per-user in users.permissions (deny by default)

CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_key_key" UNIQUE ("key")
);

INSERT INTO "permissions" ("key", "description") VALUES
  ('dashboard.read', 'View dashboard overview'),
  ('dashboard.financial', 'View dashboard financial charts'),
  ('members.read', 'View members'),
  ('members.add', 'Create members'),
  ('members.update', 'Update members'),
  ('members.delete', 'Delete members'),
  ('expiring_members.view', 'View expiring members'),
  ('gyms.read', 'View gyms'),
  ('gyms.add', 'Create gyms'),
  ('gyms.update', 'Update gyms'),
  ('gyms.delete', 'Delete gyms'),
  ('expenses.read', 'View expenses'),
  ('expenses.add', 'Create expenses'),
  ('expenses.update', 'Update expenses'),
  ('expenses.delete', 'Delete expenses'),
  ('payments.read', 'View payments overview'),
  ('trainers.read', 'View trainers'),
  ('trainers.add', 'Create trainers'),
  ('trainers.update', 'Update trainers'),
  ('trainers.delete', 'Delete trainers'),
  ('membership_plans.read', 'View membership plans'),
  ('membership_plans.add', 'Create membership plans'),
  ('membership_plans.update', 'Update membership plans'),
  ('membership_plans.delete', 'Delete membership plans'),
  ('notifications.read', 'View notifications'),
  ('notifications.mark_as_read', 'Mark notifications as read'),
  ('notifications.mark_all_as_read', 'Mark all notifications as read'),
  ('notifications.delete', 'Delete notifications'),
  ('users.read', 'View user accounts'),
  ('users.add', 'Create user accounts'),
  ('users.update', 'Update user accounts'),
  ('users.delete', 'Delete user accounts'),
  ('users.manage_permissions', 'Manage user permissions'),
  ('my_account.view', 'View my account'),
  ('my_account.update', 'Update my account'),
  ('system.manage_roles', 'Assign user roles');
