import dns from 'dns';
import mongoose from 'mongoose';

// Optional: comma-separated DNS servers for resolving mongodb+srv:// records,
// for machines where Node's default resolver refuses SRV lookups.
if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

/** Connects Mongoose to MongoDB. Throws when the connection fails. */
const connectDB = async (uri = process.env.URI) => {
    if (!uri) throw new Error('URI is not set. Add your MongoDB connection string to backend/.env.');
    await mongoose.connect(uri);
    console.log(` MongoDB Connected to database: ${mongoose.connection.name}`);
    return mongoose.connection;
};

export default connectDB;
