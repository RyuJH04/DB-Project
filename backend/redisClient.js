// backend/redisClient.js
const redis = require('redis');

// 로컬 Redis에 연결 (기본 포트 6379)
const client = redis.createClient({
    url: 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));
client.on('connect', () => console.log('✅ Connected to Local Redis'));

// 연결 실행
(async () => {
    await client.connect();
})();

module.exports = client;