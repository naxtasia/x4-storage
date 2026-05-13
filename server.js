import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import WebSocket from 'ws';
import crypto from 'crypto';

const fastify = Fastify({ bodyLimit: 52428800 }); // 50MB
fastify.register(multipart);

const CONFIG = {
    NODE_URL: "wss://xanaxwaycloud-xanaxway-storage-cluster.hf.space", // Storage node adresi
    NODE_SECRET: process.env.XANAXWAY_NODE_SECRET,
    HF_TOKEN: process.env.HF_TOKEN
};

fastify.post('/v1/x4/ssd-upload', async (req, reply) => {
    const start = Date.now();
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Void stream" });

    // 1. Veriyi RAM'de Base64'e dönüştür (Injection için hazırlık)
    const fileBuffer = await data.toBuffer();
    const b64 = fileBuffer.toString('base64');
    const filename = `${crypto.randomBytes(4).toString('hex')}_${data.filename}`;

    return new Promise((resolve, reject) => {
        // 2. TÜNELİ ATEŞLE (API'siz doğrudan makineye)
        const ws = new WebSocket(CONFIG.NODE_URL, CONFIG.NODE_SECRET, {
            headers: { 'Authorization': `Bearer ${CONFIG.HF_TOKEN}` }
        });

        ws.on('open', () => {
            // 🚀 DATA INJECTION (Git commit falan yok, ham SSD fırlatması!)
            ws.send(JSON.stringify({
                action: "upload",
                filename: filename,
                data: b64
            }));
        });

        ws.on('message', (msg) => {
            const resp = JSON.parse(msg.toString());
            if (resp.status === "mummified") {
                const latency = Date.now() - start;
                ws.close();
                
                // Müşteriye giden tertemiz link
                resolve({
                    status: "sealed_on_ssd",
                    latency_ms: latency,
                    url: resp.url
                });
            }
        });

        ws.on('error', (e) => reject({ error: "Tunnel Leak", trace: e.message }));
    });
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
