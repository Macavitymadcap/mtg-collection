import jwt from "jsonwebtoken";
import { config } from "../config.js";

// Local-only helper: prints a signed token for calling the API.
const scope = process.argv[2] ?? "cards:read cards:write data:admin";
console.log(jwt.sign({ scope }, config.JWT_SECRET, { subject: "dev-user", expiresIn: "1h" }));
