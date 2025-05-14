"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
// db.ts
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '91.239.235.132',
    database: process.env.DB_NAME || 'skull_bot',
    password: process.env.DB_PASSWORD || 'Aa527465182',
    port: Number(process.env.DB_PORT) || 5432,
});
