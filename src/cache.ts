export type CacheFunc<K,V> = (k: K) => Promise<V>;

export type KeyMaker<K> = (k: K) => string;

const default_key_maker:KeyMaker<any> = (k) => {
    return JSON.stringify(k);
}

export function make<K,V>(func: CacheFunc<K,V>, key_maker: KeyMaker<K>=default_key_maker): CacheFunc<K,V> {
    const storage: Map<string, V> = new Map();
    return async (key: K):Promise<V> => {
        const hash = key_maker(key)
        if(!storage.has(hash)){
            storage.set(hash, await func(key))
        }
        return storage.get(hash)!;
    }
}

export default {make}