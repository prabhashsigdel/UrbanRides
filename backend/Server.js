import 'dotenv/config';
import connectDB from './Models/db.js';
import { createAuth } from './lib/auth.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 8080;

try {
  const connection = await connectDB();
  const auth = createAuth({ db: connection.db, client: connection.getClient() });
  createApp(auth).listen(PORT, () => console.log(`Server running on port ${PORT}`));
} catch (error) {
  console.error(' Failed to start:', error.message);
  process.exit(1);
}
