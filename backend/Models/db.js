const dns = require('dns');
const mongoose = require('mongoose');
require("dotenv").config();

const mongo_url = process.env.URI;

// Optional: comma-separated DNS servers for resolving mongodb+srv:// records,
// for machines where Node's default resolver refuses SRV lookups.
if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const connectDB = async () => {
    try {
        await mongoose.connect(mongo_url, );
        console.log(` MongoDB Connected to database: ${mongoose.connection.name}`);
    } catch (err) {
        console.error(" MongoDB Connection Error:", err);
    }
};

module.exports = connectDB;
