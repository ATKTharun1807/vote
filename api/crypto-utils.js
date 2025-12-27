// --- CRYPTOGRAPHY UTILS ---
export class CryptoUtils {
    static simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const hex = Math.abs(hash).toString(16);
        return hex.repeat(16 / hex.length).substring(0, 64);
    }

    static generateBlock(index, previousHash, data) {
        const timestamp = new Date().toISOString();
        const rawString = index + previousHash + timestamp + JSON.stringify(data);
        const hash = this.simpleHash(rawString);
        return { index, timestamp, data, previousHash, hash };
    }
}