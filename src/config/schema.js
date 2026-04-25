export const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone VARCHAR(15),
        role VARCHAR(20) DEFAULT 'visitor',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        location_id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        email VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        service_id SERIAL PRIMARY KEY,
        location_id INT REFERENCES locations(location_id),
        service_name VARCHAR(150) NOT NULL,
        description TEXT,
        avg_service_time INT,
        created_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS queues (
        queue_id SERIAL PRIMARY KEY,
        service_id INT REFERENCES services(service_id),
        queue_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(service_id, queue_date)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        token_id SERIAL PRIMARY KEY,
        queue_id INT REFERENCES queues(queue_id),
        user_id INT REFERENCES users(user_id),
        token_number INT NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(15),
        status VARCHAR(20) DEFAULT 'waiting',
        called_at TIMESTAMP,
        served_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Database initialized");
  } catch (err) {
    console.error(err.message);
  }
};