import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://skdharun_db_user:ReTXe5S6Bo3HaxNt@cluster0.py0rvei.mongodb.net/?appName=Cluster0';
const options = {};

let client: MongoClient;
declare const global: typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise: Promise<MongoClient> = (() => {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
})();

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db('shopping');
}
