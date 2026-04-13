# OmniStore Management System (Database Architecture)

## Description

OmniStore is a robust and scalable relational database system designed for multi-branch retail, point-of-sale (POS) operations, and supply chain management. Built on PostgreSQL and optimized specifically for the Supabase ecosystem, it seamlessly integrates inventory tracking, employee management, supplier relations, and advanced analytics.

This service processes complex transactions natively within the database using custom PL/pgSQL functions, ensuring fast data retrieval for paginated sales, precise stock transfers between stores, and secure access via Row Level Security (RLS).

## Features

- Multi-store inventory tracking with automated product transfers
- Point of Sale (POS) operations integrated with unique barcode scanning (`product_barcodes_store`)
- Comprehensive Procurement system (Suppliers, Purchase Orders, Payments, and Automated Reminders)
- Custom PL/pgSQL functions for optimized backend logic (e.g., `get_sales_paginated`, `ventas_por_mes`, `insert_transfer`)
- High-security architecture using PostgreSQL Row Level Security (RLS) and Supabase Role-Based Access Control (RBAC)
- Support for dynamic multi-currency transactions (`exchange_rates` tracking)

## Requirements

- PostgreSQL 15.0 or higher
- Supabase Project (Required for native Auth, Storage, and auto-generated REST/GraphQL APIs)
- SQL Client (Supabase SQL Editor, DBeaver, or pgAdmin)
- `uuid-ossp` and `pgcrypto` PostgreSQL extensions (Automatically enabled during setup)

## Quick Start and Installation

### Database Setup
#### Enable required extensions
Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` in your SQL environment.

#### Run Schema and Tables script
Execute the SQL script containing the `CREATE TABLE` and `CREATE FUNCTION` statements to build the core architecture in the `public` schema.

