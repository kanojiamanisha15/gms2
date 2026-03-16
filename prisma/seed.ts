// prisma/seed.ts
import { seedDefaultUser } from '@/lib/db/seeds/default-user';
import { queryOne, query } from '@/lib/db/db';

async function seedMembers() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM members'
  );
  if (existing && existing.count !== '0') {
    // Already seeded; skip to avoid duplicates.
    return;
  }

const members = [
    {
      member_id: '5JA01',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '9990000001',
      membership_type: 'Premium',
      join_date: '2025-01-01',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '5DE01',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '9990000002',
      membership_type: 'Premium',
      join_date: '2025-01-05',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3DE01',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '9990000003',
      membership_type: 'Standard',
      join_date: '2025-01-10',
      expiry_date: '2025-06-30',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5OC01',
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      phone: '9990000004',
      membership_type: 'Premium',
      join_date: '2025-01-12',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '4JA01',
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      phone: '9990000005',
      membership_type: 'Standard',
      join_date: '2025-01-15',
      expiry_date: '2025-07-15',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5JA02',
      name: 'Diana Prince',
      email: 'diana.prince@example.com',
      phone: '9990000006',
      membership_type: 'Premium',
      join_date: '2025-01-18',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3NO01',
      name: 'Edward Norton',
      email: 'edward.norton@example.com',
      phone: '9990000007',
      membership_type: 'Standard',
      join_date: '2025-01-20',
      expiry_date: '2025-07-20',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '5DE02',
      name: 'Fiona Green',
      email: 'fiona.green@example.com',
      phone: '9990000008',
      membership_type: 'Premium',
      join_date: '2025-01-22',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '4JA02',
      name: 'George White',
      email: 'george.white@example.com',
      phone: '9990000009',
      membership_type: 'Standard',
      join_date: '2025-01-24',
      expiry_date: '2025-07-24',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '4FE01',
      name: 'Hannah Black',
      email: 'hannah.black@example.com',
      phone: '9990000010',
      membership_type: 'Standard',
      join_date: '2025-01-26',
      expiry_date: '2025-07-26',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '3OC01',
      name: 'Ian Gray',
      email: 'ian.gray@example.com',
      phone: '9990000011',
      membership_type: 'Standard',
      join_date: '2025-01-26',
      expiry_date: '2025-07-26',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '5OC02',
      name: 'Julia Red',
      email: 'julia.red@example.com',
      phone: '9990000012',
      membership_type: 'Premium',
      join_date: '2025-01-26',
      expiry_date: '2025-12-31',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '5MR01',
      name: 'Karan Singh',
      email: 'karan.singh@example.com',
      phone: '9990000013',
      membership_type: 'Premium',
      join_date: '2025-02-01',
      expiry_date: '2025-02-28',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3MR02',
      name: 'Lata Iyer',
      email: 'lata.iyer@example.com',
      phone: '9990000014',
      membership_type: 'Standard',
      join_date: '2025-02-10',
      expiry_date: '2025-03-10',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '4AP01',
      name: 'Manish Gupta',
      email: 'manish.gupta@example.com',
      phone: '9990000015',
      membership_type: 'Standard',
      join_date: '2025-03-05',
      expiry_date: '2025-04-05',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5AP02',
      name: 'Neha Sharma',
      email: 'neha.sharma@example.com',
      phone: '9990000016',
      membership_type: 'Premium',
      join_date: '2025-03-20',
      expiry_date: '2025-06-20',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3MY01',
      name: 'Om Prakash',
      email: 'om.prakash@example.com',
      phone: '9990000017',
      membership_type: 'Standard',
      join_date: '2025-04-02',
      expiry_date: '2025-05-02',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '4MY02',
      name: 'Priya Desai',
      email: 'priya.desai@example.com',
      phone: '9990000018',
      membership_type: 'Standard',
      join_date: '2025-05-15',
      expiry_date: '2025-08-15',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5JN01',
      name: 'Rahul Mehta',
      email: 'rahul.mehta@example.com',
      phone: '9990000019',
      membership_type: 'Premium',
      join_date: '2025-06-01',
      expiry_date: '2025-09-01',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3JN02',
      name: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@example.com',
      phone: '9990000020',
      membership_type: 'Standard',
      join_date: '2025-07-10',
      expiry_date: '2025-10-10',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '4AU01',
      name: 'Tarun Verma',
      email: 'tarun.verma@example.com',
      phone: '9990000021',
      membership_type: 'Standard',
      join_date: '2025-08-05',
      expiry_date: '2025-11-05',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5AU02',
      name: 'Uma Reddy',
      email: 'uma.reddy@example.com',
      phone: '9990000022',
      membership_type: 'Premium',
      join_date: '2025-09-01',
      expiry_date: '2025-12-01',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3SE01',
      name: 'Vikram Rao',
      email: 'vikram.rao@example.com',
      phone: '9990000023',
      membership_type: 'Standard',
      join_date: '2025-10-10',
      expiry_date: '2026-01-10',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '4OC03',
      name: 'Anjali Nair',
      email: 'anjali.nair@example.com',
      phone: '9990000024',
      membership_type: 'Standard',
      join_date: '2025-11-20',
      expiry_date: '2026-02-20',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5DE03',
      name: 'Yash Patel',
      email: 'yash.patel@example.com',
      phone: '9990000025',
      membership_type: 'Premium',
      join_date: '2025-12-01',
      expiry_date: '2026-03-01',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    // Extra members to further populate plan expiries across months
    {
      member_id: '3JA03',
      name: 'Zara Khan',
      email: 'zara.khan@example.com',
      phone: '9990000026',
      membership_type: 'Standard',
      join_date: '2025-01-28',
      expiry_date: '2025-04-28',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '4FE02',
      name: 'Deepak Joshi',
      email: 'deepak.joshi@example.com',
      phone: '9990000027',
      membership_type: 'Standard',
      join_date: '2025-02-15',
      expiry_date: '2025-05-15',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '5MR02',
      name: 'Isha Malhotra',
      email: 'isha.malhotra@example.com',
      phone: '9990000028',
      membership_type: 'Premium',
      join_date: '2025-03-12',
      expiry_date: '2025-09-12',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3AP03',
      name: 'Harsh Jain',
      email: 'harsh.jain@example.com',
      phone: '9990000029',
      membership_type: 'Standard',
      join_date: '2025-04-18',
      expiry_date: '2025-07-18',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '4MY03',
      name: 'Ritu Kaur',
      email: 'ritu.kaur@example.com',
      phone: '9990000030',
      membership_type: 'Standard',
      join_date: '2025-05-22',
      expiry_date: '2025-08-22',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '5MY03',
      name: 'Gaurav Bansal',
      email: 'gaurav.bansal@example.com',
      phone: '9990000031',
      membership_type: 'Premium',
      join_date: '2025-06-05',
      expiry_date: '2025-12-05',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3JN03',
      name: 'Pooja Menon',
      email: 'pooja.menon@example.com',
      phone: '9990000032',
      membership_type: 'Standard',
      join_date: '2025-07-25',
      expiry_date: '2025-10-25',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '4JL01',
      name: 'Arjun Nanda',
      email: 'arjun.nanda@example.com',
      phone: '9990000033',
      membership_type: 'Standard',
      join_date: '2025-08-28',
      expiry_date: '2025-11-28',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '5SP01',
      name: 'Meera Rao',
      email: 'meera.rao@example.com',
      phone: '9990000034',
      membership_type: 'Premium',
      join_date: '2025-09-10',
      expiry_date: '2026-01-10',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '3OC04',
      name: 'Nikhil Sinha',
      email: 'nikhil.sinha@example.com',
      phone: '9990000035',
      membership_type: 'Standard',
      join_date: '2025-10-05',
      expiry_date: '2026-02-05',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 199.99,
    },
    {
      member_id: '4NV01',
      name: 'Shreya Ghosh',
      email: 'shreya.ghosh@example.com',
      phone: '9990000036',
      membership_type: 'Standard',
      join_date: '2025-11-18',
      expiry_date: '2026-03-18',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 199.99,
    },
    {
      member_id: '5DC01',
      name: 'Rohan Kapoor',
      email: 'rohan.kapoor@example.com',
      phone: '9990000037',
      membership_type: 'Premium',
      join_date: '2025-12-20',
      expiry_date: '2026-04-20',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 299.99,
    },
    {
      member_id: '5JN26',
      name: 'Kritika Singh',
      email: 'kritika.singh@example.com',
      phone: '9990000038',
      membership_type: 'Premium',
      join_date: '2026-03-01',
      expiry_date: '2027-02-28',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 399.99,
    },
    {
      member_id: '3MR26',
      name: 'Aditya Rao',
      email: 'aditya.rao@example.com',
      phone: '9990000039',
      membership_type: 'Standard',
      join_date: '2026-03-05',
      expiry_date: '2026-09-05',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 249.99,
    },
    {
      member_id: '4FE26',
      name: 'Shruti Nair',
      email: 'shruti.nair@example.com',
      phone: '9990000040',
      membership_type: 'Standard',
      join_date: '2026-02-20',
      expiry_date: '2026-08-20',
      status: 'active',
      payment_status: 'unpaid',
      payment_amount: 219.99,
    },
    {
      member_id: '5FE26',
      name: 'Vivek Shah',
      email: 'vivek.shah@example.com',
      phone: '9990000041',
      membership_type: 'Premium',
      join_date: '2026-01-28',
      expiry_date: '2027-01-27',
      status: 'active',
      payment_status: 'paid',
      payment_amount: 449.99,
    },
  ];

  for (const m of members) {
    await query(
      `INSERT INTO members (
        member_id,
        name,
        email,
        phone,
        membership_type,
        join_date,
        expiry_date,
        status,
        payment_status,
        payment_amount,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        m.member_id,
        m.name,
        m.email,
        m.phone,
        m.membership_type,
        m.join_date,
        m.expiry_date,
        m.status,
        m.payment_status,
        m.payment_amount,
      ]
    );
  }
}

async function seedPayments() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM payments'
  );
  if (existing && existing.count !== '0') {
    return;
  }

  const payments = [
    // 2025 payments
    {
      member_code: '5JA01',
      amount: 299.99,
      payment_date: '2025-04-05',
      method: 'UPI',
      status: 'completed',
    },
    {
      member_code: '5DE01',
      amount: 299.99,
      payment_date: '2025-05-10',
      method: 'Card',
      status: 'completed',
    },
    {
      member_code: '3DE01',
      amount: 199.99,
      payment_date: '2025-06-15',
      method: 'Cash',
      status: 'pending',
    },
    {
      member_code: '5OC01',
      amount: 299.99,
      payment_date: '2025-07-01',
      method: 'UPI',
      status: 'completed',
    },
    {
      member_code: '4JA01',
      amount: 199.99,
      payment_date: '2025-08-12',
      method: 'Card',
      status: 'completed',
    },
    {
      member_code: '5JA02',
      amount: 299.99,
      payment_date: '2025-09-03',
      method: 'UPI',
      status: 'completed',
    },
    {
      member_code: '3NO01',
      amount: 199.99,
      payment_date: '2025-10-20',
      method: 'Cash',
      status: 'completed',
    },
    {
      member_code: '5DE02',
      amount: 299.99,
      payment_date: '2025-11-08',
      method: 'Card',
      status: 'completed',
    },
    {
      member_code: '4JA02',
      amount: 199.99,
      payment_date: '2025-12-18',
      method: 'UPI',
      status: 'pending',
    },
    // 2026 payments – around current dashboard period
    {
      member_code: '4FE01',
      amount: 199.99,
      payment_date: '2026-01-05',
      method: 'UPI',
      status: 'completed',
    },
    {
      member_code: '3OC01',
      amount: 199.99,
      payment_date: '2026-02-10',
      method: 'Card',
      status: 'completed',
    },
    {
      member_code: '5OC02',
      amount: 299.99,
      payment_date: '2026-03-02',
      method: 'UPI',
      status: 'completed',
    },
  ];

  for (const p of payments) {
    await query(
      `INSERT INTO payments (
        member_id,
        amount,
        payment_date,
        payment_method,
        status,
        created_at
      ) VALUES (
        (SELECT id FROM members WHERE member_id = $1),
        $2,
        $3,
        $4,
        $5,
        NOW()
      )`,
      [p.member_code, p.amount, p.payment_date, p.method, p.status]
    );
  }
}

async function seedNotifications() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM notifications'
  );
  if (existing && existing.count !== '0') {
    // Already seeded; skip to avoid duplicates.
    return;
  }

  const rows = [
    {
      title: 'New Member Registration',
      message: 'John Doe has registered for a Premium membership plan.',
      type: 'success',
      read: false,
      created_at: '2026-01-15T10:30:00',
    },
    {
      title: 'Payment Received',
      message: 'Payment of Rs.299.99 received from Jane Smith.',
      type: 'success',
      read: false,
      created_at: '2026-01-14T14:20:00',
    },
    {
      title: 'Membership Expiring Soon',
      message: '3 memberships are expiring within the next 7 days.',
      type: 'warning',
      read: false,
      created_at: '2026-01-13T09:15:00',
    },
    {
      title: 'Equipment Maintenance Due',
      message: 'Treadmill #5 requires scheduled maintenance.',
      type: 'info',
      read: true,
      created_at: '2026-01-12T16:45:00',
    },
    {
      title: 'Payment Overdue',
      message: 'Payment from Bob Johnson is overdue by 5 days.',
      type: 'error',
      read: false,
      created_at: '2026-01-11T11:00:00',
    },
    {
      title: 'New Trainer Added',
      message: 'Sarah Williams has been added as a new trainer.',
      type: 'info',
      read: true,
      created_at: '2026-01-10T08:30:00',
    },
    {
      title: 'Monthly Report Ready',
      message: 'January 2026 monthly financial report is now available.',
      type: 'info',
      read: true,
      created_at: '2026-01-09T12:00:00',
    },
    {
      title: 'Low Stock Alert',
      message: 'Cleaning supplies are running low. Please reorder soon.',
      type: 'warning',
      read: true,
      created_at: '2026-01-08T10:15:00',
    },
  ];

  for (const n of rows) {
    await query(
      `INSERT INTO notifications (title, message, type, read, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [n.title, n.message, n.type, n.read, n.created_at]
    );
  }
}

async function seedMembershipPlans() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM membership_plans'
  );
  if (existing && existing.count !== '0') {
    return;
  }

  const plans = [
    {
      name: 'Standard Monthly',
      price: 199.99,
      duration_days: '30',
      features: 'Gym access, locker room, basic support',
      status: 'active',
    },
    {
      name: 'Premium Monthly',
      price: 299.99,
      duration_days: '30',
      features: 'All Standard features + group classes + sauna access',
      status: 'active',
    },
    {
      name: 'Quarterly',
      price: 549.99,
      duration_days: '90',
      features: 'Discounted 3‑month plan, full gym access',
      status: 'active',
    },
    {
      name: 'Annual',
      price: 1999.99,
      duration_days: '365',
      features: 'Best value yearly plan with all facilities',
      status: 'active',
    },
  ];

  for (const p of plans) {
    await query(
      `INSERT INTO membership_plans (
        name,
        price,
        duration_days,
        features,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [p.name, p.price, p.duration_days, p.features, p.status]
    );
  }
}

async function seedTrainers() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM trainers'
  );
  if (existing && existing.count !== '0') {
    return;
  }

  const trainers = [
    {
      name: 'Sarah Williams',
      email: 'sarah.trainer@example.com',
      phone: '8880000001',
      role: 'Trainer',
      hire_date: '2024-11-01',
      status: 'active',
    },
    {
      name: 'Michael Adams',
      email: 'michael.adams@example.com',
      phone: '8880000002',
      role: 'Trainer',
      hire_date: '2024-10-15',
      status: 'active',
    },
    {
      name: 'Rachel Green',
      email: 'rachel.green@example.com',
      phone: '8880000003',
      role: 'Staff',
      hire_date: '2024-09-10',
      status: 'active',
    },
    {
      name: 'David Johnson',
      email: 'david.johnson@example.com',
      phone: '8880000004',
      role: 'Trainer',
      hire_date: '2024-08-05',
      status: 'active',
    },
    {
      name: 'Emily Clark',
      email: 'emily.clark@example.com',
      phone: '8880000005',
      role: 'Trainer',
      hire_date: '2024-07-20',
      status: 'active',
    },
    {
      name: 'Peter Parker',
      email: 'peter.parker@example.com',
      phone: '8880000006',
      role: 'Staff',
      hire_date: '2024-07-01',
      status: 'inactive',
    },
    {
      name: 'Olivia Brown',
      email: 'olivia.brown@example.com',
      phone: '8880000007',
      role: 'Trainer',
      hire_date: '2024-06-10',
      status: 'active',
    },
    {
      name: 'Liam Wilson',
      email: 'liam.wilson@example.com',
      phone: '8880000008',
      role: 'Trainer',
      hire_date: '2024-05-18',
      status: 'active',
    },
    {
      name: 'Sophia Martinez',
      email: 'sophia.martinez@example.com',
      phone: '8880000009',
      role: 'Staff',
      hire_date: '2024-05-02',
      status: 'active',
    },
    {
      name: 'James Anderson',
      email: 'james.anderson@example.com',
      phone: '8880000010',
      role: 'Trainer',
      hire_date: '2024-04-12',
      status: 'active',
    },
    {
      name: 'Isabella Lee',
      email: 'isabella.lee@example.com',
      phone: '8880000011',
      role: 'Trainer',
      hire_date: '2024-03-25',
      status: 'inactive',
    },
    {
      name: 'Noah Patel',
      email: 'noah.patel@example.com',
      phone: '8880000012',
      role: 'Trainer',
      hire_date: '2024-03-05',
      status: 'active',
    },
    {
      name: 'Ava Chen',
      email: 'ava.chen@example.com',
      phone: '8880000013',
      role: 'Staff',
      hire_date: '2024-02-17',
      status: 'active',
    },
    {
      name: 'William Scott',
      email: 'william.scott@example.com',
      phone: '8880000014',
      role: 'Trainer',
      hire_date: '2024-01-30',
      status: 'active',
    },
    {
      name: 'Mia Rodriguez',
      email: 'mia.rodriguez@example.com',
      phone: '8880000015',
      role: 'Trainer',
      hire_date: '2024-01-10',
      status: 'active',
    },
  ];

  for (const t of trainers) {
    await query(
      `INSERT INTO trainers (
        name,
        email,
        phone,
        role,
        hire_date,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [t.name, t.email, t.phone, t.role, t.hire_date, t.status]
    );
  }
}

async function seedAttendance() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM attendance'
  );
  if (existing && existing.count !== '0') {
    return;
  }

  const rows = [
    {
      member_id: '5JA01',
      member_name: 'John Doe',
      check_in_date: '2025-01-28',
      check_in_time: '08:30',
      check_out_date: '2025-01-28',
      check_out_time: '10:15',
      status: 'checked-out',
      duration: '1h 45m',
    },
    {
      member_id: '5DE01',
      member_name: 'Jane Smith',
      check_in_date: '2025-01-28',
      check_in_time: '09:00',
      check_out_date: null,
      check_out_time: null,
      status: 'present',
      duration: null,
    },
    {
      member_id: '3DE01',
      member_name: 'Bob Johnson',
      check_in_date: '2025-01-28',
      check_in_time: '10:00',
      check_out_date: '2025-01-28',
      check_out_time: '11:30',
      status: 'checked-out',
      duration: '1h 30m',
    },
    {
      member_id: '5OC01',
      member_name: 'Alice Williams',
      check_in_date: '2025-01-28',
      check_in_time: '07:45',
      check_out_date: '2025-01-28',
      check_out_time: '09:20',
      status: 'checked-out',
      duration: '1h 35m',
    },
    {
      member_id: '4JA01',
      member_name: 'Charlie Brown',
      check_in_date: '2025-01-28',
      check_in_time: '12:00',
      check_out_date: null,
      check_out_time: null,
      status: 'present',
      duration: null,
    },
  ];

  for (const a of rows) {
    await query(
      `INSERT INTO attendance (
        member_id,
        member_name,
        check_in_date,
        check_in_time,
        check_out_date,
        check_out_time,
        status,
        duration,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        a.member_id,
        a.member_name,
        a.check_in_date,
        a.check_in_time,
        a.check_out_date,
        a.check_out_time,
        a.status,
        a.duration,
      ]
    );
  }
}

async function seedExpenses() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM expenses'
  );
  if (existing && existing.count !== '0') {
    return;
  }

  const expenses = [
    {
      category: 'rent',
      description: 'Monthly gym rent',
      amount: 1200.0,
      date: '2025-01-01',
      status: 'paid',
      vendor: 'ABC Properties',
    },
    {
      category: 'utilities',
      description: 'Electricity and water bill',
      amount: 350.5,
      date: '2025-01-05',
      status: 'paid',
      vendor: 'City Utilities',
    },
    {
      category: 'maintenance',
      description: 'Treadmill and elliptical servicing',
      amount: 420.0,
      date: '2025-01-10',
      status: 'pending',
      vendor: 'FitFix Services',
    },
    {
      category: 'supplies',
      description: 'Monthly cleaning stock',
      amount: 180.75,
      date: '2025-01-12',
      status: 'paid',
      vendor: 'CleanCo',
    },
    {
      category: 'marketing',
      description: 'Social media ads',
      amount: 250.0,
      date: '2025-01-15',
      status: 'pending',
      vendor: 'AdBoost',
    },
    {
      category: 'rent',
      description: 'Monthly gym rent - March 2026',
      amount: 1300.0,
      date: '2026-03-01',
      status: 'paid',
      vendor: 'ABC Properties',
    },
    {
      category: 'utilities',
      description: 'Electricity and water bill - March 2026',
      amount: 375.25,
      date: '2026-03-05',
      status: 'paid',
      vendor: 'City Utilities',
    },
    {
      category: 'staff',
      description: 'Trainer salaries - March 2026',
      amount: 8200.0,
      date: '2026-03-10',
      status: 'paid',
      vendor: 'Payroll Services',
    },
    {
      category: 'maintenance',
      description: 'Equipment maintenance - March 2026',
      amount: 950.0,
      date: '2026-03-18',
      status: 'pending',
      vendor: 'FitFix Services',
    },
    {
      category: 'marketing',
      description: 'Holi festival promotion campaign',
      amount: 3100.0,
      date: '2026-03-22',
      status: 'pending',
      vendor: 'AdBoost',
    },
  ];

  for (const e of expenses) {
    await query(
      `INSERT INTO expenses (
        category,
        description,
        amount,
        date,
        status,
        vendor,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [e.category, e.description, e.amount, e.date, e.status, e.vendor]
    );
  }
}
async function main() {
  await seedDefaultUser();
  await seedMembers();
  await seedPayments();
  await seedMembershipPlans();
  await seedTrainers();
  await seedExpenses();
  await seedAttendance();
  await seedNotifications();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});