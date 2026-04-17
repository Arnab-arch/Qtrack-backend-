import pg from "pg";
import "dotenv/config";

const {Pool} = pg ;
const pool = new Pool({
  host:process.env.DB_HOST,
  port:Number(process.env.DB_PORT),
  user:process.env.DB_USER ,
  password:process.env.DB_PASSWORD ,
  name:process.env.DB_NAME ,
})

export default pool ;