import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });
dotenv.config();

const { Pool } = pg;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  console.log('Connecting to database...');

  const ddl = `
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      contact_person VARCHAR(100),
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      gstin VARCHAR(50),
      address TEXT,
      city VARCHAR(100) DEFAULT 'Sangola',
      state VARCHAR(100) DEFAULT 'Maharashtra',
      payment_terms VARCHAR(50) DEFAULT 'NET_30',
      outstanding_balance NUMERIC DEFAULT 0.00,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id),
      status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
      destination VARCHAR(100) NOT NULL DEFAULT 'Retail Store',
      subtotal NUMERIC NOT NULL DEFAULT 0.00,
      tax_amount NUMERIC NOT NULL DEFAULT 0.00,
      total_amount NUMERIC NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
      paid_amount NUMERIC DEFAULT 0.00,
      expected_date TIMESTAMP,
      received_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id SERIAL PRIMARY KEY,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id),
      part_id INTEGER REFERENCES service_parts(id),
      part_name TEXT NOT NULL,
      sku VARCHAR(100),
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER NOT NULL DEFAULT 0,
      unit_cost NUMERIC NOT NULL,
      total_cost NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      part_id INTEGER REFERENCES service_parts(id),
      movement_type VARCHAR(30) NOT NULL,
      quantity INTEGER NOT NULL,
      previous_stock INTEGER,
      new_stock INTEGER,
      reference_type VARCHAR(50),
      reference_id VARCHAR(50),
      location VARCHAR(100) NOT NULL DEFAULT 'Retail Store',
      notes TEXT,
      performed_by_user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      invoice_type VARCHAR(30) NOT NULL DEFAULT 'SERVICE',
      booking_id INTEGER REFERENCES service_bookings(id),
      job_card_id INTEGER REFERENCES service_job_cards(id),
      order_id INTEGER REFERENCES orders(id),
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      gstin VARCHAR(50),
      subtotal NUMERIC NOT NULL DEFAULT 0.00,
      labour_total NUMERIC DEFAULT 0.00,
      parts_total NUMERIC DEFAULT 0.00,
      discount_amount NUMERIC DEFAULT 0.00,
      taxable_amount NUMERIC NOT NULL DEFAULT 0.00,
      cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
      sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
      igst_amount NUMERIC NOT NULL DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'PAID',
      payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
      payment_reference VARCHAR(100),
      paid_amount NUMERIC DEFAULT 0.00,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      item_type VARCHAR(30) NOT NULL DEFAULT 'PART',
      part_id INTEGER REFERENCES service_parts(id),
      description TEXT NOT NULL,
      hsn_sac_code VARCHAR(30) DEFAULT '8714',
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL,
      discount NUMERIC DEFAULT 0.00,
      tax_rate_percent NUMERIC DEFAULT 18.00,
      tax_amount NUMERIC DEFAULT 0.00,
      total_price NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Enable RLS on newly created tables for security compliance
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON suppliers FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON purchase_orders FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON purchase_order_items FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON inventory_movements FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON invoices FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_items' AND policyname = 'service_role_all') THEN
        CREATE POLICY service_role_all ON invoice_items FOR ALL USING (true);
      END IF;
    END $$;
  `;

  try {
    await pool.query(ddl);
    console.log('[SUCCESS] Phase 3 tables & RLS policies created successfully on PostgreSQL database!');
  } catch (err) {
    console.error('[ERROR] Failed executing Phase 3 migration:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
