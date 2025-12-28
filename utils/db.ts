import Dexie, { type Table } from 'dexie';

export interface Todo {
    id?: number;
    title: string;
    done: boolean;
    type: 'do' | 'dont';
    duration?: number; // in minutes, for 'dont' tasks
    lastDone?: number; // timestamp, for 'dont' tasks
    order?: number; // for manual ordering
    dailyReset?: boolean; // for 'do' tasks
}

export interface SyncSettings {
    id: string; // 'config'
    syncEnabled: boolean;
    fileHandle?: FileSystemFileHandle;
}

export class MySubClassedDexie extends Dexie {
    todos!: Table<Todo>;
    settings!: Table<SyncSettings>;

    constructor() {
        super('myDatabase');
        this.version(1).stores({
            todos: '++id, title, done' // Primary key and indexed props
        });

        this.version(2).stores({
            todos: '++id, title, done, type'
        }).upgrade(tx => {
            return tx.table('todos').toCollection().modify(todo => {
                todo.type = 'do';
            });
        });

        this.version(3).stores({
            todos: '++id, title, done, type, order'
        }).upgrade(async tx => {
            // Initialize order for existing items
            await tx.table('todos').toCollection().modify((todo, ctx) => {
                // Use a large number or id to put them at the end or keeps existing order (by insertion time usually)
                // Since we want them ordered, let's just use the ID or a timestamp if available, 
                // but ID is easiest uniqueness. 
                // Better approach: modify returns a promise if we want specific logic, 
                // but here we can just set it to the primary key 'id' as a default sort 
                // or we can't easily access the index in modify.
                // Simple default: set same as ID.
                if (!todo.order) {
                    todo.order = todo.id; // Default order is the ID
                }
            });
        });

        this.version(4).stores({
            todos: '++id, title, done, type, order, dailyReset'
        });

        this.version(5).stores({
            settings: 'id'
        });
    }
}

export const db = new MySubClassedDexie();
