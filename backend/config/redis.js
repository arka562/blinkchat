import { createClient } from "redis";

const redisClient = createClient({
  url: "redis-cli --tls -u redis://default:gQAAAAAAAb1FAAIgcDE3YThjYjljMWYwMmU0NzBjOThiMTk2MWJkMDVmMTRjYg@tidy-lioness-113989.upstash.io:6379",
});

redisClient.on("error", (err) =>
  console.error("❌ Redis Error:", err)
);

await redisClient.connect();

console.log("✅ Redis Connected");


export default redisClient;