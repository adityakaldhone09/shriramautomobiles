import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { newDb } from 'pg-mem';
import { bootstrapDatabaseData } from './bootstrap-data';
import * as schema from './schema';

const possibleEnvPaths = [
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), 'backend', '.env.local'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore invalid or already-loaded env files.
    }
  }
}

const { Pool } = pg;

let poolInstance: any;
let isInMemory = false;

const rawUrl = process.env.DATABASE_URL || '';
const hasValidUrl =
  (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) &&
  !rawUrl.includes('[YOUR-PASSWORD]') &&
  !rawUrl.includes('dummy');

if (hasValidUrl) {
  try {
    const isSupabaseUrl = /supabase|pooler/i.test(rawUrl);
    poolInstance = new Pool({
      connectionString: rawUrl,
      connectionTimeoutMillis: 3000,
      ...(isSupabaseUrl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  } catch {
    poolInstance = null;
  }
}

let initDbPromise: Promise<void> | null = null;

async function initializeDatabase(pool: any) {
  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      logo_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vehicle_models (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL REFERENCES brands(id),
      name TEXT NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      vehicle_type VARCHAR(50) NOT NULL,
      engine_class VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customer_vehicles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      customer_id INTEGER REFERENCES customers(id),
      brand_id INTEGER REFERENCES brands(id),
      vehicle_model_id INTEGER REFERENCES vehicle_models(id),
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      vehicle_type VARCHAR(50) NOT NULL,
      registration_number VARCHAR(50) NOT NULL,
      nickname VARCHAR(100),
      manufacture_year INTEGER,
      variant VARCHAR(100),
      color VARCHAR(50),
      notes TEXT,
      vehicle_age INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS part_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS service_parts (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug VARCHAR(255),
      category_id INTEGER REFERENCES part_categories(id),
      category VARCHAR(100) NOT NULL,
      sub_category VARCHAR(100),
      description TEXT,
      brand TEXT NOT NULL DEFAULT 'Genuine / OEM',
      part_type VARCHAR(50) NOT NULL DEFAULT 'Replacement',
      vehicle_types TEXT NOT NULL DEFAULT '["Motorcycle", "Scooter"]',
      availability VARCHAR(20) NOT NULL DEFAULT 'In Stock',
      price NUMERIC NOT NULL DEFAULT 0.00,
      purchase_price NUMERIC DEFAULT 0.00,
      stock_quantity INTEGER NOT NULL DEFAULT 10,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      supplier TEXT,
      image TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vehicle_part_compatibility (
      id SERIAL PRIMARY KEY,
      vehicle_model_id INTEGER NOT NULL REFERENCES vehicle_models(id),
      part_id INTEGER NOT NULL REFERENCES service_parts(id),
      fitment_confidence VARCHAR(40) NOT NULL DEFAULT 'MODEL_SPECIFIC',
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name JSONB NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description JSONB,
      vehicle_type VARCHAR(50) NOT NULL DEFAULT 'All',
      typical_duration_minutes INTEGER NOT NULL DEFAULT 60,
      estimated_duration TEXT NOT NULL DEFAULT '60 mins',
      starting_price NUMERIC NOT NULL DEFAULT 299.00,
      icon VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS service_symptoms (
      id SERIAL PRIMARY KEY,
      symptom_id VARCHAR(100) NOT NULL UNIQUE,
      symptom TEXT NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS symptom_service_mapping (
      id SERIAL PRIMARY KEY,
      symptom_id INTEGER NOT NULL REFERENCES service_symptoms(id),
      service_id INTEGER NOT NULL REFERENCES services(id),
      priority INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS symptom_part_mapping (
      id SERIAL PRIMARY KEY,
      symptom_id INTEGER NOT NULL REFERENCES service_symptoms(id),
      part_id INTEGER NOT NULL REFERENCES service_parts(id),
      priority INTEGER NOT NULL DEFAULT 1,
      reasoning TEXT
    );
    CREATE TABLE IF NOT EXISTS mechanics (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone VARCHAR(20),
      experience INTEGER NOT NULL DEFAULT 5,
      specialization TEXT NOT NULL,
      languages TEXT NOT NULL DEFAULT 'Marathi, Hindi, English',
      is_available BOOLEAN DEFAULT TRUE,
      profile_image TEXT
    );
    CREATE TABLE IF NOT EXISTS available_slots (
      id SERIAL PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      time_slot VARCHAR(50) NOT NULL,
      max_bookings INTEGER NOT NULL DEFAULT 3,
      current_bookings INTEGER NOT NULL DEFAULT 0,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS service_bookings (
      id SERIAL PRIMARY KEY,
      booking_number VARCHAR(50) NOT NULL UNIQUE,
      booking_id VARCHAR(50),
      user_id INTEGER,
      customer_id INTEGER REFERENCES customers(id),
      customer_vehicle_id INTEGER REFERENCES customer_vehicles(id),
      vehicle_id INTEGER REFERENCES customer_vehicles(id),
      service_id INTEGER REFERENCES services(id),
      symptom_id INTEGER REFERENCES service_symptoms(id),
      preferred_mechanic_id INTEGER REFERENCES mechanics(id),
      assigned_mechanic_id INTEGER REFERENCES mechanics(id),
      booking_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      appointment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      time_slot VARCHAR(50) NOT NULL,
      problem_description TEXT,
      image_url TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
      total_price NUMERIC,
      customer_notes TEXT,
      mechanic_notes TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS booking_services (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
      service_id INTEGER NOT NULL REFERENCES services(id),
      price NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS booking_inspections (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
      part_id INTEGER REFERENCES service_parts(id),
      part_name TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'CHECKED',
      notes TEXT,
      inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS service_estimates (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
      labour_amount NUMERIC NOT NULL DEFAULT 0.00,
      parts_amount NUMERIC NOT NULL DEFAULT 0.00,
      discount_amount NUMERIC NOT NULL DEFAULT 0.00,
      tax_amount NUMERIC NOT NULL DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      estimated_amount NUMERIC,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS service_estimate_items (
      id SERIAL PRIMARY KEY,
      estimate_id INTEGER NOT NULL REFERENCES service_estimates(id),
      part_id INTEGER REFERENCES service_parts(id),
      item_type VARCHAR(20) NOT NULL DEFAULT 'PART',
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL,
      total_price NUMERIC NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      address_line TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Maharashtra',
      pin_code VARCHAR(10) NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INTEGER NOT NULL REFERENCES carts(id),
      product_id INTEGER NOT NULL REFERENCES service_parts(id),
      quantity INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(40) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
      subtotal NUMERIC NOT NULL,
      delivery_charge NUMERIC NOT NULL DEFAULT 0,
      total_amount NUMERIC NOT NULL,
      delivery_method VARCHAR(20) NOT NULL DEFAULT 'PICKUP',
      address_id INTEGER REFERENCES addresses(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES service_parts(id),
      quantity INTEGER NOT NULL,
      price NUMERIC NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wholesale_quotes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      business_name TEXT,
      required_products JSONB NOT NULL,
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS helmet_brands (
      id SERIAL PRIMARY KEY,
      brand_id VARCHAR(50) UNIQUE,
      name TEXT NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      country TEXT,
      origin_year INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS helmet_types (
      id SERIAL PRIMARY KEY,
      type_id VARCHAR(50) UNIQUE,
      name TEXT NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS helmet_products (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) UNIQUE,
      brand_id INTEGER REFERENCES helmet_brands(id),
      type_id INTEGER REFERENCES helmet_types(id),
      name TEXT NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      base_price NUMERIC NOT NULL DEFAULT 0.00,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS helmet_variants (
      id SERIAL PRIMARY KEY,
      variant_id VARCHAR(50) UNIQUE,
      product_id INTEGER NOT NULL REFERENCES helmet_products(id),
      color VARCHAR(100) NOT NULL,
      finish VARCHAR(50) NOT NULL DEFAULT 'Gloss',
      visor_type VARCHAR(50) NOT NULL DEFAULT 'Clear',
      mrp NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS helmet_sizes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) NOT NULL,
      label VARCHAR(50) NOT NULL,
      head_circumference_cm VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS helmet_inventory (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL UNIQUE,
      variant_id INTEGER REFERENCES helmet_variants(id),
      size_id INTEGER REFERENCES helmet_sizes(id),
      location VARCHAR(100) NOT NULL DEFAULT 'Retail Store',
      quantity INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 2,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const statements = createTablesSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

if (poolInstance) {
  initDbPromise = (async () => {
    try {
      await initializeDatabase(poolInstance);
      await bootstrapDatabaseData(poolInstance);
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  })();
}

if (!poolInstance) {
  isInMemory = true;
  const mem = newDb();
  const { Pool: MemPool } = mem.adapters.createPg();
  const rawMemPool = new MemPool();

  function wrapQuery(origQuery: any) {
    return function (this: any, config: any, ...qargs: any[]) {
      if (typeof config === 'object' && config) {
        delete config.types;
        if (config.rowMode === 'array') {
          delete config.rowMode;
          const p = origQuery.call(this, config, ...qargs);
          if (p && typeof p.then === 'function') {
            return p.then((res: any) => {
              if (res && Array.isArray(res.rows) && res.rows.length > 0) {
                const fieldNames = Object.keys(res.rows[0]);
                return {
                  ...res,
                  fields: fieldNames.map((name) => ({ name })),
                  rows: res.rows.map((row: any) => fieldNames.map((n: string) => row[n])),
                };
              }
              return res;
            });
          }
          return p;
        }
      }
      return origQuery.call(this, config, ...qargs);
    };
  }

  rawMemPool.query = wrapQuery(rawMemPool.query);
  const origConnect = rawMemPool.connect.bind(rawMemPool);
  rawMemPool.connect = async function (...cargs: any[]) {
    const client = await (origConnect as any)(...cargs);
    if (client && client.query) {
      client.query = wrapQuery(client.query);
    }
    return client;
  };

  poolInstance = rawMemPool;

  initDbPromise = (async () => {
    try {
      mem.public.none(`
        CREATE TABLE IF NOT EXISTS brands (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          slug VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          logo_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS vehicle_models (
          id SERIAL PRIMARY KEY,
          brand_id INTEGER NOT NULL REFERENCES brands(id),
          name TEXT NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          vehicle_type VARCHAR(50) NOT NULL,
          engine_class VARCHAR(50),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS customer_vehicles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          customer_id INTEGER REFERENCES customers(id),
          brand_id INTEGER REFERENCES brands(id),
          vehicle_model_id INTEGER REFERENCES vehicle_models(id),
          brand TEXT NOT NULL,
          model TEXT NOT NULL,
          vehicle_type VARCHAR(50) NOT NULL,
          registration_number VARCHAR(50) NOT NULL,
          nickname VARCHAR(100),
          manufacture_year INTEGER,
          variant VARCHAR(100),
          color VARCHAR(50),
          notes TEXT,
          vehicle_age INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS part_categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS service_parts (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(100) NOT NULL UNIQUE,
          name TEXT NOT NULL,
          slug VARCHAR(255),
          category_id INTEGER REFERENCES part_categories(id),
          category VARCHAR(100) NOT NULL,
          sub_category VARCHAR(100),
          description TEXT,
          brand TEXT NOT NULL DEFAULT 'Genuine / OEM',
          part_type VARCHAR(50) NOT NULL DEFAULT 'Replacement',
          vehicle_types TEXT NOT NULL DEFAULT '["Motorcycle", "Scooter"]',
          availability VARCHAR(20) NOT NULL DEFAULT 'In Stock',
          price NUMERIC NOT NULL DEFAULT 0.00,
          purchase_price NUMERIC DEFAULT 0.00,
          stock_quantity INTEGER NOT NULL DEFAULT 10,
          reserved_stock INTEGER NOT NULL DEFAULT 0,
          low_stock_threshold INTEGER NOT NULL DEFAULT 5,
          supplier TEXT,
          image TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS vehicle_part_compatibility (
          id SERIAL PRIMARY KEY,
          vehicle_model_id INTEGER NOT NULL REFERENCES vehicle_models(id),
          part_id INTEGER NOT NULL REFERENCES service_parts(id),
          fitment_confidence VARCHAR(40) NOT NULL DEFAULT 'MODEL_SPECIFIC',
          notes TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          name JSONB NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description JSONB,
          vehicle_type VARCHAR(50) NOT NULL DEFAULT 'All',
          typical_duration_minutes INTEGER NOT NULL DEFAULT 60,
          estimated_duration TEXT NOT NULL DEFAULT '60 mins',
          starting_price NUMERIC NOT NULL DEFAULT 299.00,
          icon VARCHAR(50),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS service_symptoms (
          id SERIAL PRIMARY KEY,
          symptom_id VARCHAR(100) NOT NULL UNIQUE,
          symptom TEXT NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS symptom_service_mapping (
          id SERIAL PRIMARY KEY,
          symptom_id INTEGER NOT NULL REFERENCES service_symptoms(id),
          service_id INTEGER NOT NULL REFERENCES services(id),
          priority INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS symptom_part_mapping (
          id SERIAL PRIMARY KEY,
          symptom_id INTEGER NOT NULL REFERENCES service_symptoms(id),
          part_id INTEGER NOT NULL REFERENCES service_parts(id),
          priority INTEGER NOT NULL DEFAULT 1,
          reasoning TEXT
        );
        CREATE TABLE IF NOT EXISTS mechanics (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone VARCHAR(20),
          experience INTEGER NOT NULL DEFAULT 5,
          specialization TEXT NOT NULL,
          languages TEXT NOT NULL DEFAULT 'Marathi, Hindi, English',
          is_available BOOLEAN DEFAULT TRUE,
          profile_image TEXT
        );
        CREATE TABLE IF NOT EXISTS available_slots (
          id SERIAL PRIMARY KEY,
          date TIMESTAMP NOT NULL,
          time_slot VARCHAR(50) NOT NULL,
          max_bookings INTEGER NOT NULL DEFAULT 3,
          current_bookings INTEGER NOT NULL DEFAULT 0,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS service_bookings (
          id SERIAL PRIMARY KEY,
          booking_number VARCHAR(50) NOT NULL UNIQUE,
          booking_id VARCHAR(50),
          user_id INTEGER,
          customer_id INTEGER REFERENCES customers(id),
          customer_vehicle_id INTEGER REFERENCES customer_vehicles(id),
          vehicle_id INTEGER REFERENCES customer_vehicles(id),
          service_id INTEGER REFERENCES services(id),
          symptom_id INTEGER REFERENCES service_symptoms(id),
          preferred_mechanic_id INTEGER REFERENCES mechanics(id),
          assigned_mechanic_id INTEGER REFERENCES mechanics(id),
          booking_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          appointment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          time_slot VARCHAR(50) NOT NULL,
          problem_description TEXT,
          image_url TEXT,
          status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
          total_price NUMERIC,
          customer_notes TEXT,
          mechanic_notes TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS booking_services (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
          service_id INTEGER NOT NULL REFERENCES services(id),
          price NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS booking_inspections (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
          part_id INTEGER REFERENCES service_parts(id),
          part_name TEXT NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'CHECKED',
          notes TEXT,
          inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS service_estimates (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES service_bookings(id),
          labour_amount NUMERIC NOT NULL DEFAULT 0.00,
          parts_amount NUMERIC NOT NULL DEFAULT 0.00,
          discount_amount NUMERIC NOT NULL DEFAULT 0.00,
          tax_amount NUMERIC NOT NULL DEFAULT 0.00,
          total_amount NUMERIC NOT NULL,
          estimated_amount NUMERIC,
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS service_estimate_items (
          id SERIAL PRIMARY KEY,
          estimate_id INTEGER NOT NULL REFERENCES service_estimates(id),
          part_id INTEGER REFERENCES service_parts(id),
          item_type VARCHAR(20) NOT NULL DEFAULT 'PART',
          description TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price NUMERIC NOT NULL,
          total_price NUMERIC NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          name TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS addresses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          address_line TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'Maharashtra',
          pin_code VARCHAR(10) NOT NULL,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS carts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          cart_id INTEGER NOT NULL REFERENCES carts(id),
          product_id INTEGER NOT NULL REFERENCES service_parts(id),
          quantity INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(40) NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
          subtotal NUMERIC NOT NULL,
          delivery_charge NUMERIC NOT NULL DEFAULT 0,
          total_amount NUMERIC NOT NULL,
          delivery_method VARCHAR(20) NOT NULL DEFAULT 'PICKUP',
          address_id INTEGER REFERENCES addresses(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          product_id INTEGER NOT NULL REFERENCES service_parts(id),
          quantity INTEGER NOT NULL,
          price NUMERIC NOT NULL
        );
        CREATE TABLE IF NOT EXISTS contact_inquiries (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'NEW',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          token_hash VARCHAR(128) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          revoked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          token_hash VARCHAR(128) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          type VARCHAR(50) NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS wholesale_quotes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL,
          business_name TEXT,
          required_products JSONB NOT NULL,
          message TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'NEW',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS helmet_brands (
          id SERIAL PRIMARY KEY,
          brand_id VARCHAR(50) UNIQUE,
          name TEXT NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          country TEXT,
          origin_year INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS helmet_types (
          id SERIAL PRIMARY KEY,
          type_id VARCHAR(50) UNIQUE,
          name TEXT NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS helmet_products (
          id SERIAL PRIMARY KEY,
          product_id VARCHAR(50) UNIQUE,
          brand_id INTEGER REFERENCES helmet_brands(id),
          type_id INTEGER REFERENCES helmet_types(id),
          name TEXT NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          base_price NUMERIC NOT NULL DEFAULT 0.00,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS helmet_variants (
          id SERIAL PRIMARY KEY,
          variant_id VARCHAR(50) UNIQUE,
          product_id INTEGER NOT NULL REFERENCES helmet_products(id),
          color VARCHAR(100) NOT NULL,
          finish VARCHAR(50) NOT NULL DEFAULT 'Gloss',
          visor_type VARCHAR(50) NOT NULL DEFAULT 'Clear',
          mrp NUMERIC NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS helmet_sizes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) NOT NULL,
          label VARCHAR(50) NOT NULL,
          head_circumference_cm VARCHAR(50)
        );
        CREATE TABLE IF NOT EXISTS helmet_inventory (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(100) NOT NULL UNIQUE,
          variant_id INTEGER REFERENCES helmet_variants(id),
          size_id INTEGER REFERENCES helmet_sizes(id),
          location VARCHAR(100) NOT NULL DEFAULT 'Retail Store',
          quantity INTEGER NOT NULL DEFAULT 0,
          reorder_level INTEGER NOT NULL DEFAULT 2,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await bootstrapDatabaseData(poolInstance);
    } catch (e) {
      console.error('Error initializing in-memory database:', e);
    }
  })();
}

export const db = drizzle(poolInstance, { schema });
export async function ensureDbInitialized() {
  if (initDbPromise) {
    await initDbPromise;
  }
}
export { isInMemory };
export * from './schema';
