
CREATE DATABASE IF NOT EXISTS syete_dos_cafe_db;
USE syete_dos_cafe_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NULL,
    role VARCHAR(20) NOT NULL
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    contact_info VARCHAR(150)
);

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT,
    supplier_id INT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    sale_datetime DATETIME NOT NULL,
    payment_method VARCHAR(10) NOT NULL, -- 'Cash', 'GCash'
    total_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT,
    product_id INT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- If you imported an older version of this file, you can remove the unused tables with:
--   DROP TABLE IF EXISTS utang_transactions; ALTER TABLE sales DROP FOREIGN KEY sales_ibfk_2, DROP COLUMN customer_id; DROP TABLE IF EXISTS customers;

-- Insert default admin account.
INSERT INTO users (username, password_hash, full_name, email, role) 
VALUES ('lemsther', '$2y$10$pKLF3HrpVgXWbDTUGRJTAOu8fgwTcKV/5nh89JekKYv4pjGkNY/jS', 'Lemsther Rivera', 'admin@gmail.com', 'owner');