import { db, type Todo } from './db';

const SETTINGS_ID = 'config';

export async function getSyncSettings() {
    return db.settings.get(SETTINGS_ID);
}

export async function setSyncSettings(enabled: boolean, handle?: FileSystemFileHandle) {
    await db.settings.put({
        id: SETTINGS_ID,
        syncEnabled: enabled,
        fileHandle: handle
    });
}

export async function verifyPermission(handle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> {
    const options = {
        mode: readWrite ? 'readwrite' : 'read'
    };

    // Cast to any because standard types might miss queryPermission
    const h = handle as any;

    if (h.queryPermission && (await h.queryPermission(options)) === 'granted') {
        return true;
    }

    if (h.requestPermission && (await h.requestPermission(options)) === 'granted') {
        return true;
    }

    return false;
}

export async function saveToFile(todos: Todo[]) {
    const settings = await getSyncSettings();
    if (!settings?.syncEnabled || !settings.fileHandle) return;

    try {
        // Note: This might throw if permission is lost. 
        // The calling code should handle errors or we rely on explicit permission grant flow.
        const writable = await settings.fileHandle.createWritable();
        await writable.write(JSON.stringify(todos, null, 2));
        await writable.close();
    } catch (error) {
        console.error('Error saving to file:', error);
        throw error;
    }
}

export async function loadFromFile(): Promise<Todo[] | null> {
    const settings = await getSyncSettings();
    if (!settings?.syncEnabled || !settings.fileHandle) return null;

    try {
        const file = await settings.fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text) as Todo[];
    } catch (error) {
        console.error('Error reading from file:', error);
        throw error;
    }
}

// Check if file has changed since last read
export async function getFileLastModified(): Promise<number | null> {
    const settings = await getSyncSettings();
    if (!settings?.syncEnabled || !settings.fileHandle) return null;

    try {
        const file = await settings.fileHandle.getFile();
        return file.lastModified;
    } catch {
        return null;
    }
}
