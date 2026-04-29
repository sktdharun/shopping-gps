import { MongoClient } from 'mongodb';

const uri = 'mongodb://admin:Qwerty123@localhost:27017/admin';
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
