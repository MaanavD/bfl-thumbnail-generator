import dotenv from "dotenv";
dotenv.config();

const { BFL_API_KEY } = process.env;

if (!BFL_API_KEY || BFL_API_KEY === "your_bfl_api_key_here") {
  console.error(
    "❌ Missing BFL_API_KEY. Create a .env file with your key from https://dashboard.bfl.ai/"
  );
  process.exit(1);
}

export { BFL_API_KEY };
