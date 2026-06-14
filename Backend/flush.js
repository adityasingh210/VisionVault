import { createClient } from  "redis";

const client = createClient({
    url: "redis://default:yMKeXeZQiCqU9AxAULDDDnDLhrkIghPJ@redis-10404.c98.us-east-1-4.ec2.cloud.redislabs.com:10404"
});

async function flush() {
    await client.connect();
    await client.flushAll();
    console.log("Database cleared successfully!");
    await client.disconnect();
}

flush().catch(console.error);