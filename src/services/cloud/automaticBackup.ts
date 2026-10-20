// Native platforms retain local storage; web implementation handles Supabase.
export async function saveAutomaticSnapshot():Promise<string>{throw new Error('Archives automatiques disponibles sur le site web Norya.');}
export async function lastAutomaticSnapshot():Promise<string|null>{return null;}
export async function listAllSnapshots():Promise<{path:string;date:string}[]>{return [];}
export async function restoreSnapshotMissingOnly(_path:string):Promise<{added:number;skipped:number}>{throw new Error('Récupération disponible sur le web.');}
