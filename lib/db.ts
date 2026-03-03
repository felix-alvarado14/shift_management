import mysql from "mysql2/promise";

const pool = mysql.createPool({

  host: "localhost",

  port: 3308, // IMPORTANTE: el puerto que pusiste en docker

  user: "root",

  password: "root",

  database: "shift_management",

  waitForConnections: true,

  connectionLimit: 10,

});

export default pool;