import Dexie, { type Table } from 'dexie';

export interface Todo {
    id?: number;
    title: string;
    done: boolean;
    type: 'do' | 'dont';
    duration?: number; // in minutes, for 'dont' tasks
    lastDone?: number; // timestamp, for 'dont' tasks
}

export class MySubClassedDexie extends Dexie {
    todos!: Table<Todo>;

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
    }
}

export const db = new MySubClassedDexie();
