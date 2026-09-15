import { MongoClient, Db, ServerApiVersion } from 'mongodb';

// User's configured MongoDB Atlas URI
const DEFAULT_MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://gsjsnsnnsns387_db_user:jaNxbYOV6fQRTJW2@forward.v75z0uc.mongodb.net/?appName=Forward';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(DEFAULT_MONGODB_URI);
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = DEFAULT_MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not set'));
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: false,
          deprecationErrors: true,
        },
        connectTimeoutMS: 8000,
        socketTimeoutMS: 15000,
      });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: false,
          deprecationErrors: true,
        },
        connectTimeoutMS: 8000,
        socketTimeoutMS: 15000,
      });
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(dbName: string = 'api_shield_db'): Promise<Db | null> {
  try {
    const client = await getMongoClient();
    return client.db(dbName);
  } catch (err) {
    console.warn('[MongoDB] Database connection unavailable:', (err as Error).message);
    return null;
  }
}

export interface MongoHealthStatus {
  connected: boolean;
  database: string;
  uriRedacted: string;
  pingMs?: number;
  collections?: {
    domains: number;
    clients: number;
    logs: number;
    events: number;
    blockedIps: number;
  };
  error?: string;
}

export async function checkMongoHealth(): Promise<MongoHealthStatus> {
  const uri = DEFAULT_MONGODB_URI;
  const redactedUri = uri
    ? uri.replace(/:([^@]+)@/, ':****@')
    : 'Not Configured';

  try {
    const startTime = Date.now();
    const db = await getDatabase();
    if (!db) {
      return {
        connected: false,
        database: 'api_shield_db',
        uriRedacted: redactedUri,
        error: 'Failed to acquire database client instance',
      };
    }

    // Ping command
    await db.command({ ping: 1 });
    const pingMs = Date.now() - startTime;

    const [domains, clients, logs, events, blockedIps] = await Promise.all([
      db.collection('authorized_domains').countDocuments().catch(() => 0),
      db.collection('api_clients').countDocuments().catch(() => 0),
      db.collection('request_logs').countDocuments().catch(() => 0),
      db.collection('security_events').countDocuments().catch(() => 0),
      db.collection('blocked_ips').countDocuments().catch(() => 0),
    ]);

    return {
      connected: true,
      database: db.databaseName,
      uriRedacted: redactedUri,
      pingMs,
      collections: {
        domains,
        clients,
        logs,
        events,
        blockedIps,
      },
    };
  } catch (err) {
    return {
      connected: false,
      database: 'api_shield_db',
      uriRedacted: redactedUri,
      error: (err as Error).message,
    };
  }
}
