/** Browser PDFs stay in IndexedDB, outside the published application bundle. */
export async function browserPdf(key: string, value?: Blob): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('norya-private-pdfs', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pdfs');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('pdfs', value ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('pdfs');
      const operation = value ? store.put(value, key) : store.get(key);
      transaction.oncomplete = () => { db.close(); resolve(value ?? operation.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('Stockage PDF interrompu.')); };
    };
  });
}
