import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Trip } from '../types';

interface TripPlannerDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
  };
}

const DB_NAME = 'trip-planner-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TripPlannerDB>>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TripPlannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const storage = {
  async getAllTrips(): Promise<Trip[]> {
    const db = await getDB();
    return db.getAll('trips');
  },

  async saveTrip(trip: Trip): Promise<string> {
    const db = await getDB();
    await db.put('trips', trip);
    return trip.id;
  },

  async deleteTrip(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('trips', id);
  },
  
  async getTrip(id: string): Promise<Trip | undefined> {
    const db = await getDB();
    return db.get('trips', id);
  }
};
